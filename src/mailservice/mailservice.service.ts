import { ErrorHandler } from '@/utils';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import Handlebars from 'handlebars';
import {PromiseResult} from "aws-sdk/lib/request";

@Injectable()
export class MailService {
    private sesClient: AWS.SES;
    private sqsClient: AWS.SQS;

    constructor(private configService: ConfigService) {
        // Update the AWS SDK configuration before creating clients
        AWS.config.update({
            region: this.configService.get<string>('AWS_REGION'),
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
            },
        });
        // Create AWS clients after setting the configuration
        this.sesClient = new AWS.SES();
        this.sqsClient = new AWS.SQS();
    }

    /**
     * Sends a message to recipient email.
     *
     * @param payload
     * @return {Promise<PromiseResult<AWS.SES.SendEmailResponse, AWS.AWSError>>} - A promise that resolves when the message is sent successfully.
     */
    async sendEmail(payload: {
        to: string;
        subject: string;
        template: string;
        data: Record<string, string>;
    }): Promise<PromiseResult<AWS.SES.SendEmailResponse, AWS.AWSError>> {
        const { data, subject, to, template } = payload;
        const Template = Handlebars.compile(template);
        try {
            const params = {
                Destination: { ToAddresses: [to] },
                Message: {
                    Body: { Html: { Charset: 'UTF-8', Data: Template(data) } },
                    Subject: { Data: subject },
                },
                Source: `<${this.configService.get('AWS_SENDER_EMAIL')}>`,
                ReplyToAddresses: [this.configService.get('AWS_SENDER_EMAIL')],
            };

            const sendPromise = this.sesClient.sendEmail(params).promise();

            return await sendPromise;
        } catch (error) {
            ErrorHandler.handleError('MailService.sendEmail', error);
        }
    }

    /**
     * Sends a message to an SQS queue.
     *
     * @param {string} queueUrl - The URL of the SQS queue.
     * @param {string} message - The message to send.
     * @return {Promise<void>} - A promise that resolves when the message is sent successfully.
     */
    async sendMessageToSQS(queueUrl: string, message: string) {
        const params: AWS.SQS.Types.SendMessageRequest = {
            QueueUrl: queueUrl,
            MessageBody: message,
        };

        try {
            await this.sqsClient.sendMessage(params).promise();
        } catch (error) {
            ErrorHandler.handleError('MailService.sendMessageToSQS', error);
        }
    }
}
