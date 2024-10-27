import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';

export class NestjsCdkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create a VPC - Virtual Private Cloud
        const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

        // Create an ECS Cluster
        const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

        // Create an ECR Repository
        const repository = new ecr.Repository(this, 'NestjsRepository',
            {
                repositoryName: ""
            });

        // Define Task Definition for Fargate
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            memoryLimitMiB: 1024, // memory allocation
            cpu: 512, // CPU allocation
        });

        // Add Container to Task Definition
        const container = taskDefinition.addContainer('nestjsContainer', {
            image: ecs.ContainerImage.fromEcrRepository(repository),
            memoryLimitMiB: 512,
            environment: { NODE_ENV: 'production' },
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'nestjs',
                logGroup: new logs.LogGroup(this, 'LogGroup', {
                    logGroupName: '/ecs/nestjs-app',
                    retention: logs.RetentionDays.ONE_WEEK,
                }),
            }),
        });

        container.addPortMappings({ containerPort: 3000 });

        // Create Fargate Service
        const fargateService = new ecs.FargateService(this, 'Service', {
            cluster,
            taskDefinition,
            desiredCount: 2, //start with two tasks to handle initial load
        });

        // Set up Auto Scaling
        const scaling = fargateService.autoScaleTaskCount({ maxCapacity: 10 }); //increased maximum capacity
        scaling.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 50 // scale based on CPU usage
        });
        scaling.scaleOnMemoryUtilization('MemoryScaling', { // New memory scaling policy
            targetUtilizationPercent: 70, // Scale based on memory usage
        });
    }
}
