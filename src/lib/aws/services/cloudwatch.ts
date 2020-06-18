import Account from '../account';
import AWS from 'aws-sdk';
import Pricing, { RegionPrices } from '../pricing';
import RegionWorker from '../region-worker';
import Service from '../service';
import ServiceInfo from '../service-info';

export const Info: ServiceInfo = {
	name: 'CloudWatch',
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
		'Past usage / Creation date cannot be gathered on dashboards. Full-time usage assumed.',
		'AWS is not returning composite alarms from the API.',
		'Each call to GetMetricData, GetInsightRuleReport, and GetMetricWidgetImage assumes a single metric. Forecasts for API calls may be high.',
		'Canaries are not supported in the SDK yet.',
		'Custom metrics are counted even if they are not being actively updated.',
		'Logs are not supported.',
		'Insights are not supported.',
		'Events are not supported.',
	],
	pricing: new Pricing([{
		url: 'https://calculator.aws/pricing/2.0/meteredUnitMaps/cloudwatch/USD/current/cloudwatch.json',
		simple: {
			// GetMetricStatistics, ListMetrics, PutMetricData, GetDashboard, ListDashboards, PutDashboard and DeleteDashboards requests
			'API Request': 'api.default',
			'API Request GetInsightRuleReport': 'api.insight',
			'API Request GetMetricData': 'api.metricdata',
			'API Request GetMetricWidgetImage': 'api.metricwidget',

			'Alarm Standard': 'alarm.standard',
			'Alarm High Resolution': 'alarm.highresolution',
			'Alarm Composite': 'alarm.composite',
			// 3x standard/highresolution for anomaly detection

			'Logs Collected Data Ingestion': 'logs.ingest',
			'Stored Data': 'logs.storage',

			'Queried Logs Insights': 'logs.analyze-insights',
			'Contributor Insights CloudWatchLogs': 'insights.cloudwatch.rule',
			'Contributor Insights DynamoDB': 'insights.dynamo.rule',
			'Event CloudWatchLog': 'insights.cloudwatch.events',
			'Event DynamoDB': 'insights.dynamo.events',

			'Canaries per Runs': 'canary.run', // not supported in the SDK yet

			'Dashboard Basic Dashboard': 'dashboard.basic',
		},
		tiered: {
			// All custom metrics charges are prorated by the hour and metered only when you send metrics to CloudWatch.
			'Metric': 'custom.metrics',

			// VPC flow logs and Global Accelerator flow logs qualify for the following pricing
			'Delivered Logs': 'logs.s3upload',

			// VPC and Route53 logs qualify for Vended Logs pricing
			'Vended Logs': 'logs.vended',
		},
		levels: {},
	}, {
		url: 'https://calculator.aws/pricing/2.0/meteredUnitMaps/events/USD/current/events.json',
		simple: {
			'CloudWatch Events': 'events.default',
			'CloudWatch Events Custom Event': 'events.custom',
			'CloudWatch Events Discovery Event': 'events.discovery',
		},
		tiered: {},
		levels: {},
	}]),
};

export default class CloudWatchService extends Service<CloudWatchWorker> {
	constructor(readonly account: Account) {
		super(account, Info);
	}

	protected regionFactory(account: Account, region: string): CloudWatchWorker {
		return new CloudWatchWorker(account, this, region);
	}
}

export class CloudWatchWorker extends RegionWorker {
	private api: AWS.CloudWatch;
	readonly workDelay = 100;

	constructor(readonly account: Account, readonly service: CloudWatchService, readonly region: string) {
		super();

		this.api = new AWS.CloudWatch({
			apiVersion: '2010-08-01',
			credentials: account.credentials,
			region: region,
		});
	}

	updatedCredentials(credentials: AWS.Credentials): void {
		this.api.config.update({
			credentials: credentials,
		});
	}

