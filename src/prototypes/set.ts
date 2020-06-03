
// an export is required
export {};

declare global {
	interface Set<T> {
		copy(): Set<T>;
		difference(other: Set<T>): Set<T>;
		equals(other: Set<T>): boolean;
		intersect(other: Set<T>): Set<T>;
		toArray(): T[];
		union(other: Set<T>): Set<T>;
	}
}

/*==========*/
/* Set.copy */
/*==========*/

if (!Set.prototype.copy) {
	Set.prototype.copy = function<T>(this: Set<T>): Set<T> {
		return new Set([...this]);
	}
}

/*================*/
/* Set.difference */
/*================*/

if (!Set.prototype.difference) {
	Set.prototype.difference = function<T>(this: Set<T>, other: Set<T>): Set<T> {
		return new Set(
			[...this].filter(e => !other.has(e))
		);
	}
}

/*===============*/
/* Set.intersect */
/*===============*/

if (!Set.prototype.intersect) {
	Set.prototype.intersect = function<T>(this: Set<T>, other: Set<T>): Set<T> {
		return new Set(
			[...this].filter(e => other.has(e))
		);
	}
}

/*===========*/
/* Set.union */
/*===========*/

if (!Set.prototype.union) {
	Set.prototype.intersect = function<T>(this: Set<T>, other: Set<T>): Set<T> {
		return new Set([...this, ...other]);
	}
}

/*============*/
/* Set.equals */
/*============*/

if (!Set.prototype.equals) {
	Set.prototype.equals = function<T>(this: Set<T>, other: Set<T>): boolean {
		return this.intersect(other).size === this.size &&
		       other.intersect(this).size === other.size;
	}
}

/*=============*/
/* Set.toArray */
/*=============*/

if (!Set.prototype.toArray) {
	Set.prototype.toArray = function<T>(this: Set<T>): T[] {
		return [...this];
	}
}
