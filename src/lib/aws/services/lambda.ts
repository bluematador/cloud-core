import Account from '../account';
import AWS from 'aws-sdk';
import Pricing from '../pricing';
import RegionWorker, { CancelToken } from '../region-worker';
import { RegionalService } from '../service';

const Name: string = 'Lambda';

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
		return Name;
	}

	get caveats(): string[] {
		return [
			'There is a cost for bandwidth, but AWS does not expose usage.',
			'Lambda @Edge not implemented yet.',
			'Cannot see history of provisioned concurrency, so RequestedProvisionedConcurrentExecutions is used for all calculations.',
			'Amazon rounds function duration up to 100ms increments. We round the average up to simulate. Actual prices may be higher or lower.'
		];
	}

	protected regionFactory(account: Account, region: string): LambdaWorker {
		return new LambdaWorker(account, region);
	}
}

export class LambdaPricing extends Pricing {
	constructor() {
		super('https://calculator.aws/pricing/2.0/meteredUnitMaps/lambda/USD/current/lambda.json', {
			'Lambda Duration': 'Duration',
			'Lambda Requests': 'Requests',
			'Lambda Duration-Provisioned': 'Provisioned-Duration',
			'Lambda Provisioned-Concurrency': 'Provisioned-Concurrency',
			'Lambda Edge-Duration': 'Edge-Duration',
			'Lambda Edge-Requests': 'Edge-Requests',
		});
	}
}

export const pricing = new LambdaPricing();

export class LambdaWorker extends RegionWorker {
	private api: AWS.Lambda;
	readonly workDelay = 500;

	constructor(readonly account: Account, readonly region: string) {
		super(region, pricing);

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

	private inspectLambda(lambda: AWS.Lambda.FunctionConfiguration): void {
		// check provisioned concurrency
		const provisioned = this.enqueuePagedRequestFold(
			100,
			this.api.listProvisionedConcurrencyConfigs({FunctionName: lambda.FunctionName || ''}),
			0, /* initial value */
			(data, provisioned) => {
				if (data.ProvisionedConcurrencyConfigs) {
					data.ProvisionedConcurrencyConfigs.forEach(config => {
						provisioned += config.RequestedProvisionedConcurrentExecutions || 0;
					});
				}

				return provisioned;
			}
		);

		this.enqueuePagedRequest(999, this.api.listTags({Resource: lambda.FunctionArn || ''}), (data) => {
			if (data.Tags && Object.keys(data.Tags).length > 0) {
				this.account.store.commit.updateResource({
					id: lambda.FunctionArn || '',
					tags: data.Tags,
				});
			}
		});

		// check invocation & duration
		const usage = this.cloudwatch.summarizeMetrics([{
				id: 'invocations',
				metric: 'Invocations',
				namespace: 'AWS/Lambda',
				stat: 'Sum',
				unit: 'Count',
				dimensions: { 'FunctionName': lambda.FunctionName || '' },
			}, {
				id: 'duration',
				metric: 'Duration',
				namespace: 'AWS/Lambda',
				stat: 'Average',
				unit: 'Milliseconds',
				dimensions: { 'FunctionName': lambda.FunctionName || '' },
		}]);

		Promise.all([provisioned, usage, this.prices]).then(([provisioned, usage, prices]) => {
			const memoryGB = (lambda.MemorySize || 0) / 1024;

			const calculations = this.calculationsForResource((key, seconds) => {
				// https://aws.amazon.com/lambda/pricing/
				const datapoints = usage.metrics['invocations'][key].count;

				const duration = Math.ceil(usage.metrics['duration'][key].averageNonZero / 100) / 10; // rounds to 100ms, then converts to seconds

				const invocationUsage = usage.metrics['invocations'][key].sum;
				const provisionedUsage = provisioned * memoryGB * usage.period * datapoints;
				const computeUsage = memoryGB * invocationUsage * duration;

				return {
					Invocations: this.normalizeCalculation(invocationUsage, prices['Requests'], seconds),
					Compute: this.normalizeCalculation(provisioned === 0 ? computeUsage : 0, prices['Duration'], seconds, 'GB-seconds'),
					ProvisionedCompute: this.normalizeCalculation(provisioned === 0 ? 0 : computeUsage, prices['Provisioned-Duration'], seconds, 'GB-seconds'),
					ProvisionedConcurrency: this.normalizeCalculation(provisionedUsage, prices['Provisioned-Concurrency'], seconds),
				};
			});

			this.account.store.commit.updateResource({
				id: lambda.FunctionArn || '',
				details: {
					ProvisionedConcurrency: provisioned,
				},
				calculations,
			});
		}).catch(e => {
			this.account.store.commit.updateResource({
				id: lambda.FunctionArn || '',
				error: e,
			});
		});
	}

	protected fillQueue(): void {
		this.enqueuePagedRequest(0, this.api.listFunctions(), data => {
			if (data.Functions) {
				data.Functions.forEach(f => this.inspectLambda(f));

				this.account.store.commit.addResources(data.Functions.map(f => {
					return {
						id: f.FunctionArn || '',
						accountId: this.account.model.id,
						name: f.FunctionName || '',
						service: Name,
						region: this.region,
						url: 'https://console.aws.amazon.com/lambda/home?region=' + this.region + '#/functions/' + encodeURIComponent(f.FunctionName || ''),
						details: {
							MemorySize: f.MemorySize || '',
							Role: f.Role || '',
							Runtime: f.Runtime || '',
						},
						tags: {},
					};
				}));
			}
		});
	}

	protected reset(): void {
		// nothing to do
	}
}
