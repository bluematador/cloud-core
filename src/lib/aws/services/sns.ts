import Account from '../account';
import AWS from 'aws-sdk';
import Pricing from '../pricing';
import RegionWorker from '../region-worker';
import Service from '../service';
import ServiceInfo from '../service-info';

const publishFactorB = 64000; // a 256KB message is actually 4 messages (256KB / 64KB = 4)

// there's a bunch of rates in the empty region pricing (''). But they don't make any sense, and are either free or $1.00 a piece.
// on the pricing page, it indicates outbound texts are $0.00645 each. That's the number we'll use here.
// https://aws.amazon.com/sns/sms-pricing/
const smsRate = 0.00645;

export const Info: ServiceInfo = {
	name: 'SNS',
	regions: [
		// 'af-south-1',
		// 'ap-east-1',
		// 'ap-northeast-1',
		// 'ap-northeast-2',
		// 'ap-northeast-3',
		// 'ap-south-1',
		// 'ap-southeast-1',
		// 'ap-southeast-2',
		// 'ca-central-1',
		// 'cn-north-1',
		// 'cn-northwest-1',
		// 'eu-central-1',
		// 'eu-north-1',
		// 'eu-south-1',
		// 'eu-west-1',
		// 'eu-west-2',
		// 'eu-west-3',
		// 'me-south-1',
		// 'sa-east-1',
		'us-east-1',
		// 'us-east-2',
		// 'us-gov-east-1',
		// 'us-gov-west-1',
		// 'us-west-1',
		// 'us-west-2',
	],
	caveats: [
		'Failed deliveries are not included in pricing. It is not clear whether AWS counts them.',
		'Data transfer is not counted.',
		'Notifications to Lambda and SQS are priced in their own services.',
		'API calls are billed, but unavailable from AWS. Your bill may be negligibly higher.',
		'Notifications are assigned proportional to the current number of subscriptions for platform pricing.',
	],
	pricing: new Pricing([{
		url: 'https://calculator.aws/pricing/2.0/meteredUnitMaps/sns/USD/current/sns.json',
		simple: {
			// Amazon SNS currently allows a maximum size of 256 KB for published messages.
			// Each 64KB chunk of published data is billed as 1 request.
			// For example, a single API call with a 256KB payload will be billed as four requests.
			'Amazon SNS API Requests': 'api',

			// direct notifications
			'HTTP Notifications': 'notifications.http',
			'SNS Email and Email JSON Notifications': 'notifications.email',

			// sqs and lambda are free
			'Amazon SQS Notifications': 'notifications.sqs',
			'AWS Lambda Notifications': 'notifications.lambda',

			// application notifications
			'Amazon Device Messaging Mobile Push Notifications': 'notifications.amazon-device',
			'Apple Passbook Notifications': 'notifications.passbook',
			'Apple Passbook Sandbox Notifications': 'notifications.passbook.sandbox',
			'Apple Push Notification Service APNS iOS Notifications': 'notifications.apns.ios',
			'Apple Push Notification Service APNS Mac OS Notifications': 'notifications.apns.mac',
			'Apple Push Notification Service APNS Sandbox iOS Notifications': 'notifications.apns.ios.sandbox',
			'Apple Push Notification Service APNS Sandbox Mac OS Notifications': 'notifications.apns.mac.sandbox',
			'Apple Push Notification Service APNS VOIP Notifications': 'notifications.apns.voip',
			'Apple Push Notification Service APNS VOIP Sandbox Notifications': 'notifications.apns.voip.sandbox',
			'Baidu Cloud Push Baidu Notifications': 'notifications.baidu',
			'Google Cloud Messaging for Android GCM Notifications': 'notifications.android',
			'Microsoft Push Notification Service for Windows Phone MPNS Notifications': 'notifications.mpns',
			'Windows Push Notification Services WNS Notifications': 'notifications.wns',
		},
		tiered: {},
		levels: {},
	}]),
};

export default class SnsService extends Service<SnsWorker> {
	constructor(readonly account: Account) {
		super(account, Info);
	}

	protected regionFactory(account: Account, region: string): SnsWorker {
		return new SnsWorker(account, this, region);
	}
}

export class SnsWorker extends RegionWorker {
	private api: AWS.SNS;
	readonly workDelay = 200;

