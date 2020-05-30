import { Maybe } from 'purify-ts/Maybe';

export class PriorityQueue<T extends Item> {
	private queues = new Map<number, T[]>();
	private priority: Maybe<number> = Maybe.empty();
	private size: number = 0;

	constructor() {}

	push(item: T): void {
		const priority = item.priority;
		let queue = this.queues.get(priority);

		if (!queue) {
			queue = [];
			this.queues.set(priority, queue);

			if (this.priority.map(p => priority < p).orDefault(true)) {
				this.priority = Maybe.of(priority);
			}
		}

		queue.push(item);
		this.size++;
	}

	private findLowestPriority(): Maybe<number> {
		return Maybe.fromNullable([...this.queues.keys()].sortNum()[0]);
	}

	private peekPop(take: boolean): Maybe<T> {
		return this.priority.map(priority => {
			const queue = this.queues.get(priority);
			if (queue === undefined) { throw 'never'; }

			const item = queue[0];
			if (take) {
				queue.shift();
				this.size--;

				if (queue.length === 0) {
					this.queues.delete(priority);
					this.priority = this.findLowestPriority();
				}
			}

			return item;
		});
	}

	pop(): Maybe<T> {
		return this.peekPop(true);
	}

	peek(): Maybe<T> {
		return this.peekPop(false);
	}

	clear(): void {
		this.queues = new Map<number, T[]>();
		this.priority = Maybe.empty();
		this.size = 0;
	}

	get length(): number {
		return this.size;
	}

	get empty(): boolean {
		return this.size === 0;
	}
}

export interface Item {
	readonly priority: number; /* 0 is highest priority */
}

export default PriorityQueue;
