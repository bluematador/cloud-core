import * as Services from './services';
import AWS from 'aws-sdk';
import Service from './service';
import store, { AppStore } from '../../store';
import { Account as AccountModel } from '../../store/accounts';
import { Progress } from '@/store/progress';

AWS.config.update({
	maxRetries: 5,
});

export class Account {
	private _model: AccountModel;
	private _credentials: AWS.Credentials;

	readonly services: Service<any>[];

	readonly apigateway: Services.ApiGateway;
	readonly cloudwatch: Services.CloudWatch;
	readonly dynamodb: Services.DynamoDB;
	readonly lambda: Services.Lambda;

	readonly store: AppStore;

	constructor(model: AccountModel) {
		this._model = model;
		this._credentials = new AWS.Credentials(this._model.access, this._model.secret);
		this.store = store;

		this.apigateway = new Services.ApiGateway(this);
		this.cloudwatch = new Services.CloudWatch(this);
		this.dynamodb = new Services.DynamoDB(this);
		this.lambda = new Services.Lambda(this);

		this.services = [
			this.apigateway,
			this.cloudwatch,
			this.dynamodb,
			this.lambda,
		];

		this.updateProgress();
	}

	updateModel(model: AccountModel): void {
		const old = this._model;
		this._model = model;

		if (old.access !== model.access || old.secret !== model.secret) {
			this._credentials = new AWS.Credentials(this._model.access, this._model.secret);
			this.services.forEach(service => service.updatedCredentials(this._credentials));
		}

		if (old.cloudId !== model.cloudId) {
			this.stop();
			this.purge();
		}

		if (model.error !== undefined) {
			this.stop();
		}

		if (model.enabled && model.error === undefined) {
			this.start();
		}
	}

	get model(): AccountModel {
		return this._model;
	}

	get credentials(): AWS.Credentials {
		return this._credentials;
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
		});
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

	updateProgress(): Progress {
		const progress = {
			id: this._model.id,
			done: this.progressDone,
			total: this.progressTotal,
			error: this.progressError,
		};

		this.store.commit.upsertProgress(progress);

		return progress;
	}

	/**
	 * cancels pending api calls
	 */
	resetProgress(): void {
		if (this.running) {
			throw 'cannot reset progress while running';
		}

		this.services.forEach(service => service.resetProgress());
		this.store.commit.deleteProgress(this._model.id);
	}

	/**
	 * deletes all progress and all vuex data
	 */
	purge(): void {
		if (this.running) {
			throw 'cannot purge while actively discovering';
		}

		this.stop();
		this.resetProgress();
		this.store.commit.deleteAccountResources(this.model.id);
	}

	get started(): boolean {
		return this.services.every(s => s.started);
	}

	get finished(): boolean {
		return this.services.every(s => s.finished);
	}

	get running(): boolean {
		return this.services.some(s => s.running);
	}

	get progressDone(): number {
		return this.services.map(s => s.progressDone).sum();
	}

	get progressTotal(): number {
		return this.services.map(s => s.progressTotal).sum();
	}

	get progressError(): number {
		return this.services.map(s => s.progressError).sum();
	}
}

export default Account;
