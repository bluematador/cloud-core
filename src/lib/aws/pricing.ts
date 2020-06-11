import Http from 'superagent';

// https://docs.aws.amazon.com/general/latest/gr/rande.html
const regions = {
	'af-south-1': 'Africa (Cape Town)',
	'ap-east-1': 'Asia Pacific (Hong Kong)',
	'ap-northeast-1': 'Asia Pacific (Tokyo)',
	'ap-northeast-2': 'Asia Pacific (Seoul)',
	'ap-northeast-3': 'Asia Pacific (Osaka-Local)',
	'ap-south-1': 'Asia Pacific (Mumbai)',
	'ap-southeast-1': 'Asia Pacific (Singapore)',
	'ap-southeast-2': 'Asia Pacific (Sydney)',
	'ca-central-1': 'Canada (Central)',
	'cn-north-1': 'China (Beijing)',
	'cn-northwest-1': 'China (Ningxia)',
	'eu-central-1': 'EU (Frankfurt)',
	'eu-north-1': 'EU (Stockholm)',
	'eu-south-1': 'EU (Milan)',
	'eu-west-1': 'EU (Ireland)',
	'eu-west-2': 'EU (London)',
	'eu-west-3': 'EU (Paris)',
	'me-south-1': 'Middle East (Bahrain)',
	'sa-east-1': 'South America (Sao Paulo)',
	'us-east-1': 'US East (N. Virginia)',
	'us-east-2': 'US East (Ohio)',
	'us-gov-east-1': 'AWS GovCloud (US-East)',
	'us-gov-west-1': 'AWS GovCloud (US)',
	'us-west-1': 'US West (N. California)',
	'us-west-2': 'US West (Oregon)',
};

const ignore = {
	'Any': true,
	'US West (Los Angeles)': true, // https://aws.amazon.com/blogs/aws/aws-now-available-from-a-local-zone-in-los-angeles/
	'US ISOB East (Ohio)': true, // no idea what this is.
}

const regionLookup = Object.fromEntries(Object.entries(regions).map(([key, value]) => [value, key]));
const corsProxy = 'https://cors-anywhere.herokuapp.com/';
const multiples: {[key: string]: number} = {
	'thousand':    Math.pow(1000, 1),
	'million':     Math.pow(1000, 2),
	'billion':     Math.pow(1000, 3),
	'trillion':    Math.pow(1000, 4),
	'quadrillion': Math.pow(1000, 5),
	'quintillion': Math.pow(1000, 6),
	'KB': Math.pow(1024, 1),
	'MB': Math.pow(1024, 2),
	'GB': Math.pow(1024, 3),
	'TB': Math.pow(1024, 4),
	'PB': Math.pow(1024, 5),
	'EB': Math.pow(1024, 6),
};

export default class Pricing {
	protected promise: Promise<PricingData>;

	constructor(readonly opts: PricingOpts) {
		this.promise = this.loadAll(opts);
	}

	private loadAll(opts: PricingOpts): Promise<PricingData> {
		const promises = opts.map(o => this.loadOne(o));

		return Promise.all(promises).then(all => {
			const ret: PricingData = {};

			for (const one of all) {
				for (const region in one) {
					if (!(region in ret)) {
						ret[region] = {
							simple: {},
							levels: {},
							tiered: {},
						};
					}

					ret[region].simple = { ...ret[region].simple, ...one[region].simple };
					ret[region].tiered = { ...ret[region].tiered, ...one[region].tiered };
					ret[region].levels = { ...ret[region].levels, ...one[region].levels };
				}
			}

			return ret;
		});
	}

	private loadOne(opts: PricingOpt): Promise<PricingData> {
		const proxy = corsProxy + opts.url.replace('https://', '').replace('http://', '');

		return Http.get(proxy).then(response => {
			const data: PricingData = {};

			for (const regionReadable in response.body['regions']) {
				if (regionReadable in ignore) { continue; }

				const region = regionLookup[regionReadable];
				if (region === undefined) {
					console.log('unknown region in pricing', regionReadable, opts.url);
					continue;
				}

				const regionData = {
					...(response.body['regions']['Any'] || {}),
					...response.body['regions'][regionReadable],
				};
				data[region] = {
					simple: this.parseSimple(regionData, opts.simple),
					tiered: this.parseTiered(regionData, opts.tiered),
					levels: this.parseLevels(regionData, opts.levels),
				};
			}

			return data;
		});
	}

	private parseSimple(data: any, opts: Options): SimplePrices {
		/**
			Turn an object of these:
				"WebSocket Connection Minutes": {
					"rateCode":"XZKWPFRFD9C8NQJ4.JRTCKXETXF.6YS6EN2CT7",
					"price":"0.0000003000"
				},
			into these:
				"Websocket-minutes": 0.0000003000,
		**/

		return Object.fromEntries(
			Object.keys(data).filter(k => k in opts).map(k => {
				const newKey = opts[k];
				const value = Number(data[k].price);
				return [newKey, value];
			})
		);
	}

