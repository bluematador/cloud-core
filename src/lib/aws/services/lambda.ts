import Account from '../account';
import AWS from 'aws-sdk';
import RegionWorker from '../region-worker';
import { RegionalService } from '../service';

// https://docs.aws.amazon.com/general/latest/gr/lambda-service.html
const supportedRegions = [
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
];

export default class LambdaService extends RegionalService<LambdaWorker> {
	constructor(readonly account: Account) {
		super(supportedRegions);
	}

	protected createRegion(region: string): LambdaWorker {
		return new LambdaWorker(this, region);
	}
}

class LambdaWorker extends RegionWorker {
	constructor(readonly service: LambdaService, readonly region: string) {
		super();
	}

	fillQueue(): void {
		this.enqueue(50, () => new Promise((resolve, reject) => {
			setTimeout(() => {
				console.log(50, this.region, new Date());
				resolve();
			}, 3000);
		}));
		this.enqueue(0, () => new Promise((resolve, reject) => {
			setTimeout(() => {
				console.log(0, this.region, new Date());
				resolve();
			}, 3000);
		}));
		this.enqueue(100, () => new Promise((resolve, reject) => {
			setTimeout(() => {
				console.log(100, this.region, new Date());
				resolve();
			}, 3000);
		}));
	}

	doPurge(): void {
		throw 'not done';
	}
}



// 		this.$store.direct.state.credentials.all.filter(c => c.enabled).forEach(cred => {
// 			const awsCredentials = new AWS.Credentials(cred.access, cred.secret);

// 			Object.keys(regions).forEach(region => {
// 				console.log(cred, region);
// 				const service = new AWS.Lambda({
// 					apiVersion: '2015-03-31',
// 					maxRetries: 5,
// 					credentials: awsCredentials,
// 					region: region,
// 				});

// 				service.listFunctions({}, (err, data) => {
// 					this.stuff.push(cred.name + ' ' + region + ' ' + (err || JSON.stringify(data)));
// 				});
// 			});
// 		})
