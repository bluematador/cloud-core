import Account from '../account';
import AWS from 'aws-sdk';
import Pricing from '../pricing';
import RegionWorker from '../region-worker';
import Service from '../service';
import ServiceInfo from '../service-info';

export const Info: ServiceInfo = {
	name: 'API Gateway (v1)',
	regions: [
		'af-south-1',
		'ap-east-1',
		'ap-northeast-1',
		'ap-northeast-2',
		'ap-south-1',
		'ap-southeast-1',
		'ap-southeast-2',
		'ca-central-1',
		'cn-north-1',
		'cn-northwest-1',
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
		'us-gov-east-1',
		'us-gov-west-1',
		'us-west-1',
		'us-west-2',
	],
	caveats: [
		'API Gateway v2 does not support CORS, and cannot be detected right now. This includes all websocket and HTTP APIs.',
		'Caching is either on or off, switches are not detected or included in calculations.',
	],
	pricing: new Pricing([{
		url: 'https://calculator.aws/pricing/2.0/meteredUnitMaps/apigateway/USD/current/apigateway.json',
		simple: {
			'WebSocket Connection Minutes': 'Socket-Minutes',
		},
		tiered: {
			'API Calls': 'REST-Calls',
			'ApiGatewayHttpApi': 'HTTP-Calls',
			'WebSocket Messages': 'Socket-Messages',
		},
		levels: {
			'Caching Memory Size': 'Cache',
		},
	}]),
};

export default class ApiGatewayService extends Service<ApiGatewayWorker> {
	constructor(readonly account: Account) {
		super(account, Info);
	}

	protected regionFactory(account: Account, region: string): ApiGatewayWorker {
		return new ApiGatewayWorker(account, this, region);
	}
}

export class ApiGatewayWorker extends RegionWorker {
	private api: AWS.APIGateway;
	readonly workDelay = 500;

	constructor(readonly account: Account, readonly service: ApiGatewayService, readonly region: string) {
		super();

		this.api = new AWS.APIGateway({
			apiVersion: '2015-07-09',
			credentials: account.credentials,
			region: region,
		});
	}

	updatedCredentials(credentials: AWS.Credentials): void {
		this.api.config.update({
			credentials: credentials,
		});
	}

	private arnForRest(rest: AWS.APIGateway.RestApi): string {
		return 'arn:' + this.partition + ':apigateway:' + this.region + '::/restapis/' + rest.id;
	}

	private inspectGateway(rest: AWS.APIGateway.RestApi): void {
		const arn = this.arnForRest(rest);

		this.addResource({
			id: arn,
			kind: 'Rest API',
			name: rest.name || '',
			url: 'https://console.aws.amazon.com/apigateway/home?region=' + this.region + '#/apis/' + encodeURIComponent(rest.id || '') + '/dashboard',
			details: {
				Description: rest.description || '',
			},
			tags: rest.tags || {},
		});

		const cacheInitial: {[id: string]: string} = {};
		const caches = this.enqueuePagedRequestFold(999, this.api.getStages({restApiId: rest.id || ''}), cacheInitial, (data, fold) => {
			if (data.item && data.item.length > 0) {
				let caching: boolean = false;

				data.item.forEach(i => {
					if (i.cacheClusterEnabled && i.cacheClusterSize) {
						fold[i.deploymentId || ''] = i.cacheClusterSize;
						caching = true;
					}
				});

				this.account.store.commit.updateResource({
					id: arn,
					details: {
						Caching: '' + caching,
						...Object.fromEntries(data.item.map(i => {
							return [
								'Deployment (' + i.deploymentId + ')',
								i.stageName || ''
							];
						})),
					},
				});

			}

			return fold;
		});

		// check invocation & duration
		const usage = this.cloudwatch.summarizeMetrics([{
			id: 'calls',
			metric: 'Count',
			namespace: 'AWS/ApiGateway',
			stat: 'Sum',
			unit: 'Count',
			dimensions: { 'ApiName': rest.name || '' },
		}]);

		Promise.all([caches, usage, this.pricing]).then(([caches, usage, prices]) => {
			const calculations = this.calculationsForResource((key, seconds) => {
				// https://aws.amazon.com/api-gateway/pricing/
				const apiCalls = usage.metrics['calls'][key].sum;

				return {
					Calls: this.tieredCalc(apiCalls, prices.tiered['REST-Calls'], seconds),
					Cache: this.levelsCalc(Object.values(caches), prices.levels['Cache'], seconds, 'GB-hours'),
				};
			});

			this.account.store.commit.updateResource({
				id: arn,
				calculations,
			});
		}).catch(e => {
			this.updateResourceError(arn, e);
		});
	}

	protected fillQueue(): void {
		this.enqueuePagedRequest(0, this.api.getRestApis(), data => {
			if (data.items) {
				data.items.forEach(i => this.inspectGateway(i));
			}
		});
	}
}
