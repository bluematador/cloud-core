import * as Services from './services';
import Analytics from '@/lib/google-analytics';
import AWS from 'aws-sdk';
import Service from './service';
import store, { AppStore } from '../../store';
import { Account as AccountModel } from '../../store/accounts';
import { throttle } from 'throttle-debounce';
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
	readonly kinesis: Services.Kinesis;
	readonly kms: Services.KMS;
	readonly lambda: Services.Lambda;
	readonly sns: Services.SNS;

	readonly store: AppStore;

	readonly updateProgressLazy = throttle(100, false, () => {
		this.updateProgress();
	});

	constructor(model: AccountModel) {
		this._model = model;
		this._credentials = new AWS.Credentials(this._model.access, this._model.secret);
		this.store = store;

		this.apigateway = new Services.ApiGateway(this);
		this.cloudwatch = new Services.CloudWatch(this);
		this.dynamodb = new Services.DynamoDB(this);
		this.kinesis = new Services.Kinesis(this);
		this.kms = new Services.KMS(this);
		this.lambda = new Services.Lambda(this);
		this.sns = new Services.SNS(this);

		this.services = [
			this.apigateway,
			this.cloudwatch,
			this.dynamodb,
			this.kinesis,
			this.kms,
			this.lambda,
			this.sns,
		];

		this.updateProgress();
	}

	updateModel(model: AccountModel): void {
		const old = this._model;
		this._model = model;

		if (old.access !== model.access || old.secret !== model.secret) {
			this._credentials = new AWS.Credentials(this._model.access, this._model.secret);
			this.services.forEach(service => service.updatedCredentials(this._credentials));
			this.test();
		}

		if (old.cloudId !== model.cloudId) {
			this.stop();
			this.purge();
		}

		if (model.error !== undefined) {
			this.stop();
		}

		if (model.error === undefined) {
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
			Analytics.event('accounts', 'test-success');
		}).catch((err) => {
			this.store.commit.accountTested({
				id: this.model.id,
				error: err.toString(),
			});
			Analytics.event('accounts', 'test-fail');
		});
	}

	start(): void {
		if (this.started) {
			return;
		}

		this.services.forEach(service => service.start());
		Analytics.event('discovery', 'start');
	}

	stop(): void {
		if (!this.started) {
			return;
		}

		this.services.forEach(service => service.stop());
		Analytics.event('discovery', 'stop');
	}

	updateProgress(): void {
		const progress = {
			id: this._model.id,
			done: this.progressDone,
			total: this.progressTotal,
			error: this.progressError,
		};

		this.store.commit.upsertProgress(progress);
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
