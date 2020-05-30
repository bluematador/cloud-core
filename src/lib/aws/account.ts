import * as Services from './services';
import AWS from 'aws-sdk';
import Service from './service';
import store, { AppStore } from '../../store';
import { Account as AccountModel } from '../../store/accounts';

export class Account {
	private _model: AccountModel;
	private _credentials: AWS.Credentials;
	readonly lambda: Services.Lambda;
	readonly services: Service<any>[];
	readonly store: AppStore;

	constructor(model: AccountModel) {
		this._model = model;
		this.store = store;
		this.services = [];
		this._credentials = this.newCredentials();

		this.lambda = new Services.Lambda(this);
		this.services.push(this.lambda);
	}

	private newCredentials(): AWS.Credentials {
		return new AWS.Credentials(this.model.access, this.model.secret);
	}

	set model(model: AccountModel) {
		this._model = model;
		this._credentials = this.newCredentials();
	}

	get model(): AccountModel {
		return this._model;
	}

	async test(): Promise<void> {
		const sts = new AWS.STS({
			apiVersion: '2011-06-15',
			credentials: this._credentials,
		});

		return sts.getCallerIdentity().promise().then((response) => {
			this.store.commit.accountTested({
				id: this.model.id,
				cloudId: response.Account,
			});
		}).catch((err) => {
			this.store.commit.accountTested({
				id: this.model.id,
				error: err.toString(),
			});

			throw err;
		});
	}

	testThenStart(): void {
		this.stop();
		this.test().then(() => this.start());
	}

	start(): void {
		if (this.started) {
			return;
		}

		this.services.forEach(service => service.start());
	}

	stop(): void {
		if (!this.started) {
			return;
		}

		this.services.forEach(service => service.stop());
	}

	/**
	 * cancels pending api calls
	 */
	resetProgress(): void {
		if (this.running) {
			throw 'cannot reset progress while running';
		}

		this.services.forEach(service => service.resetProgress());
	}

	/**
	 * deletes all progress and all vuex data
	 */
	purge(): void {
		if (this.running) {
			throw 'cannot purge while actively discovering';
		}

		this.services.forEach(service => service.purge());
	}

	get started(): boolean {
		return this.services.every(s => s.started);
	}

	get finished(): boolean {
		return this.services.every(s => s.finished);
	}

	get running(): boolean {
		return this.services.every(s => s.running);
	}
}

export default Account;
