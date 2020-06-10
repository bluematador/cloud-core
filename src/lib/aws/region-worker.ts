import Account from './account';
import AWS from 'aws-sdk';
import { Tier, Levels } from './pricing';
import PriorityQueue from '../datastructures/priority-queue';
import { AggregationTimeframe, Calculation, Calculations, CalculationDetail } from '@/store/resources';
import { CloudWatchWorker } from './services/cloudwatch';
import { Maybe } from 'purify-ts/Maybe';
import { PromiseResult } from 'aws-sdk/lib/request';

export abstract class RegionWorker {
	private queue = new PriorityQueue<QueueItem>();
	private queueFilled: boolean = false;

	private _started: boolean = false;
	private processing: boolean = false;
	private timeout: Maybe<number> = Maybe.empty();
	private cancel: CancelToken = 0;

	private _progressDone = 0;
	private _progressTotal = 0;
	private _progressErrors = 0;

	abstract get account(): Account;
	abstract get region(): string;
	abstract get workDelay(): number;
	abstract updatedCredentials(credentials: AWS.Credentials): void;
	protected abstract fillQueue(): void;
	protected abstract reset(): void;

	get partition(): string {
		if (this.region.startsWith('us-gov-')) { return 'aws-us-gov'; }
		if (this.region.startsWith('cn-')) { return 'aws-cn'; }
		return 'aws';
	}

	protected get cloudwatch(): CloudWatchWorker {
		return this.account.cloudwatch.regions[this.region];
	}

	private enqueue(priority: number, fn: (cancel: CancelToken) => Promise<any>): void {
		this._progressTotal++;
		this.queue.push({priority, fn});

		if (this._started) {
			this.ensureTimeout();
		}
	}

	protected enqueueRequest<D, E, R>(priority: number, request: AWS.Request<D, E>, handler: (data: D) => R): Promise<R> {
		return new Promise((resolve, reject) => {
			this.enqueue(priority, (token) => {
				return request.promise().then(response => {
					if (this.cancelled(token)) {
						reject('cancelled');
						return;
					}

					resolve(handler(response));
				});
			})
		});
	}

	protected enqueuePagedRequest<D, E, R>(priority: number, request: AWS.Request<D, E>, handler: (data: D) => R): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.enqueue(priority, (token) => {
				return request.promise().then(response => {
					this.handlePagedResponse(priority, response, token, handler, resolve, reject);
				}).catch(e => {
					reject(e);
					throw e;
				});
			});
		});
	}

	private handlePagedResponse<D, E>(priority: number, response: PromiseResult<D, E>, token: CancelToken, handler: (data: D) => any, resolve: () => void, reject: (reason: any) => void): void {
		if (this.cancelled(token)) {
			reject('cancelled');
			return;
		}

		handler(response);

		if (response.$response.hasNextPage()) {
			const nextPage = response.$response.nextPage();
			if (!nextPage) { throw 'AWS is a liar'; }

			this.enqueue(priority, (newToken) => {
				return nextPage.promise().then(response => {
					this.handlePagedResponse(priority, response, newToken, handler, resolve, reject);
				}).catch(e => {
					reject(e);
					throw e;
				});
			});
		}
		else {
			resolve();
		}
	}

	protected enqueuePagedRequestFold<D, E, R>(priority: number, request: AWS.Request<D, E>, initial: R, handler: (data: D, value: R) => R): Promise<R> {
		return new Promise<R>((resolve, reject) => {
			let value: R = initial;
			this.enqueuePagedRequest(priority, request, (data) => {
				value = handler(data, value);
			}).then(() => {
				resolve(value);
			}).catch(e => {
				reject(e);
				throw e;
			});
		});
	}

	private processQueue(): void {
		this.queue.pop().ifJust(one => {
			this.processing = true;
			const cancel = this.cancel;

			one.fn(cancel).catch(e => {
				if (!this.cancelled(cancel)) {
					this._progressErrors++;
				}
			}).finally(() => {
				if (!this.cancelled(cancel)) {
					this._progressDone++;
				}

				this.processing = false;
				this.ensureTimeout();
			});
		});
	}

	private discardTimeout(): void {
		this.timeout.ifJust(interval => {
			clearInterval(interval);
			this.timeout = Maybe.empty();
		});
	}

	private ensureTimeout(): void {
		if (this.timeout.isNothing()) {
			const self = this;
			const interval = window.setTimeout(() => {
				self.timeout = Maybe.empty();
				self.processQueue();
			}, this.workDelay);
			this.timeout = Maybe.of(interval);
		}
	}

	protected cancelled(token: CancelToken): boolean {
		return this.cancel !== token;
	}

	protected calculationsForResource(fn: (timeframe: AggregationTimeframe, seconds: number) => Calculation): Calculations {
		return {
			last:  fn('last',     300),
			avg1h: fn('avg1h',   3600),
			avg1d: fn('avg1d',  86400),
			avg1w: fn('avg1w', 604800),
		};
	}

	protected simpleCalc(usage: number, rate: number, seconds: number, unit?: string): CalculationDetail {
		const subtotal = usage * rate;
		return {
			usage,
			unit,
			rate,
			subtotal,
			subtotal1h: subtotal * 3600 / seconds,
		};
	}

	protected tieredCalc(usage: number, tiers: Tier[], seconds: number, unit?: string): CalculationDetail {
		let subtotal: number = 0;
		let left: number = usage;

		tiers.forEach(tier => {
			if (left > 0) {
				const chunk = tier.count ? Math.min(left, tier.count) : left;
				left -= chunk;
				subtotal += chunk * tier.rate;
			}
		});

		return {
			usage,
			unit,
			rate: usage ? (subtotal / usage) : tiers[0].rate,
			subtotal,
			subtotal1h: subtotal * 3600 / seconds,
		};
	}

	protected levelsCalc(items: string[], levels: Levels, seconds: number, unit?: string): CalculationDetail {
		const usage = items.map(i => Number(i) * seconds / 3600).sum();
		const subtotal = items.map(i => levels[i] * seconds / 3600).sum();

		if (items.length > 0) {
			console.log(items, levels, seconds, unit, usage, subtotal, subtotal * 3600 / seconds);
		}

		return {
			usage,
			unit,
			rate: usage ? (subtotal / usage) : 0,
			subtotal,
			subtotal1h: subtotal * 3600 / seconds,
		};
	}

	start(): void {
		if (this._started) {
			return;
		}

		this._started = true;
		this.ensureTimeout();

		if (!this.queueFilled) {
			this.queueFilled = true;
			this.fillQueue();
		}
	}

	stop(): void {
		if (!this._started) {
			return;
		}

		this._started = false;
		this.discardTimeout();
	}

	resetProgress(): void {
		if (this.running) {
			throw 'cannot reset progress while running';
		}

		this._progressDone = 0;
		this._progressTotal = 0;
		this._progressErrors = 0;
		this.queueFilled = false;
		this.queue.clear();
		this.cancel++;
	}

	get started(): boolean {
		return this._started;
	}

	get finished(): boolean {
		return this.queue.empty && !this.processing;
	}

	get running(): boolean {
		return this.started && !this.finished;
	}

	get progressDone(): number {
		return this._progressDone;
	}

	get progressTotal(): number {
		return this._progressTotal;
	}

	get progressError(): number {
		return this._progressErrors;
	}
}

export default RegionWorker;

interface QueueItem {
	readonly priority: number
	fn: (cancel: CancelToken) => Promise<any>
}

export type CancelToken = number;
