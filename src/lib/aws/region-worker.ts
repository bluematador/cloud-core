import PriorityQueue from '../datastructures/priority-queue';
import { Maybe } from 'purify-ts/Maybe';

const WorkDelay = 500;

export abstract class RegionWorker {
	private queue = new PriorityQueue<QueueItem>();
	private queueFilled: boolean = false;

	private _started: boolean = false;
	private processing: boolean = false;
	private timeout: Maybe<number> = Maybe.empty();
	private cancelToken: CancelToken = { cancelled: false };

	abstract fillQueue(): void;
	abstract doPurge(): void;

	protected enqueue(priority: number, fn: () => Promise<any>): void {
		this.queue.push({priority, fn});

		if (this._started) {
			this.ensureTimeout();
		}
	}

	private processQueue(): void {
		this.queue.pop().ifJust(one => {
			this.processing = true;

			one.fn().finally(() => {
				this.processing = false;
				this.ensureTimeout();
			});
		});
	}

	protected watchForCancels<R>(fn: (token: CancelToken) => R): R {
		return fn(this.cancelToken);
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
		this.cancelToken.cancelled = true;
		this.cancelToken = { cancelled: false };
	}

	purge(): void {
		this.resetProgress();
		this.doPurge();
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
	fn: () => Promise<any>
}

interface CancelToken {
	cancelled: boolean
}
