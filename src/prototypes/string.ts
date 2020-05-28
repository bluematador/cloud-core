
export {};

declare global {
	interface String {
		mask(show: number, maskLen: number, char?: string): string;
	}
}

if (!String.prototype.mask) {
	String.prototype.mask = function(this: string, show: number, maskLen?: number, char?: string): string {
		maskLen = maskLen || 4;
		char = (char || '*').substring(0, 1);
		return char.repeat(maskLen) + this.substring(Math.max(0, this.length - show));
	}
}