	constructor(readonly account: Account, readonly service: SnsService, readonly region: string) {
		super();

		this.api = new AWS.SNS({
			apiVersion: '2010-03-31',
			credentials: account.credentials,
			region: region,
		});
	}

	updatedCredentials(credentials: AWS.Credentials): void {
		this.api.config.update({
			credentials: credentials,
		});
	}

	private inspectTopic(topic: AWS.SNS.Topic): void {
		const arn = topic.TopicArn || '';
		const name = arn.split(':').reverse()[0];

		const details = this.enqueueRequest(50, this.api.getTopicAttributes({TopicArn: arn}), data => {
			if (!data.Attributes) { throw 'aws is a liar'; }

			this.addResource({
				id: arn,
				name: name,
				kind: 'Topic',
				url: 'https://console.aws.amazon.com/sns/v3/home?region=' + this.region + '#/topic/' + encodeURIComponent(arn),
				details: {
					SubscriptionsPending: Number(data.Attributes.SubscriptionsPending || '0'),
					SubscriptionsConfirmed: Number(data.Attributes.SubscriptionsConfirmed || '0'),
					SubscriptionsDeleted: Number(data.Attributes.SubscriptionsDeleted || '0'),
				},
			})
		});

		this.enqueueRequest(999, this.api.listTagsForResource({ResourceArn: arn}), data => {
			if (data.Tags && data.Tags.length > 0) {
				this.account.store.commit.updateResource({
					id: arn,
					tags: Object.fromEntries(data.Tags.map(t => [t.Key || '', t.Value || ''])),
				});
			}
		})

		// list subscriptions
		const platforms = this.enqueuePagedRequestFold(100, this.api.listSubscriptionsByTopic({TopicArn: arn}), {} as {[key: string]: number}, (data, fold) => {
			if (data.Subscriptions) {
				data.Subscriptions.forEach(s => {
					const protocol = s.Protocol || '';
					fold[protocol] = (fold[protocol] ? fold[protocol] : 0) + 1;
				});
			}

			return fold;
		});

		// count delivered notifications
		const usage = this.cloudwatch.summarizeMetrics([{
			id: 'delivered',
			metric: 'NumberOfNotificationsDelivered',
			namespace: 'AWS/SNS',
			stat: 'Sum',
			unit: 'Count',
			dimensions: { 'TopicName': name },
		}, {
			id: 'published',
			metric: 'NumberOfMessagesPublished',
			namespace: 'AWS/SNS',
			stat: 'Sum',
			unit: 'Count',
			dimensions: { 'TopicName': name },
		}, {
			id: 'size',
			metric: 'PublishSize',
			namespace: 'AWS/SNS',
			stat: 'Average',
			unit: 'Bytes',
			dimensions: { 'TopicName': name },
		}]);

		Promise.all([details, platforms, usage, this.pricing]).then(([_, platforms, usage, pricing]) => {
			const numSubscriptions = Object.values(platforms).sum();

			const calculations = this.calculationsForResource((key, seconds) => {
				// this isn't perfect, but with small scale, won't matter, and with big scale will approach accurate
				const sizeFactor = usage.metrics['size'][key].averageNonZero / publishFactorB;
				const published = usage.metrics['published'][key].sum * sizeFactor;

				const portion = (group: string[], rate: number) => {
					const subs = group.map(g => platforms[g]).sum() || 0;
					const usage = numSubscriptions === 0 ? 0 : published * (subs / numSubscriptions);
					return this.simpleCalc(usage, rate, seconds);
				}

				return {
					Publish: this.simpleCalc(published, pricing.simple['api'], seconds),
					NotifySQS: portion(['sqs'], pricing.simple['notifications.sqs']),
					NotifyLambda: portion(['lambda'], pricing.simple['notifications.lambda']),
					NotifyHttp: portion(['http', 'https'], pricing.simple['notifications.http']),
					NotifyEmail: portion(['email', 'email-json'], pricing.simple['notifications.email']),
					NotifySMS: portion(['sms'], smsRate),
					NotifyApplication: portion(['application'], pricing.simple['notifications.amazon-device']),
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
		this.enqueuePagedRequest(0, this.api.listTopics(), data => {
			if (data.Topics && data.Topics.length > 0) {
				data.Topics.forEach(t => this.inspectTopic(t));
			}
		});
	}
}
