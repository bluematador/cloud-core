
// an export is required
export {};

declare global {
	interface Array<T> {
		groupBy<U>(fn: (_1: T) => U): Map<U, T[]>;
		max(): number;
		maxBy(fn: (_1: T) => number): number;
		min(): number;
		minBy(fn: (_1: T) => number): number;
		sortBy<U>(fn: (_1: T) => U): T[];
		sortNum(): T[];
		sortNumBy<U extends number>(fn: (_1: T) => U): T[];
		sum(): number;
	}
}

/*===============*/
/* Array.groupBy */
/*===============*/

if (!Array.prototype.groupBy) {
	Array.prototype.groupBy = function<T, U>(this: T[], fn: (_1: T) => U): Map<U, T[]> {
		return this.reduce((map, one) => {
			const group = fn(one);

			const list = map.get(group);
			if (list === undefined) {
				map.set(group, [one]);
			}
			else {
				list.push(one);
			}

			return map;
		}, new Map<U, T[]>());
	}
}

/*===============*/
/* Array.sortNum */
/*===============*/

if (!Array.prototype.sortNum) {
	Array.prototype.sortNum = function<T extends number>(this: T[]): T[] {
		return this.sort((a, b) => a - b);
	}
}

/*==============*/
/* Array.sortBy */
/*==============*/

if (!Array.prototype.sortBy) {
	Array.prototype.sortBy = function<T, U>(this: T[], fn: (_1: T) => U): T[] {
		const grouped = this.groupBy(fn);
		return [...grouped.keys()].sort().map(key => {
			return grouped.get(key) || [];
		}).flat();
	}
}

/*=================*/
/* Array.sortNumBy */
/*=================*/

if (!Array.prototype.sortNumBy) {
	Array.prototype.sortNumBy = function<T, U extends number>(this: T[], fn: (_1: T) => U): T[] {
		const grouped = this.groupBy(fn);
		return [...grouped.keys()].sortNum().map(key => {
			return grouped.get(key) || [];
		}).flat();
	}
}

/*===========*/
/* Array.sum */
/*===========*/

if (!Array.prototype.sum) {
	Array.prototype.sum = function<T extends number>(this: T[]): number {
		return this.reduce((acc, one) => acc + one, 0);
	}
}

/*===========*/
/* Array.max */
/*===========*/

if (!Array.prototype.max) {
	Array.prototype.max = function<T extends number>(this: T[]): number {
		return this.reduce((acc, one) => Math.max(acc, one), -Infinity);
	}
}

/*===========*/
/* Array.min */
/*===========*/

if (!Array.prototype.min) {
	Array.prototype.min = function<T extends number>(this: T[]): number {
		return this.reduce((acc, one) => Math.min(acc, one), Infinity);
	}
}

/*=============*/
/* Array.maxBy */
/*=============*/

if (!Array.prototype.maxBy) {
	Array.prototype.maxBy = function<T>(this: T[], fn: (_1: T) => number): number {
		return this.map(e => fn(e)).max();
	}
}

/*=============*/
/* Array.minBy */
/*=============*/

if (!Array.prototype.minBy) {
	Array.prototype.minBy = function<T>(this: T[], fn: (_1: T) => number): number {
		return this.map(e => fn(e)).min();
	}
}
