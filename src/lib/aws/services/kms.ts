import Account from '../account';
import AWS from 'aws-sdk';
import Pricing from '../pricing';
import RegionWorker from '../region-worker';
import Service from '../service';
import ServiceInfo from '../service-info';

export const Info: ServiceInfo = {
	name: 'KMS',
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
		'AWS does not allow breakdown of API calls by key.',
	],
	pricing: new Pricing([{
		url: 'https://calculator.aws/pricing/2.0/meteredUnitMaps/kms/USD/current/kms.json',
		simple: {
			'API Requests GenerateDatakeyPair ECC': 'api.genkeypair.ecc',
			'API Requests GenerateDatakeyPair RSA': 'api.genkeypair.rsa',
			'API request - Non Free Tier': 'api.default',
			'Asymmetric Requests RSA_2048': 'api.asymmetric.rsa2048',
			'Asymmetric Requests except RSA_2048API': 'api.asymmetric',
			'Encryption Key': 'key',
		},
		tiered: {},
		levels: {},
	}]),
};

export default class KMSService extends Service<KMSWorker> {
	constructor(readonly account: Account) {
		super(account, Info);
	}

	protected regionFactory(account: Account, region: string): KMSWorker {
		return new KMSWorker(account, this, region);
	}
}

export class KMSWorker extends RegionWorker {
	private api: AWS.KMS;
	readonly workDelay = 100;

	constructor(readonly account: Account, readonly service: KMSService, readonly region: string) {
		super();

		this.api = new AWS.KMS({
			apiVersion: '2014-11-01',
			credentials: account.credentials,
			region: region,
		});
	}

	updatedCredentials(credentials: AWS.Credentials): void {
		this.api.config.update({
			credentials: credentials,
		});
	}

	private arnForKeyId(id: string): string {
		return 'arn:' + this.partition + ':kms:' + this.region + ':' + this.account.model.cloudId + ':key/' + id;
	}

	private inspectKey(id: string, alias: string): void {
		const arn = this.arnForKeyId(id);
		const name = alias.substr('alias/'.length);

		const meta = this.enqueueRequest(50, this.api.describeKey({KeyId: id}), data => {
			if (!data.KeyMetadata) { throw 'aws is a liar'; }

			this.addResource({
				id: arn,
				name: name,
				kind: 'Key',
				url: 'https://console.aws.amazon.com/kms/home?region=' + this.region + '#/kms/keys/' + encodeURIComponent(id),
				details: {
					Enabled: '' + data.KeyMetadata.Enabled,
					Description: '' + data.KeyMetadata.Description,
					CustomerMasterKeySpec: '' + data.KeyMetadata.CustomerMasterKeySpec,
					KeyManager: '' + data.KeyMetadata.KeyManager,
					KeyState: '' + data.KeyMetadata.KeyState,
					KeyUsage: '' + data.KeyMetadata.KeyUsage,
				},
			});

			return data.KeyMetadata;
		});

		Promise.all([meta, this.pricing]).then(([meta, prices]) => {
			const calculations = this.calculationsForResource((key, seconds) => {
				const paid = !!meta.Enabled &&
						meta.KeyManager !== 'AWS' &&
						meta.KeyState !== 'PendingDeletion';

				const keyMonths = seconds / 2592000;
				const usage = paid ? keyMonths : 0;

				return {
					Key: this.simpleCalc(usage, prices.simple['key'], seconds),
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

	private inspectApiUsage(): void {
		const arn = this.fakeArn('kms', 'apiusage');
		return this.inspectSimpleApiUsage(arn, 'KMS', [
				'CancelKeyDeletion',
				'CreateAlias',
				'CreateGrant',
				'CreateKey',
				'CryptographicOperationsSymmetric',
				'DescribeKey',
				'EnableKey',
				'GenerateDataKeyPair-ECC_NIST_P256',
				'GenerateDataKeyPair-ECC_NIST_P384',
				'GenerateDataKeyPair-ECC_NIST_P521',
				'GenerateDataKeyPair-ECC_SECG_P256K1',
				'GenerateDataKeyPair-RSA_2048',
				'GenerateDataKeyPair-RSA_3072',
				'GenerateDataKeyPair-RSA_4096',
				'GetKeyPolicy',
				'GetKeyRotationStatus',
				'ListAliases',
				'ListKeys',
			], {
				'CryptographicOperationsSymmetric': 'api.asymmetric',
				'GenerateDataKeyPair-ECC_NIST_P256': 'api.genkeypair.ecc',
				'GenerateDataKeyPair-ECC_NIST_P384': 'api.genkeypair.ecc',
				'GenerateDataKeyPair-ECC_NIST_P521': 'api.genkeypair.ecc',
				'GenerateDataKeyPair-ECC_SECG_P256K1': 'api.genkeypair.ecc',
				'GenerateDataKeyPair-RSA_2048': 'api.genkeypair.rsa',
				'GenerateDataKeyPair-RSA_3072': 'api.genkeypair.rsa',
				'GenerateDataKeyPair-RSA_4096': 'api.genkeypair.rsa',
			},
			'api.default'
		);
	}

	protected fillQueue(): void {
		this.enqueuePagedRequest(0, this.api.listAliases(), data => {
			if (data.Aliases) {
				data.Aliases.forEach(k => {
					const alias = k.AliasName || '';
					if (!alias.startsWith('alias/aws/')) {
						this.inspectKey(k.TargetKeyId || '', alias);
					}
				});
			}
		});

		this.inspectApiUsage();
	}
}
