import Account from './account';
import AWS from 'aws-sdk';
import RegionWorker from './region-worker';
import ServiceInfo from './service-info';
import { Maybe } from 'purify-ts/Maybe';

export abstract class Service<T extends RegionWorker> {
	readonly regions: {[region: string]: T};

	constructor(account: Account, readonly info: ServiceInfo) {
		this.regions = {};
		info.regions.forEach(region => {
			this.regions[region] = this.regionFactory(account, region);
		});
	}

	abstract get account(): Account;
	protected abstract regionFactory(account: Account, region: string): T;

	updatedCredentials(credentials: AWS.Credentials): void {
		for (const id in this.regions) {
			this.regions[id].updatedCredentials(credentials);
		}
	}

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

	get started(): boolean {
		return Object.values(this.regions).every(r => r.started);
	}

	get finished(): boolean {
		return Object.values(this.regions).every(r => r.finished);
	}

	get running(): boolean {
		return this.started && !this.finished;
	}

	get progressDone(): number {
		return Object.values(this.regions).map(r => r.progressDone).sum();
	}

	get progressTotal(): number {
		return Object.values(this.regions).map(r => r.progressTotal).sum();
	}

	get progressError(): number {
		return Object.values(this.regions).map(r => r.progressError).sum();
	}
}

export default Service;
