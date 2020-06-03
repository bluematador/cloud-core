import Account from '../account';
import AWS from 'aws-sdk';
import Pricing from '../pricing';
import RegionWorker, { CancelToken } from '../region-worker';
import { RegionalService } from '../service';

const Name: string = 'CloudWatch';

export default class CloudWatchService extends RegionalService<CloudWatchWorker> {
	constructor(readonly account: Account) {
		// https://docs.aws.amazon.com/general/latest/gr/cw_region.html
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
			'Cloudwatch is not actually implemented yet. It only exists to help other services get usage.',
		];
	}

	protected regionFactory(account: Account, region: string): CloudWatchWorker {
		return new CloudWatchWorker(account, region);
	}
}

export class CloudWatchPricing extends Pricing {
	constructor() {
		super('https://calculator.aws/pricing/2.0/meteredUnitMaps/cloudwatch/USD/current/cloudwatch.json', {});
	}
}

export const pricing = new CloudWatchPricing();

export class CloudWatchWorker extends RegionWorker {
	private api: AWS.CloudWatch;
	readonly workDelay = 100;

	constructor(readonly account: Account, readonly region: string) {
		super(region, pricing);

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

	getMetrics(metrics: MetricsRequest): Promise<MetricsResponse> {
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

		return this.getMetrics(metrics).then(result => {
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
	}

	protected fillQueue(): void {
		// not done yet, but need other functions on this class for other services
	}

	protected reset(): void {
		// nothing to do
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
