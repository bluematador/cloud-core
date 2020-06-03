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
}

const regionLookup = Object.fromEntries(Object.entries(regions).map(([key, value]) => [value, key]));
const corsProxy = 'https://cors-anywhere.herokuapp.com/';

export default abstract class Pricing {
	protected promise: Promise<PricingData>;

	constructor(url: string, nameLookup: {[key: string]: string}) {
		const proxy = corsProxy + url.replace('https://', '').replace('http://', '');

		this.promise = Http.get(proxy).then(response => {
			const formatted: PricingData = {};

			for (const key in response.body['regions']) {
				if (key in ignore) {
					continue;
				}

				const region = regionLookup[key];
				if (region === undefined) {
					console.log('unknown region in pricing', key, url);
					continue;
				}
				formatted[region] = {};

				const lineItems = response.body['regions'][key];
				for (const key in lineItems) {
					const name = nameLookup[key] || key;
					formatted[region][name] = Number(lineItems[key]['price']);
				}
			}

			return formatted;
		});
	}

	forRegion(region: string): Promise<RegionPrices> {
		return this.promise.then(data => data[region]);
	}
}

export interface PricingData {
	[region: string]: RegionPrices
}

export interface RegionPrices {
	[lineItem: string]: number
}
