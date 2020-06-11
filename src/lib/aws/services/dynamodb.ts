import Account from '../account';
import AWS from 'aws-sdk';
import Pricing from '../pricing';
import RegionWorker from '../region-worker';
import { RegionalService } from '../service';

export const Name: string = 'DynamoDB';
const SecondsInMonth = 2592000;
const Gigabytes = 1073741824;

export default class DynamoDBService extends RegionalService<DynamoDBWorker> {
	constructor(readonly account: Account) {
		// https://docs.aws.amazon.com/general/latest/gr/ddb.html
		super(account, [
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
		]);
	}

	get name(): string {
		return Name;
	}

	get caveats(): string[] {
		return [
			'Backup restores are not included in calculations.',
			'Global tables using version 2017.11.29 will show up as separate tables, but each table will be correctly accounted for.',
			'Table size does not have history. Current value is used for PITR backups and data storage.',
			'Amazon does not give access to number of Stream Read Requests.',
		];
	}

	protected regionFactory(account: Account, region: string): DynamoDBWorker {
		return new DynamoDBWorker(account, this, region);
	}
}

export class DynamoDBPricing extends Pricing {
	protected readonly simpleInfo = {
		'Data Storage Indexed GB-Mo': 'storage',

		'Streams Read Requests': 'stream.read',

		'PayPerRequest Read Request Units': 'ondemand.read',
		'PayPerRequest Write Request Units': 'ondemand.write',
		'PayPerRequest Replicated Write Request Units': 'ondemand.write.replicated',

		'Provisioned Read Units': 'provisioned.read',
		'Provisioned Write Units': 'provisioned.write',
		'Provisioned Replicated Write Units': 'provisioned.write.replicated',

		'Restore Data Size': 'restore',
		'On-Demand Backup Storage GB-Month': 'ondemand.backup',
		'PITR Backup Storage GB-Mo': 'pitr.backup',
	};
	protected readonly tieredInfo = {};
	protected readonly levelsInfo = {};

	constructor() {
		super('https://calculator.aws/pricing/2.0/meteredUnitMaps/dynamodb/USD/current/dynamodb.json');
	}
}

export const pricing = new DynamoDBPricing();

export class DynamoDBWorker extends RegionWorker {
	private api: AWS.DynamoDB;
	readonly workDelay = 500;

	constructor(readonly account: Account, readonly service: DynamoDBService, readonly region: string) {
		super();

		this.api = new AWS.DynamoDB({
			apiVersion: '2012-08-10',
			credentials: account.credentials,
			region: region,
		});
	}

	updatedCredentials(credentials: AWS.Credentials): void {
		this.api.config.update({
			credentials: credentials,
		});
	}

	private arnForTable(table: string): string {
		return 'arn:' + this.partition + ':dynamodb:' + this.region + ':' + this.account.model.cloudId + ':table/' + table;
	}