	private getMetrics(metrics: MetricsRequest): Promise<MetricsResponse> {
		const period = 300;
		const periodMs = period * 1000;
		const durationMs = 604800000; // 1 week

		// never use the last data point
		const latest = new Date().getTime() - periodMs;

		// round to boundaries for consistent querying
		const end = latest - (latest % periodMs);
		const start = end - durationMs;

		const endDate = new Date(end);
		const startDate = new Date(start);

		const request = this.api.getMetricData({
			StartTime: startDate,
			EndTime: endDate,
			ScanBy: 'TimestampAscending',
			MetricDataQueries: metrics.map(m => {
				return {
					Id: m.id,
					MetricStat: {
						Metric: {
							Dimensions: Object.keys(m.dimensions).map(key => {
								return {
									Name: key,
									Value: m.dimensions[key],
								};
							}),
							MetricName: m.metric,
							Namespace: m.namespace,
						},
						Period: period,
						Stat: m.stat,
						Unit: m.unit,
					},
					ReturnData: true,
				};
			}),
		});

		const initial: MetricsResponse = {
			period,
			start: startDate,
			end: endDate,
			metrics: {},
		};

		const countElements = (end - start) / periodMs;
		metrics.forEach(m => {
			initial.metrics[m.id] = new Array(countElements).fill(0);
		});

		return this.enqueuePagedRequestFold(500, request, initial, (data, acc) => {
			if (data.MetricDataResults) {
				data.MetricDataResults.forEach(metric => {
					if (metric.Values && metric.Timestamps) {
						const id = metric.Id || '';
						for (let i = 0; i < metric.Values.length; i++) {
							const timestamp = metric.Timestamps[i];
							const value = metric.Values[i];

							const index = (timestamp.getTime() - start) / periodMs;
							acc.metrics[id][index] = value;
						}
					}
				});
			}
			return acc;
		});
	}

	summarizeMetrics(metrics: MetricsRequest): Promise<MetricSummaryResponse> {
		function summarize(data: number[]): MetricSummary {
			let sum = 0;
			let nonZeroCount = 0;
			for (let i = 0; i < data.length; i++) {
				const one = data[i];
				if (one !== 0) {
					sum += data[i];
					nonZeroCount++;
				}
			}

			return {
				count: data.length,
				sum: sum,
				average: sum / (data.length || 1),
				averageNonZero: sum / (nonZeroCount || 1),
			};
		}

		// cloudwatch can only handle so many metrics and data points per api
		const chunks = metrics.chunks(50).map(chunk => {
			return this.getMetrics(chunk).then(result => {
				const formatted: MetricSummaryResponse = {
					period: result.period,
					metrics: {},
				};

				for (const id in result.metrics) {
					const values = result.metrics[id];
					const reversed = [...values].reverse();

					formatted.metrics[id] = {
						last: summarize(reversed.slice(0, 1)),
						avg1h: summarize(reversed.slice(0,   3600 / result.period)),
						avg1d: summarize(reversed.slice(0,  86400 / result.period)),
						avg1w: summarize(reversed.slice(0, 604800 / result.period)),
					};
				}

				return formatted;
			});
		});

		return Promise.all(chunks).then(chunks => {
			const formatted: MetricSummaryResponse = {
				period: chunks[0].period,
				metrics: {},
			};

			for (const one of chunks) {
				formatted.metrics = {
					...one.metrics,
					...formatted.metrics,
				};
			}

			return formatted;
		});
	}

