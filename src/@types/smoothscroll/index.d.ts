// Type definitions for smoothscroll 0.4.0

declare module 'smoothscroll' {
	/*~ This example shows how to have multiple overloads for your function */
	function smoothscroll(element: HTMLElement, duration?: number, callback?: () => void, context?: HTMLElement): void;
	export = smoothscroll;
}

