// src/lambda/lambda.service.ts
import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class LambdaService {
    private lambda: AWS.Lambda;

    constructor() {
        this.lambda = new AWS.Lambda({
            region: process.env.AWS_REGION,
        });
    }

    async invokeOnboardingLambda(payload: { userId: string; gender: string; }) {
        const params = {
            FunctionName: 'UserOnboardingLambda', // Lambda function name in AWS
            Payload: JSON.stringify(payload),
        };

        const result = await this.lambda.invoke(params).promise();
        return JSON.parse(result.Payload as string);
    }

    //leverage manual trigger while testing for - controlled execution, debug easily
    //would automatically switch to "scheduled trigger" on production
    async invokeWeeklyQuestionsLambda() {
        const params = {
            FunctionName: 'WeeklyQuestionAssignmentLambda',
            Payload: JSON.stringify({}), // No payload needed here
        };

        const result = await this.lambda.invoke(params).promise();
        return JSON.parse(result.Payload as string);
    }
}
