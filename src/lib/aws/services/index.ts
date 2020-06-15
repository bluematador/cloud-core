import * as ApiGateway from './apigateway';
import * as CloudWatch from './cloudwatch';
import * as DynamoDB from './dynamodb';
import * as Kinesis from './kinesis';
import * as Lambda from './lambda';
import * as SNS from './sns';

export { default as ApiGateway } from './apigateway';
export { default as CloudWatch } from './cloudwatch';
export { default as DynamoDB } from './dynamodb';
export { default as Kinesis } from './kinesis';
export { default as Lambda } from './lambda';
export { default as SNS } from './sns';

export const Info = [
	ApiGateway.Info,
	CloudWatch.Info,
	DynamoDB.Info,
	Kinesis.Info,
	Lambda.Info,
	SNS.Info,
];
