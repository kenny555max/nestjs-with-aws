import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class QuestionAssignmentArchitectureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    // Create an ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Create an ECR Repository
    const repository = new ecr.Repository(this, 'NestjsRepository');

    // Define Task Definition for Fargate with Increased Resources
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 1024, // Updated memory allocation for high demand
      cpu: 512, // Updated CPU allocation
    });

    // Create a secret for the database password
    const dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: 'dbAdminSecret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dbAdmin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    // Create an RDS instance for Questions and Users
    const dbInstance = new rds.DatabaseInstance(this, 'QuestionDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc, // VPC
      // credentials: rds.Credentials.fromGeneratedSeret('dbAdmin') // Generates a random password
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: 'questiondb',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
    });

    // Add Container to Task Definition
    const container = taskDefinition.addContainer('nestjsContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      memoryLimitMiB: 1024,
      environment: {
        NODE_ENV: 'production',
        DB_ENDPOINT: dbInstance.dbInstanceEndpointAddress, // This gets the actual endpoint
        DB_NAME: 'questiondb',
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'nestjs',
        logGroup: new logs.LogGroup(this, 'LogGroup', {
          logGroupName: '/ecs/my-question-nestjs-app',
          retention: logs.RetentionDays.ONE_WEEK,
        }),
      }),
    });

    container.addPortMappings({ containerPort: 3000 });

    // Create a Fargate Service with ALB
    const fargateService = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: 2,
    });

    // Create an Application Load Balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
    });

    // Define Listener and Target Group for the ALB
    const listener = loadBalancer.addListener('Listener', { port: 80 });
    //For now, a single load balancer with one listener is sufficient considering we have one service
    listener.addTargets('ECS', {
      port: 80,
      targets: [fargateService],
      healthCheck: {
        interval: cdk.Duration.seconds(30), //Interval between health check,
        path: '/health', // The health check endpoint
        timeout: cdk.Duration.seconds(10), // Timeout for each health check
        unhealthyThresholdCount: 2, // Unhealthy threshold
        healthyThresholdCount: 3, // Healthy threshold
      },
    });

    // Grant Access to Load Balancer
    fargateService.connections.allowFrom(loadBalancer, ec2.Port.tcp(80));

    // Enable Auto-Scaling for the Fargate Service
    const scaling = fargateService.autoScaleTaskCount({ maxCapacity: 10 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50, // Scale based on CPU usage
    });
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70, // Scale based on memory usage
    });

    // Create a Lambda function for Question Assignment Logic
    const assignQuestionsLambda = new lambda.Function(this, 'AssignQuestionsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'assignQuestions.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5),
      retryAttempts: 2,
      environment: {
        DB_ENDPOINT: dbInstance.dbInstanceEndpointAddress,
        DB_NAME: 'questiondb',
        REGION_CONFIG: JSON.stringify({
          'SG': { startQuestionId: 1, endQuestionId: 5 },
          'US': { startQuestionId: 6, endQuestionId: 10 }
        }),
        CYCLE_DURATION_DAYS: '7',
        //REDIS_ENDPOINT: redisCluster.clusterEndpoint // Add Redis for caching
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });

    // Define SNS topic
    const questionNotificationTopic = new sns.Topic(this, 'QuestionNotificationTopic', {
      displayName: 'Question Notification Topic',
    });

    // Add SNS Topic ARN as an environment variable for the Lambda function
    assignQuestionsLambda.addEnvironment('SNS_TOPIC_ARN', questionNotificationTopic.topicArn);

    // Grant publish permission to the Lambda function on the SNS topic
    questionNotificationTopic.grantPublish(assignQuestionsLambda);

    // Grant the Lambda function permissions to connect to the RDS database
    dbInstance.grantConnect(assignQuestionsLambda);

    // Create an SQS queue for question assignments
    const questionQueue = new sqs.Queue(this, 'QuestionQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    // Create an SNS topic for notifications
    //const questionNotificationTopic = new sns.Topic(this, 'QuestionNotificationTopic');

    // Subscribe a Lambda function to the SNS topic (to notify users)
    questionNotificationTopic.addSubscription(new snsSubscriptions.LambdaSubscription(assignQuestionsLambda));

    // Create an API Gateway for the NestJS application
    const api = new apigateway.RestApi(this, 'QuestionApi', {
      restApiName: 'Question Service',
    });

    const questions = api.root.addResource('questions');
    questions.addMethod('GET', new apigateway.LambdaIntegration(assignQuestionsLambda));

    // Set up a CloudWatch Event Rule to trigger the Lambda function on a schedule (e.g., every Monday at 7 PM)
    const rule = new events.Rule(this, 'QuestionAssignmentScheduleRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '19', weekDay: 'MON' }),
      description: 'Trigger Lambda every Monday at 7 PM SGT',
    });
    rule.addTarget(new targets.LambdaFunction(assignQuestionsLambda));

    // Add CloudWatch Alarms
    /**
    new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      metric: assignQuestionsLambda.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Alert on question assignment failures'
    });
        */

    // Output the Load Balancer DNS and API Gateway URL
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancer.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });
  }
}