	private inspectTable(name: string): void {
		const arn = this.arnForTable(name);

		this.addResource({
			id: arn,
			kind: 'Table',
			name: name,
			url: 'https://console.aws.amazon.com/dynamodb/home?region=' + this.region + '#tables:selected=' + encodeURIComponent(name) + ';tab=overview',
		});

		const details = this.enqueueRequest(100, this.api.describeTable({TableName: name}), data => {
			if (!data.Table) { throw 'AWS is a liar'; }

			this.account.store.commit.updateResource({
				id: arn,
				details: {
					GlobalTableVersion: data.Table.GlobalTableVersion || 'false',
					ItemCount: data.Table.ItemCount || 0,
					TableSizeBytes: data.Table.TableSizeBytes || 0,
					BillingMode: data.Table.BillingModeSummary && data.Table.BillingModeSummary.BillingMode || '',
					StreamViewType: data.Table.StreamSpecification && data.Table.StreamSpecification.StreamEnabled && data.Table.StreamSpecification.StreamViewType || 'false',
					ProvisionedRead: data.Table.ProvisionedThroughput && data.Table.ProvisionedThroughput.ReadCapacityUnits || 0,
					ProvisionedWrite: data.Table.ProvisionedThroughput && data.Table.ProvisionedThroughput.WriteCapacityUnits || 0,
					...(data.Table.Replicas ? Object.fromEntries(data.Table.Replicas.map(r => ['Replica (' + r.RegionName + ')', r.ReplicaStatus || ''])) : {}),
				},
			});

			return data.Table;
		});

		this.enqueueRequest(999, this.api.listTagsOfResource({ResourceArn: arn}), data => {
			if (data.Tags && Object.keys(data.Tags).length > 0) {
				this.account.store.commit.updateResource({
					id: arn,
					tags: Object.fromEntries(data.Tags.map(t => [t.Key || '', t.Value || ''])),
				});
			}
		});

		const backupSize = this.enqueuePagedRequestFold(100, this.api.listBackups({TableName: name}), 0, (data, fold) => {
			return fold + (data.BackupSummaries ? data.BackupSummaries.map(s => s.BackupSizeBytes || 0).sum() : 0);
		});

		const pitrBackups = this.enqueueRequest(100, this.api.describeContinuousBackups({TableName: name}), data => {
			return data.ContinuousBackupsDescription &&
			       data.ContinuousBackupsDescription.PointInTimeRecoveryDescription &&
			       data.ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus === 'ENABLED' || false;
		});

		const usage = this.cloudwatch.summarizeMetrics([{
				id: 'read',
				metric: 'ConsumedReadCapacityUnits',
				namespace: 'AWS/DynamoDB',
				stat: 'Sum',
				unit: 'Count',
				dimensions: { 'TableName': name },
			}, {
				id: 'write',
				metric: 'ConsumedWriteCapacityUnits',
				namespace: 'AWS/DynamoDB',
				stat: 'Sum',
				unit: 'Count',
				dimensions: { 'TableName': name },
			}, {
				id: 'provread',
				metric: 'ProvisionedReadCapacityUnits',
				namespace: 'AWS/DynamoDB',
				stat: 'Sum',
				unit: 'Count',
				dimensions: { 'TableName': name },
			}, {
				id: 'provwrite',
				metric: 'ProvisionedWriteCapacityUnits',
				namespace: 'AWS/DynamoDB',
				stat: 'Sum',
				unit: 'Count',
				dimensions: { 'TableName': name },
		}]);

		const regionPricing = pricing.forRegion(this.region);

		Promise.all([details, usage, backupSize, pitrBackups, regionPricing]).then(([details, usage, backupSize, pitrBackups, prices]) => {
			const tableSize = details.TableSizeBytes || 0;
			const sizePlusOverhead = tableSize + 100*(details.ItemCount || 0); // 100 is for "overhead"

			const calculations = this.calculationsForResource((key, seconds) => {
				// https://aws.amazon.com/dynamodb/pricing/
				const storage = (sizePlusOverhead / Gigabytes) * (seconds / SecondsInMonth)
				const pitrUsage = pitrBackups ? storage : 0;
				const ondemandBackup = (backupSize / Gigabytes) * (seconds / SecondsInMonth);

				const replicated = !!details.GlobalTableVersion;

				const ondemandReads = usage.metrics['read'][key].sum;
				const ondemandWrites = replicated ? 0 : usage.metrics['write'][key].sum;
				const ondemandReplicatedWrites = replicated ? usage.metrics['write'][key].sum : 0;

				const provisionedReads = usage.metrics['provread'][key].sum;
				const provisionedWrites = replicated ? 0 : usage.metrics['provwrite'][key].sum;
				const provisionedReplicatedWrites = replicated ? usage.metrics['provwrite'][key].sum : 0;

				return {
					Storage: this.simpleCalc(storage, prices.simple['storage'], seconds, 'GB-months'),
					PitrBackup: this.simpleCalc(pitrUsage, prices.simple['pitr.backup'], seconds, 'GB-months'),
					OndemandBackup: this.simpleCalc(ondemandBackup, prices.simple['ondemand.backup'], seconds, 'GB-months'),
					OndemandReads: this.simpleCalc(ondemandReads, prices.simple['ondemand.read'], seconds),
					OndemandWrites: this.simpleCalc(ondemandWrites, prices.simple['ondemand.write'], seconds),
					OndemandReplicatedWrites: this.simpleCalc(ondemandReplicatedWrites, prices.simple['ondemand.write.replicated'], seconds),
					ProvisionedReads: this.simpleCalc(provisionedReads, prices.simple['provisioned.read'], seconds),
					ProvisionedWrites: this.simpleCalc(provisionedWrites, prices.simple['provisioned.write'], seconds),
					ProvisionedReplicatedWrites: this.simpleCalc(provisionedReplicatedWrites, prices.simple['provisioned.write.replicated'], seconds),
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
		this.enqueuePagedRequest(0, this.api.listTables(), data => {
			if (data.TableNames) {
				data.TableNames.forEach(t => this.inspectTable(t));
			}
		});
	}
}
