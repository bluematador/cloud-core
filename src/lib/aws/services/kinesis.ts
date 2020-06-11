import Account from '../account';
import AWS from 'aws-sdk';
import Pricing from '../pricing';
import RegionWorker from '../region-worker';
import Service from '../service';
import ServiceInfo from '../service-info';

const PayloadUnitFactor = 25; // magic number they use to calculate 'payload units' from KB of data

export const Info: ServiceInfo = {
	name: 'Kinesis Data Streams',
	regions: [
		'af-south-1',
		'ap-east-1',
		'ap-northeast-1',
		'ap-northeast-2',
		'ap-northeast-3',
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
		'Unable to find fanout GB data retrieved. Report a bug if you find it.',
	],
	pricing: new Pricing([{
		url: 'https://calculator.aws/pricing/2.0/meteredUnitMaps/kinesis/USD/current/kinesis.json',
		simple: {
			'Provisioned shard hour per ShardHour': 'shard',
			'Payload Units per PutRequest': 'payload',
			'Addon shard hour per ShardHour': 'shard.extra-retention',

			'Enhanced fan out GB of data retrieved per GB': 'fanout.data',
			'Enhanced fan out per ConsumerShardHour': 'fanout.consumer',
		},
		tiered: {},
		levels: {},
	}]),
};

export default class KinesisService extends Service<KinesisWorker> {
	constructor(readonly account: Account) {
		super(account, Info);
	}

	protected regionFactory(account: Account, region: string): KinesisWorker {
		return new KinesisWorker(account, this, region);
	}
}

export class KinesisWorker extends RegionWorker {
	private api: AWS.Kinesis;
	readonly workDelay = 500;

	constructor(readonly account: Account, readonly service: KinesisService, readonly region: string) {
		super();

		this.api = new AWS.Kinesis({
			apiVersion: '2013-12-02',
			credentials: account.credentials,
			region: region,
		});
	}

	updatedCredentials(credentials: AWS.Credentials): void {
		this.api.config.update({
			credentials: credentials,
		});
	}

	private arnForStream(stream: string): string {
		return 'arn:' + this.partition + ':kinesis:' + this.region + ':' + this.account.model.cloudId + ':stream/' + stream;
	}

	private inspectStream(stream: string): void {
		const arn = this.arnForStream(stream);

		this.addResource({
			id: arn,
			kind: 'Stream',
			name: stream,
			url: 'https://console.aws.amazon.com/kinesis/home?region=' + this.region + '#/streams/details/' + encodeURIComponent(stream) + '/details',
		});

		const details = this.enqueueRequest(100, this.api.describeStream({StreamName: stream}), data => {
			if (!data.StreamDescription) { throw 'AWS is a liar'; }

			this.account.store.commit.updateResource({
				id: arn,
				details: {
					Status: data.StreamDescription.StreamStatus || '',
					RetentionPeriodHours: data.StreamDescription.RetentionPeriodHours || 0,
					EncryptionType: data.StreamDescription.EncryptionType || '',
					Shards: data.StreamDescription.Shards.length,
				},
			});

			return data.StreamDescription;
		});

		const consumers = this.enqueuePagedRequestFold(100, this.api.listStreamConsumers({StreamARN: arn}), 0, (data, fold) => {
			if (data.Consumers) {
				this.account.store.commit.updateResource({
					id: arn,
					details: Object.fromEntries(data.Consumers.map(c => [c.ConsumerName || '', c.ConsumerStatus || ''])),
				});

				fold += data.Consumers.length;
			}

			return fold;
		});

		this.enqueuePagedRequest(999, this.api.listTagsForStream({StreamName: stream}), data => {
			if (data.Tags && data.Tags.length > 0) {
				this.account.store.commit.updateResource({
					id: arn,
					tags: Object.fromEntries(data.Tags.map(t => [t.Key || '', t.Value || ''])),
				});
			}
		});

		const usage = this.cloudwatch.summarizeMetrics([{
			id: 'kb',
			metric: 'PutRecord.Bytes',
			namespace: 'AWS/Kinesis',
			stat: 'Sum',
			unit: 'Kilobytes', // affects 'payload unit factor'
			dimensions: { 'StreamName': stream },
		}]);

		Promise.all([details, consumers, usage, this.pricing]).then(([details, consumers, usage, prices]) => {
			const calculations = this.calculationsForResource((key, seconds) => {
				// https://aws.amazon.com/kinesis/data-streams/pricing/
				const shards = details.Shards.length;
				const shardHours = shards * seconds / 3600;

				const extraRetention = (details.RetentionPeriodHours || 0) > 24;
				const extendedRetentionUsage = extraRetention ? shardHours : 0;

				const putUsage = usage.metrics['kb'][key].sum / PayloadUnitFactor;

				return {
					ShardHours: this.simpleCalc(shardHours, prices.simple['shard'], seconds, 'Shard-Hour'),
					PutPayload: this.simpleCalc(putUsage, prices.simple['payload'], seconds, 'Payload Units'),
					ExtendedRetention: this.simpleCalc(extendedRetentionUsage, prices.simple['shard.extra-retention'], seconds, 'Shard-Hour'),
					FanoutShardHours: this.simpleCalc(shardHours * consumers, prices.simple['fanout.consumer'], seconds, 'Consumer-Shard-Hour'),
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
		this.enqueuePagedRequest(0, this.api.listStreams(), data => {
			if (data.StreamNames) {
				data.StreamNames.forEach(s => this.inspectStream(s));
			}
		});
	}
}
