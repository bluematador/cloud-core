import AWS from 'aws-sdk';
import PriorityQueue from '../datastructures/priority-queue';
import { Maybe } from 'purify-ts/Maybe';
import { PromiseResult } from 'aws-sdk/lib/request';

const WorkDelay = 1000;

export abstract class RegionWorker {
	private queue = new PriorityQueue<QueueItem>();
	private queueFilled: boolean = false;

	private _started: boolean = false;
	private processing: boolean = false;
	private timeout: Maybe<number> = Maybe.empty();
	private cancel: CancelToken = 0;

	abstract get region(): string;
	abstract updatedCredentials(credentials: AWS.Credentials): void;

	protected abstract fillQueue(): void;
	protected abstract reset(): void;

	protected enqueue(priority: number, fn: (cancel: CancelToken) => Promise<any>): void {
		this.queue.push({priority, fn});

		if (this._started) {
			this.ensureTimeout();
		}
	}

	protected enqueuePagedRequest<D, E>(priority: number, request: AWS.Request<D, E>, handler: (data: D) => any): void {
		this.enqueue(priority, (token) => {
			return request.promise().then(response => {
				this.handlePagedResponse(priority, response, token, handler);
			});
		});
	}

	protected handlePagedResponse<D, E>(priority: number, response: PromiseResult<D, E>, token: CancelToken, handler: (data: D) => any): void {
		if (this.cancelled(token)) {
			return;
		}

		handler(response);

		const nextPage = response.$response.nextPage();
		if (nextPage) {
			this.enqueue(priority, (newToken) => {
				return nextPage.promise().then(response => {
					this.handlePagedResponse(priority, response, newToken, handler);
				});
			});
		}
	}

	private processQueue(): void {
		this.queue.pop().ifJust(one => {
			this.processing = true;

			one.fn(this.cancel).finally(() => {
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
			}, WorkDelay);
			this.timeout = Maybe.of(interval);
		}
	}

	protected cancelled(token: CancelToken): boolean {
		return this.cancel !== token;
	}

	start(): void {
		if (this._started) {
			return;
		}

		this._started = true;
		this.ensureTimeout();

		if (!this.queueFilled) {
			this.fillQueue();
			this.queueFilled = true;
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
}

export default RegionWorker;

interface QueueItem {
	readonly priority: number
	fn: (cancel: CancelToken) => Promise<any>
}

export type CancelToken = number;
