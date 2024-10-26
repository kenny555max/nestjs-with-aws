#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NestjsCdkStack } from '../lib/nestjs-cdk-stack';

const app = new cdk.App();
new NestjsCdkStack(app, 'NestjsCdkStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