	private parseTiered(data: any, opts: Options): TieredPrices {
		/**
			Turn an object of these:
				"API Calls Number of Request Next 667 million": {
					"rateCode":"FRC8R6GQ68QTWM3X.JRTCKXETXF.DRE2JBTXBV",
					"price":"0.0000033600"
				},
				"API Calls Number of Request Next 19 billion": {
					"rateCode":"FRC8R6GQ68QTWM3X.JRTCKXETXF.J4SY3H5SUC",
					"price":"0.0000028600"
				},
				"API Calls Number of up to 333 million": {
					"rateCode":"FRC8R6GQ68QTWM3X.JRTCKXETXF.QS4VQ8N7FD",
					"price":"0.0000035000"
				},
				"API Calls Number of Request Over 20 billion": {
					"rateCode":"FRC8R6GQ68QTWM3X.JRTCKXETXF.KVC36CKCEW",
					"price":"0.0000018100"
				},

			or these:
				"WebSocket Messages Messages first 1 billion": {
					"rateCode":"9VACJY8FAD9VCT68.JRTCKXETXF.ZN357FEBCK",
					"price":"0.0000012000"
				},
				"WebSocket Messages Messages over 1 billion": {
					"rateCode":"9VACJY8FAD9VCT68.JRTCKXETXF.AGD8ADSNTG",
					"price":"0.0000010000"
				}

			into these:
				"API-Calls": [{
					count: 333000000,
					rate: 0.0000035000,
				}, {
					count: 667000000,
					rate: 0.0000033600,
				}, {
					count: 19000000000,
					rate: 0.0000028600,
				}, {
					rate: 0.0000018100,
				}],
				"Socket-Messages": [{
					count: 1000000000,
					rate: 0.0000012000,
				}, {
					rate: 0.0000010000,
				}]

			Known cases:
			API Calls Number of up to 333 million
			Delivered Logs for first 10TB
			Delivered Logs for next next 20 TB
			Metric for the first 10000
		**/

		// ASSUMPTION: on tiered, price always decreases for higher tiers
		return Object.fromEntries(
			Object.keys(opts).map(prefix => {
				const outputKey = opts[prefix];

				return [
					outputKey,
					Object.keys(data).filter(k => k.startsWith(prefix)).map(key => {
						// get all the numbers and then the magnitude
						const matches = key.match(/(\d+(\s+\d+)*)(\s+)?(\w+)?/);
						if (!matches) { throw 'invalid regex for pricing info ' + key; }

						const num = Number(matches[1].split(/\s+/g).join());
						const mag = matches[4] || '';

						const full = (mag in multiples) ? num * multiples[mag] : num;
						const last = key.toLowerCase().includes(' over ');

						return {
							rate: Number(data[key].price),
							...(last ? {} : { count: full }),
						}
					}).sortNumBy(e => e.count),
				];
			})
		);
	}

	private parseLevels(data: any, opts: Options): LevelsPrices {
		/**
			Turn an object of these:
				"Caching Memory Size 0 5": {
					"rateCode":"UFRGH673BJRGJC4Y.JRTCKXETXF.6YS6EN2CT7",
					"price":"0.0200000000"
				},
				"Caching Memory Size 1 6": {
					"rateCode":"7UJYSMFMVSHUXN6C.JRTCKXETXF.6YS6EN2CT7",
					"price":"0.0380000000"
				},
				"Caching Memory Size 118": {
					"rateCode":"BBNKA8FDGUMXM3BW.JRTCKXETXF.6YS6EN2CT7",
					"price":"1.9000000000"
				},
				"Caching Memory Size 13 5": {
					"rateCode":"AEN9QYJ3QX7VK2U3.JRTCKXETXF.6YS6EN2CT7",
					"price":"0.2500000000"
				},
				"Caching Memory Size 237": {
					"rateCode":"TC9P6VCXAQHBMQVB.JRTCKXETXF.6YS6EN2CT7",
					"price":"3.8000000000"
				},
				"Caching Memory Size 28 4": {
					"rateCode":"7M9FTG6Y8AAMRKN8.JRTCKXETXF.6YS6EN2CT7",
					"price":"0.5000000000"
				},
				"Caching Memory Size 58 2": {
					"rateCode":"CFDGB5YUATFF5A7Y.JRTCKXETXF.6YS6EN2CT7",
					"price":"1.0000000000"
				},
				"Caching Memory Size 6 1": {
					"rateCode":"4FK4TYR6VUG3K5ZH.JRTCKXETXF.6YS6EN2CT7",
					"price":"0.2000000000"
				},

			into these:
				"Memory": {
					"0.5": 0.0200000000,
					"1.6": 0.0380000000,
					"6.1": 0.2000000000,
					"13.5": 0.2500000000,
					"28.4": 0.5000000000,
					"58.2": 1.0000000000,
					"118": 1.9000000000,
					"237": 3.8000000000,
				}
		**/

		return Object.fromEntries(
			Object.keys(opts).map(prefix => {
				const outputKey = opts[prefix];

				return [
					outputKey,
					Object.fromEntries(
						// find all matching keys, and convert their level (extracted from key name) and rate
						Object.keys(data).filter(k => k.startsWith(prefix)).map(key => {
							return [
								// LEVEL: take up to the last 2 elements, check they're numeric, and make them a single decimal
								key.split(' ').reverse().slice(0,2).filter(k => !isNaN(Number(k))).reverse().join('.'),
								// RATE
								Number(data[key].price),
							];
						})
					),
				];
			})
		);
	}

	forRegion(region: string): Promise<RegionPrices> {
		return this.promise.then(data => data[region]);
	}
}

export interface PricingOpt {
	url: string

	/* Name -> id */
	simple: Options;
	tiered: Options;

	/* Begins With -> id */
	levels: Options;
}
export type PricingOpts = PricingOpt[];
export type Options = {[key: string]: string};

export interface PricingData {
	[region: string]: RegionPrices
}

export interface RegionPrices {
	simple: SimplePrices
	tiered: TieredPrices
	levels: LevelsPrices
}

export interface SimplePrices {
	[lineItem: string]: number
}

export interface TieredPrices {
	[lineItem: string]: Tier[]
}

export interface Tier {
	count?: number
	rate: number
}

export interface LevelsPrices {
	[lineItem: string]: Levels
}

export interface Levels {
	[size: string]: number
}
