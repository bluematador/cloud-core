import AWS from 'aws-sdk';

export function credentials(account: AccountCredentials): AWS.Credentials {
	return new AWS.Credentials(account.access, account.secret);
}

export async function testCredentials(account: AccountCredentials) {
	const sts = new AWS.STS({
		apiVersion: '2011-06-15',
		credentials: credentials(account),
	});

	return sts.getCallerIdentity().promise();
}

interface AccountCredentials {
	access: string
	secret: string
}
