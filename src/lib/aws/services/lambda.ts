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

		// calculate pricing
		Promise.all([provisioned, usage, this.prices]).then(([provisioned, usage, prices]) => {
			const memoryGB = (lambda.MemorySize || 0) / 1024;

			const invocationUsage = {
				last: usage.metrics['invocations'].last.sum,
				avg1h: usage.metrics['invocations'].avg1h.sum,
				avg1d: usage.metrics['invocations'].avg1d.sum,
				avg1w: usage.metrics['invocations'].avg1w.sum,
			};

			const computeUsage = {
				unit: 'GB-seconds',
				last: memoryGB * invocationUsage.last * usage.metrics['duration'].last.averageNonZero / 1000,
				avg1h: memoryGB * invocationUsage.avg1h * usage.metrics['duration'].avg1h.averageNonZero / 1000,
				avg1d: memoryGB * invocationUsage.avg1d * usage.metrics['duration'].avg1d.averageNonZero / 1000,
				avg1w: memoryGB * invocationUsage.avg1w * usage.metrics['duration'].avg1w.averageNonZero / 1000,
			};

			const provisionedUsage = {
				unit: 'GB-seconds',
				last: provisioned * memoryGB * usage.period * usage.metrics['duration'].last.count,
				avg1h: provisioned * memoryGB * usage.period * usage.metrics['duration'].avg1h.count,
				avg1d: provisioned * memoryGB * usage.period * usage.metrics['duration'].avg1d.count,
				avg1w: provisioned * memoryGB * usage.period * usage.metrics['duration'].avg1w.count,
			};

			const invocationCost = {
				last: invocationUsage.last * prices['Requests'] * (3600 / (usage.period * usage.metrics['duration'].last.count)),
				avg1h: invocationUsage.avg1h * prices['Requests'] * (3600 / (usage.period * usage.metrics['duration'].avg1h.count)),
				avg1d: invocationUsage.avg1d * prices['Requests'] * (3600 / (usage.period * usage.metrics['duration'].avg1d.count)),
				avg1w: invocationUsage.avg1w * prices['Requests'] * (3600 / (usage.period * usage.metrics['duration'].avg1w.count)),
			}

			// need to round to nearest 100ms for duration
			const computePrice = provisioned > 0 ? prices['Provisioned-Duration'] : prices['Duration'];
			const computeCost = {
				last: computeUsage.last * computePrice * (3600 / (usage.period * usage.metrics['duration'].last.count)),
				avg1h: computeUsage.avg1h * computePrice * (3600 / (usage.period * usage.metrics['duration'].avg1h.count)),
				avg1d: computeUsage.avg1d * computePrice * (3600 / (usage.period * usage.metrics['duration'].avg1d.count)),
				avg1w: computeUsage.avg1w * computePrice * (3600 / (usage.period * usage.metrics['duration'].avg1w.count)),
			}

			const provisionedCost = {
				last: provisionedUsage.last * prices['Provisioned-Concurrency'] * (3600 / (usage.period * usage.metrics['duration'].last.count)),
				avg1h: provisionedUsage.avg1h * prices['Provisioned-Concurrency'] * (3600 / (usage.period * usage.metrics['duration'].avg1h.count)),
				avg1d: provisionedUsage.avg1d * prices['Provisioned-Concurrency'] * (3600 / (usage.period * usage.metrics['duration'].avg1d.count)),
				avg1w: provisionedUsage.avg1w * prices['Provisioned-Concurrency'] * (3600 / (usage.period * usage.metrics['duration'].avg1w.count)),
			}

			this.account.store.commit.updateResource({
				id: lambda.FunctionArn || '',
				details: {
					ProvisionedConcurrency: provisioned,
				},
				usage: {
					Invocations: invocationUsage,
					Compute: computeUsage,
					Provisioned: provisionedUsage,
				},
				costs: {
					Invocations: invocationCost,
					Compute: computeCost,
					Provisioned: provisionedCost,
				},
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
						usage: {},
						costs: {},
					};
				}));
			}
		});
	}

	protected reset(): void {
		// nothing to do
	}
}
