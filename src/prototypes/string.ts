
export {};

declare global {
	interface String {
		maskFirst(n: number, char?: string): string;
		maskLast(n: number, char?: string): string;
		maskMiddle(first: number, last: number, char?: string): string;
	}
}

if (!String.prototype.maskFirst) {
	String.prototype.maskFirst = function(this: string, n: number, char?: string): string {
		char = (char || '*').substring(0, 1);
		n = Math.min(n, this.length);
		return (n > 0 ? char.repeat(n) : '') + this.substring(n);
	}
}

if (!String.prototype.maskLast) {
	String.prototype.maskLast = function(this: string, n: number, char?: string): string {
		char = (char || '*').substring(0, 1);
		n = Math.min(n, this.length);
		return this.substring(0, this.length - n) + (n > 0 ? char.repeat(n) : '');
	}
}

if (!String.prototype.maskMiddle) {
	String.prototype.maskMiddle = function(this: string, first: number, last: number, char?: string): string {
		if (first + last >= this.length) {
			return this;
		}

		char = (char || '*').substring(0, 1);
		const n = this.length - first - last;
		return this.substring(0, first) + (n > 0 ? char.repeat(n) : '') + this.substring(first + n);
	}
}