	private inspectDashboard(dashboard: AWS.CloudWatch.DashboardEntry): void {
		const arn = dashboard.DashboardArn || '';

		this.addResource({
			id: arn,
			kind: 'Dashboard',
			name: dashboard.DashboardName || '',
			region: 'global',
			url: 'https://console.aws.amazon.com/cloudwatch/home?region=' + this.region + '#dashboards:name=' + encodeURIComponent(dashboard.DashboardName || ''),
			details: {
				Size: Number(dashboard.Size || '0'),
			},
		});

		Promise.all([this.pricing]).then(([prices]) => {
			const calculations = this.calculationsForResource((key, seconds) => {
				// https://aws.amazon.com/cloudwatch/pricing/
				const usage = seconds / 2592000; // 1 month

				return {
					Existence: this.simpleCalc(usage, prices.simple['dashboard.basic'], seconds),
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

	private inspectCompositeAlarm(alarm: AWS.CloudWatch.CompositeAlarm): void {
		const arn = '' + alarm.AlarmArn;

		this.addResource({
			id: arn,
			name: '' + alarm.AlarmName,
			kind: 'Composite Alarm',
			url: 'https://console.aws.amazon.com/cloudwatch/home?region=' + this.region + '#alarmsV2:alarm/' + encodeURIComponent(alarm.AlarmName || ''),
			details: {
				AlarmDescription: '' + alarm.AlarmDescription,
				StateValue: '' + alarm.StateValue,
				AlarmRule: '' + alarm.AlarmRule,
			},
		});

		Promise.all([this.pricing]).then(([prices]) => {
			const calculations = this.calculationsForResource((key, seconds) => {
				// https://aws.amazon.com/cloudwatch/pricing/
				const usage = seconds / 2592000; // 1 month

				return {
					CompositeAlarm: this.simpleCalc(usage, prices.simple['alarm.composite'], seconds),
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

	private inspectMetricAlarm(alarm: AWS.CloudWatch.MetricAlarm): void {
		const arn = '' + alarm.AlarmArn;
		const dimensions: AWS.CloudWatch.Dimensions = alarm.Dimensions || (alarm.Metrics && alarm.Metrics[0] && alarm.Metrics[0].MetricStat && alarm.Metrics[0].MetricStat.Metric && alarm.Metrics[0].MetricStat.Metric.Dimensions) || [];
		const period = Number(alarm.Period || (alarm.Metrics && alarm.Metrics[0].MetricStat && alarm.Metrics[0].MetricStat.Period) || '60');

		const isAnomaly = alarm.Metrics && alarm.Metrics.some(m => m.Expression && m.Expression.includes("ANOMALY"));
		const highResolution = period < 60;

		this.addResource({
			id: arn,
			name: '' + alarm.AlarmName,
			kind: 'Metric Alarm',
			url: 'https://console.aws.amazon.com/cloudwatch/home?region=' + this.region + '#alarmsV2:alarm/' + encodeURIComponent(alarm.AlarmName || ''),
			details: {
				AlarmDescription: '' + alarm.AlarmDescription,
				AnomalyDetection: '' + isAnomaly,
				StateValue: '' + alarm.StateValue,
				MetricName: alarm.MetricName || (alarm.Metrics && alarm.Metrics[0].MetricStat && alarm.Metrics[0].MetricStat.Metric && alarm.Metrics[0].MetricStat.Metric.MetricName) || '',
				Namespace: alarm.Namespace || (alarm.Metrics && alarm.Metrics[0].MetricStat && alarm.Metrics[0].MetricStat.Metric && alarm.Metrics[0].MetricStat.Metric.Namespace) || '',
				Statistic: alarm.Statistic || (alarm.Metrics && alarm.Metrics[0].MetricStat && alarm.Metrics[0].MetricStat.Stat) || '',
				Period: period,
				HighResolution: '' + highResolution,
				...(Object.fromEntries(dimensions.map(d => ['Dimension ' + d.Name, d.Value || '']))),
			},
		});

		Promise.all([this.pricing]).then(([prices]) => {
			const calculations = this.calculationsForResource((key, seconds) => {
				// https://aws.amazon.com/cloudwatch/pricing/
				let lineItem: string = highResolution ? 'HighResolution' : 'Standard';
				lineItem += isAnomaly ? 'Anomaly' : '';

				// rate is per "alarm metric" per month, but cloudwatch only allows 1 metric per alarm.
				let rate: number = prices.simple[highResolution ? 'alarm.highresolution' : 'alarm.standard'];
				rate *= isAnomaly ? 3 : 1; // anomaly metrics are 3x, but pricing doesn't have a line item for them

				const usage = seconds / 2592000; // 1 month

				return {
					[lineItem]: this.simpleCalc(usage, rate, seconds),
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
		const arn = this.fakeArn('cloudwatch', 'apiusage');
		return this.inspectSimpleApiUsage(arn, 'CloudWatch', [
				'GetMetricData',
				'GetInsightRuleReport',
				'GetMetricWidgetImage',
				'GetMetricStatistics',
				'ListMetrics',
				'PutMetricData',
				'GetDashboard',
				'ListDashboards',
				'PutDashboard',
				'DeleteDashboards',
			], {
				'GetMetricData': 'api.metricdata',
				'GetInsightRuleReport': 'api.insight',
				'GetMetricWidgetImage': 'api.metricwidget',
			},
			'api.default'
		);
	}

	private inspectCustomMetricUsage(): void {
		// this item doesn't have an arn, so we'll make one up.
		const arn = this.fakeArn('cloudwatch', 'metrics');

		const countMetrics = this.enqueuePagedRequestFold(20, this.api.listMetrics(), 0, (data, fold) => {
			const count = data.Metrics ? data.Metrics.count(m => !(m.Namespace || '').startsWith('AWS/')) : 0;
			return fold + count;
		});

		Promise.all([countMetrics, this.pricing]).then(([countMetrics, prices]) => {
			const calculations = this.calculationsForResource((key, seconds) => {
				return {
					CustomMetrics: this.tieredCalc(countMetrics / 2592000, prices.tiered['custom.metrics'], seconds),
				}
			});

			this.addResource({
				id: arn,
				name: 'Custom Metrics',
				kind: 'Custom Metrics',
				url: "https://console.aws.amazon.com/cloudwatch/home?region=" + this.region + "#metricsV2:graph=~()",
				details: {
					Count: countMetrics,
				},
				calculations,
			});
		}).catch(e => {
			this.updateResourceError(arn, e);
		});
	}

	protected fillQueue(): void {
		this.enqueuePagedRequest(0, this.api.describeAlarms(), data => {
			if (data.CompositeAlarms) {
				data.CompositeAlarms.forEach(a => this.inspectCompositeAlarm(a));
				if (data.CompositeAlarms.length > 0) {
					console.log(data.CompositeAlarms);
				}
			}

			if (data.MetricAlarms) {
				data.MetricAlarms.forEach(a => this.inspectMetricAlarm(a));
			}
		});

		// dashboard entities span all regions. only request for one.
		if (this.region === 'us-east-1') {
			this.enqueuePagedRequest(0, this.api.listDashboards(), data => {
				if (data.DashboardEntries) {
					data.DashboardEntries.forEach(d => this.inspectDashboard(d));
				}
			});
		}

		this.inspectApiUsage();

		this.inspectCustomMetricUsage();
	}
}

type MetricsRequest = MetricRequestDefinition[]
interface MetricRequestDefinition {
	id: string
	metric: string
	namespace: string
	stat: "SampleCount"|"Average"|"Sum"|"Minimum"|"Maximum"
	unit: "Seconds"|"Microseconds"|"Milliseconds"|
	      "Bytes"|"Kilobytes"|"Megabytes"|"Gigabytes"|"Terabytes"|
	      "Bits"|"Kilobits"|"Megabits"|"Gigabits"|"Terabits"|
	      "Percent"|"Count"|
	      "Bytes/Second"|"Kilobytes/Second"|"Megabytes/Second"|"Gigabytes/Second"|"Terabytes/Second"|
	      "Bits/Second"|"Kilobits/Second"|"Megabits/Second"|"Gigabits/Second"|"Terabits/Second"|
	      "Count/Second"|"None"
	dimensions: {[key: string]: string}
}

interface MetricsResponse {
	period: number
	start: Date
	end: Date
	metrics: {
		[id: string]: number[]
	}
}

interface MetricSummaryResponse {
	period: number,
	metrics: {
		[id: string]: {
			last: MetricSummary
			avg1h: MetricSummary
			avg1d: MetricSummary
			avg1w: MetricSummary
		}
	}
}

interface MetricSummary {
	count: number
	sum: number
	average: number
	averageNonZero: number
}
