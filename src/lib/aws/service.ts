import { Maybe } from 'purify-ts/Maybe';
import Account from './account';
import RegionWorker from './region-worker';

export abstract class Service<T extends RegionWorker> {
	readonly regions: {[region: string]: T};

	constructor(supportedRegions: string[]) {
		this.regions = {};
		supportedRegions.forEach(region => {
			this.regions[region] = this.createRegion(region);
		});
	}

	abstract get account(): Account;
	protected abstract createRegion(region: string): T;

	getRegion(name: string): Maybe<T> {
		return Maybe.fromNullable(this.regions[name]);
	}

	start(): void {
		if (this.started) {
			return;
		}

		for (const id in this.regions) {
			this.regions[id].start();
		}
	}

	stop(): void {
		if (!this.started) {
			return;
		}

		for (const id in this.regions) {
			this.regions[id].stop();
		}
	}

	/**
	 * cancels pending api calls
	 */
	resetProgress(): void {
		if (this.running) {
			throw 'cannot reset progress while running';
		}

		for (const id in this.regions) {
			this.regions[id].resetProgress();
		}
	}

	/**
	 * deletes all progress and all vuex data
	 */
	purge(): void {
		if (this.running) {
			throw 'cannot purge while actively discovering';
		}

		for (const id in this.regions) {
			this.regions[id].purge();
		}
	}

	get started(): boolean {
		return Object.values(this.regions).every(r => r.started);
	}

	get finished(): boolean {
		return Object.values(this.regions).every(r => r.finished);
	}

	get running(): boolean {
		return this.started && !this.finished;
	}
}

export abstract class RegionalService<T extends RegionWorker> extends Service<T> {
	constructor(supportedRegions: string[]) {
		super(supportedRegions);
	}

	get usEast2(): Maybe<T> { return this.getRegion('us-east-2'); }
	get usEast1(): Maybe<T> { return this.getRegion('us-east-1'); }
	get usWest1(): Maybe<T> { return this.getRegion('us-west-1'); }
	get usWest2(): Maybe<T> { return this.getRegion('us-west-2'); }
	get afSouth1(): Maybe<T> { return this.getRegion('af-south-1'); }
	get apEast1(): Maybe<T> { return this.getRegion('ap-east-1'); }
	get apSouth1(): Maybe<T> { return this.getRegion('ap-south-1'); }
	get apNortheast3(): Maybe<T> { return this.getRegion('ap-northeast-3'); }
	get apNortheast2(): Maybe<T> { return this.getRegion('ap-northeast-2'); }
	get apSoutheast1(): Maybe<T> { return this.getRegion('ap-southeast-1'); }
	get apSoutheast2(): Maybe<T> { return this.getRegion('ap-southeast-2'); }
	get apNortheast1(): Maybe<T> { return this.getRegion('ap-northeast-1'); }
	get caCentral1(): Maybe<T> { return this.getRegion('ca-central-1'); }
	get euCentral1(): Maybe<T> { return this.getRegion('eu-central-1'); }
	get euWest1(): Maybe<T> { return this.getRegion('eu-west-1'); }
	get euWest2(): Maybe<T> { return this.getRegion('eu-west-2'); }
	get euSouth1(): Maybe<T> { return this.getRegion('eu-south-1'); }
	get euWest3(): Maybe<T> { return this.getRegion('eu-west-3'); }
	get euNorth1(): Maybe<T> { return this.getRegion('eu-north-1'); }
	get meSouth1(): Maybe<T> { return this.getRegion('me-south-1'); }
	get saEast1(): Maybe<T> { return this.getRegion('sa-east-1'); }
}

export const Global = 'global';

export abstract class GlobalService<T extends RegionWorker> extends Service<T> {
	constructor() {
		super([Global]);
	}

	get global(): T { return this.getRegion(Global).unsafeCoerce(); }
}

export default Service;
