import ua from 'universal-analytics';

const property = 'UA-77720502-2';
const visitor = ua(property);
const host = window.location.protocol + '//' + window.location.host;

export class Analytics {
	pageview(path: string): void {
		visitor.pageview(path, host).send();
	}

	event(action: string, label: string): void {
		visitor.event('Cloud CORE', action, label).send();
	}
}

const singleton = new Analytics();
singleton.pageview(window.location.pathname);

export default singleton;
