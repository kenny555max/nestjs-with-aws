import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid4';

@Injectable()
export class AwsS3Service {
    private s3: AWS.S3;
    private readonly bucketName = process.env.AWS_BUCKET_NAME;
    private readonly cloudFrontUrl = process.env.CLOUDFRONT_URL;

    constructor() {
        this.s3 = new AWS.S3({
            region: process.env.AWS_REGION,
        });
    }

    /**
     * Upload an image to the configured S3 bucket.
     *
     * @param {Express.Multer.File} file - The image file to upload.
     * @returns The URL of the uploaded image, accessible via CloudFront.
     */
    async uploadImage(file: Express.Multer.File): Promise<string> {
        const key = `users/${uuid()}-${file.originalname}`;
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ACL: 'public-read',
        };

        await this.s3.upload(params).promise();

        return `${this.cloudFrontUrl}/${key}`;
    }
}
