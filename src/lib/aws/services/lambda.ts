import Account from '../account';
import AWS from 'aws-sdk';
import RegionWorker, { CancelToken } from '../region-worker';
import { RegionalService } from '../service';

export const LambdaName: string = 'Lambda';

export default class LambdaService extends RegionalService<LambdaWorker> {
	constructor(readonly account: Account) {
		// https://docs.aws.amazon.com/general/latest/gr/lambda-service.html
		super(account, [
			'af-south-1',
			'ap-east-1',
			'ap-northeast-1',
			'ap-northeast-2',
			'ap-south-1',
			'ap-southeast-1',
			'ap-southeast-2',
			'ca-central-1',
			'eu-central-1',
			'eu-north-1',
			'eu-south-1',
			'eu-west-1',
			'eu-west-2',
			'eu-west-3',
			'me-south-1',
			'sa-east-1',
			'us-east-1',
			'us-east-2',
			'us-west-1',
			'us-west-2',
		]);
	}

	get service(): string {
		return LambdaName;
	}

	protected regionFactory(account: Account, region: string): LambdaWorker {
		return new LambdaWorker(account, region);
	}
}

class LambdaWorker extends RegionWorker {
	private api: AWS.Lambda;

	constructor(readonly account: Account, readonly region: string) {
		super();

		this.api = new AWS.Lambda({
			apiVersion: '2015-03-31',
			credentials: account.credentials,
			region: region,
		});
	}

	updatedCredentials(credentials: AWS.Credentials): void {
		this.api.config.update({
			credentials: credentials,
		});
	}

	fillQueue(): void {
		this.enqueuePagedRequest(0, this.api.listFunctions(), data => {
			if (data.Functions) {
				this.account.store.commit.addResources(data.Functions.map(f => {
					return {
						id: f.FunctionArn || '',
						accountId: this.account.model.id,
						name: f.FunctionName || '',
						service: LambdaName,
						region: this.region,
						url: 'https://console.aws.amazon.com/lambda/home?region=' + this.region + '#/functions/' + encodeURIComponent(f.FunctionName || ''),
						details: {
							MemorySize: (f.MemorySize || '').toString(),
							Role: f.Role || '',
							Runtime: f.Runtime || '',
						},
					};
				}));
			}
		});
	}

	reset(): void {
		// nothing to do
	}
}
