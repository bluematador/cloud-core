import { Name as ApiGateway } from './apigateway';
import { Name as CloudWatch } from './cloudwatch';
import { Name as DynamoDB } from './dynamodb';
import { Name as Kinesis } from './kinesis';
import { Name as Lambda } from './lambda';

export { default as ApiGateway } from './apigateway';
export { default as CloudWatch } from './cloudwatch';
export { default as DynamoDB } from './dynamodb';
export { default as Kinesis } from './kinesis';
export { default as Lambda } from './lambda';

export const All = [
	ApiGateway,
	// CloudWatch,
	DynamoDB,
	Kinesis,
	Lambda,
];
