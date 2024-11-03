import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import Redis from 'ioredis';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import {Repository} from "aws-cdk-lib/aws-ecr";

interface MicroservicesStackProps extends cdk.StackProps {
  environment: string;
  vpcCidr: string;
  domain: string;
  hostedZoneId: string;
}

export class QuestionAssignmentArchitectureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MicroservicesStackProps) {
    super(scope, id, props);

    // VPC Configuration
    const vpc = new ec2.Vpc(this, 'MicroservicesVpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
      maxAzs: 2,
      natGateways: props.environment === 'production' ? 2 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const {redis, redisSecurityGroup} = await this.redisSetup(props, vpc, ['SG', 'US'], new Date("11/11/2024"));

    const {
        questionUpdatesTopic,
        questionsQueue,
        deadLetterQueue,
        questionAssignmentLambda
    } = this.questionAssignmentLambdaFunc(props, redis, vpc, redisSecurityGroup);

    // Create databases for each service
    const authDb = this.createDatabase('Auth', props, vpc);
    const userDb = this.createDatabase('User', props, vpc);
    const questionsDb = this.createDatabase('Questions', props, vpc);

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'MicroservicesCluster', {
      vpc,
      containerInsights: true,
    });

    const authRepo = this.createRepository('Auth', props);
    const userRepo = this.createRepository('User', props);
    const questionsRepo = this.createRepository('Questions', props);

    // Enhanced Questions Service Configuration
    const questionsService = this.createEnhancedQuestionsService(
        'Questions',
        vpc,
        redis,
        questionUpdatesTopic,
        questionsQueue,
        props.environment,
        questionsDb,
        questionsRepo,
        props
    );

    questionsQueue.grantConsumeMessages(questionsService.taskDefinition.taskRole);
    redisSecurityGroup.addIngressRule(
        questionsService.service.connections.securityGroups[0],
        ec2.Port.tcp(6379),
        'Allow questions service to access Redis'
    );

    // CloudWatch Alarms for monitoring
    this.createMonitoringAlarms(questionsService, questionAssignmentLambda, deadLetterQueue);

    // Create services with different configurations
    const authService = this.createFargateService(
        'Auth',
        authRepo,
        authDb,
        3000,
        256,
        512,
        props.environment === 'production' ? 2 : 1,
        props.environment === 'production' ? 4 : 2,
        undefined,
        props,
        cluster
    );

    const userService = this.createFargateService(
        'User',
        userRepo,
        userDb,
        3000,
        256,
        512,
        props.environment === 'production' ? 2 : 1,
        props.environment === 'production' ? 4 : 2,
        undefined,
        props,
        cluster
    );

    /**
    const questionsService = this.createFargateService(
        'Questions',
        questionsRepo,
        questionsDb,
        3000,
        512,
        1024,
        props.environment === 'production' ? 4 : 2,
        props.environment === 'production' ? 8 : 4,
        {
          REDIS_ENDPOINT: redis.attrPrimaryEndPointAddress,
          REDIS_PORT: redis.attrPrimaryEndPointPort,
        },
        props,
        cluster
    );
     */

    // API Gateway for routing
    const api = new apigw.RestApi(this, 'MicroservicesApi', {
      restApiName: `microservices-api-${props.environment}`,
      deployOptions: {
        stageName: props.environment,
      },
    });

    // Create API Gateway integrations
    const createApiIntegration = (
        service: ecs_patterns.ApplicationLoadBalancedFargateService,
        path: string
    ) => {
      const integration = new apigw.HttpIntegration(
          `http://${service.loadBalancer.loadBalancerDnsName}/${path}`
      );

      const resource = api.root.addResource(path);
      resource.addMethod('ANY', integration);

      // Add proxy resource for sub-paths
      const proxyResource = resource.addResource('{proxy+}');
      proxyResource.addMethod('ANY', integration);
    };

    createApiIntegration(authService, 'auth');
    createApiIntegration(userService, 'user');
    createApiIntegration(questionsService, 'questions');

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });

    new cdk.CfnOutput(this, 'AuthServiceUrl', {
      value: authService.loadBalancer.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, 'UserServiceUrl', {
      value: userService.loadBalancer.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, 'QuestionsServiceUrl', {
      value: questionsService.loadBalancer.loadBalancerDnsName,
    });
  }

  // Create ECR repositories for each service
  private createRepository (serviceName: string, props: MicroservicesStackProps) {
    return new ecr.Repository(this, `${serviceName}Repo`, {
      repositoryName: `${serviceName.toLowerCase()}-service-${props.environment}`,
      removalPolicy: props.environment === 'production'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          maxImageCount: 5,
          description: 'Only keep 5 images',
        },
      ],
    });
  };

  private createFargateService (
      serviceName: string,
      repository: ecr.Repository,
      database: rds.DatabaseInstance,
      port: number,
      cpu: number,
      memory: number,
      desiredCount: number,
      maxCapacity: number,
      environment: Record<string, string> = {},
      props: MicroservicesStackProps,
      cluster: cdk.aws_ecs.Cluster
  ){
    const taskRole = new iam.Role(this, `${serviceName}TaskRole`, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
        this,
        `${serviceName}TaskDef`,
        {
          memoryLimitMiB: memory,
          cpu: cpu,
          taskRole,
        }
    );

    //const asset = new ecrAssets.DockerImageAsset(
    //    this,
    //    `${serviceName}Image`,
    //    {
    //      directory: `../${serviceName.toLowerCase()}-service/`,
    //    }
    //);

    const container = taskDefinition.addContainer(
        `${serviceName}Container`,
        {
          //image: ecs.ContainerImage.fromDockerImageAsset(asset),
          image: ecs.ContainerImage.fromEcrRepository(repository),
          memoryLimitMiB: 1024,
          environment: {
            NODE_ENV: props.environment,
            DB_HOST: database.instanceEndpoint.hostname,
            DB_PORT: '5432',
            DB_NAME: serviceName.toLowerCase(),
            ...environment,
          },
          logging: ecs.LogDrivers.awsLogs({
            streamPrefix: serviceName,
            logGroup: new logs.LogGroup(this, `${serviceName}-LogGroup`, {
              logGroupName: `${serviceName}-log`,
              retention: logs.RetentionDays.ONE_WEEK,
            }),
          }),
        }
    );

    container.addPortMappings({
      containerPort: port,
    });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        `${serviceName}Service`,
        {
          cluster,
          taskDefinition,
          publicLoadBalancer: true,
          desiredCount: desiredCount,
          listenerPort: 80,
          targetProtocol: ecs.AppProtocol,
          healthCheckGracePeriod: cdk.Duration.seconds(60),
        }
    );

    const scaling = service.service.autoScaleTaskCount({
      maxCapacity: maxCapacity,
      minCapacity: desiredCount,
    });

    scaling.scaleOnCpuUtilization(`${serviceName}CpuScaling`, {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    return service;
  };

  private createEnhancedQuestionsService(
      serviceName: string,
      vpc: ec2.Vpc,
      redis: elasticache.CfnReplicationGroup,
      topic: sns.Topic,
      queue: sqs.Queue,
      environment: string,
      database: rds.DatabaseInstance,
      repository: ecr.Repository,
      props: MicroservicesStackProps
  ): ecs_patterns.ApplicationLoadBalancedFargateService {
    //This role will grant permissions for the service to access other AWS resources, such as SNS and SQ
    const taskRole = new iam.Role(this, `${serviceName}TaskRole`, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    //Fargate task definition, which specifies the memory and CPU allocation based on the environment
    const taskDefinition = new ecs.FargateTaskDefinition(this, `${serviceName}TaskDef`, {
      memoryLimitMiB: environment === 'production' ? 4096 : 2048,
      cpu: environment === 'production' ? 2048 : 1024,
      taskRole,
    });

    // Add permissions for SNS and SQS
    //Grants permissions to the ECS task role so it can publish messages to SNS and consume messages from SQS
    topic.grantPublish(taskRole);
    queue.grantConsumeMessages(taskRole);

    const container = taskDefinition.addContainer(`${serviceName}Container`, {
      //image: ecs.ContainerImage.fromAsset(path.join(__dirname, `../${serviceName.toLowerCase()}-service`)),
      image: ecs.ContainerImage.fromEcrRepository(repository),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: serviceName }),
      environment: {
        REDIS_HOST: redis.attrPrimaryEndPointAddress,
        REDIS_PORT: redis.attrPrimaryEndPointPort,
        NODE_ENV: props.environment,
        DB_HOST: database.instanceEndpoint.hostname,
        DB_PORT: '5432',
        DB_NAME: serviceName.toLowerCase(),
        SNS_TOPIC_ARN: topic.topicArn,
        SQS_QUEUE_URL: queue.queueUrl,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    //The load balancer uses this port to route traffic to the container, enabling user requests to reach the service.
    container.addPortMappings({
      containerPort: 3000,
    });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `${serviceName}Service`, {
      vpc,
      taskDefinition,
      publicLoadBalancer: true,
      desiredCount: environment === 'production' ? 4 : 2, //Number of running instances based on the environment (4 for production, 2 otherwise)
      maxHealthyPercent: 200,
      minHealthyPercent: 50,
      healthCheckGracePeriod: cdk.Duration.seconds(60), //Allows sufficient time for the container to start before checking its health
    });

    // Configure auto-scaling
    //This scaling ensures that the service can handle varying loads, dynamically adjusting capacity to optimize resource usage and performance.
    const scaling = service.service.autoScaleTaskCount({
      maxCapacity: environment === 'production' ? 10 : 4,
      minCapacity: environment === 'production' ? 4 : 2,
    });

    //automatically add more instances during high demand and reduce instances during lower demand,
    // maintaining efficiency and performance.
    scaling.scaleOnCpuUtilization(`${serviceName}CpuScaling`, {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    //service to scale according to traffic, ensuring that it meets demand without over-provisioning,
    // which is particularly useful for scenarios where load can vary significantly.
    scaling.scaleOnRequestCount(`${serviceName}RequestScaling`, {
      requestsPerTarget: environment === 'production' ? 1000 : 500,
      //targetGroup: service
    });

    return service;
  }

  private createDatabase (
      serviceName: string,
      props: MicroservicesStackProps,
      vpc: cdk.aws_ec2.Vpc
  ) {
    //database security group
    const dbSecurityGroup = new ec2.SecurityGroup(
        this,
        `${serviceName}DbSecurityGroup`,
        {
          vpc,
          description: `Security group for ${serviceName} RDS instance`,
          allowAllOutbound: true,
        }
    );

    // DB secret manager
    const credentials = new secretsmanager.Secret(
        this,
        `${serviceName}DBCredentials`,
        {
          generateSecretString: {
            secretStringTemplate: JSON.stringify({
              username: `${serviceName.toLowerCase()}admin`
            }),
            generateStringKey: 'password',
            excludePunctuation: true,
          },
        }
    );

    return new rds.DatabaseInstance(this, `${serviceName}Database`, {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
      instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          props.environment === 'production'
              ? ec2.InstanceSize.SMALL
              : ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(credentials),
      multiAz: props.environment === 'production',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      backupRetention: cdk.Duration.days(
          props.environment === 'production' ? 7 : 1
      ),
      deleteAutomatedBackups: true,
      removalPolicy: props.environment === 'production'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      publiclyAccessible: false,
    });
  };

  private totalQuestions = 100;

  // Helper function to calculate the current question index for the cycle
  private getQuestionIndex(cycleStartDate: Date): number {
    const currentWeek = Math.floor((Date.now() - cycleStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return currentWeek % this.totalQuestions;
  }

  // Helper function to generate region-specific Redis keys
  private getRegionQuestionKey(region: string): string {
    return `questions:${region}:current`;
  }

  //Redis Initialization for Weekly Rotation Storage
  private async initializeRegionQuestions(redisClient: Redis, regions: string[], cycleStartDate: Date) {
    for (const region of regions) {
      const questionIndex = this.getQuestionIndex(cycleStartDate);
      const questionId = this.getQuestionIdForRegionAndIndex(region, questionIndex); // Fetches question ID for the specific region and index
      const regionKey = this.getRegionQuestionKey(region);

      await redisClient.set(regionKey, questionId, 'EX', 7 * 24 * 60 * 60); // Expires after a week
    }
  }

  private getQuestionIdForRegionAndIndex(region: string, index: number): number {
    interface QuestionProps {
      Singapore: number[];
      US: number[];
    }

    // Placeholder for actual logic that fetches a question ID based on region and index
    const questions: QuestionProps = {
      'Singapore': [1, 2, 3, 4, 5],
      'US': [6, 7, 8, 9, 10]
    };
    return questions[region as keyof QuestionProps][index % questions[region as keyof QuestionProps].length];
  }

  private async redisSetup(
      props: MicroservicesStackProps,
      vpc: cdk.aws_ec2.Vpc,
      regions: string[],
      cycleStartDate: Date
  ){
    // Redis for Questions Service Caching
    //keeping question data secure and preventing unauthorized access
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis cluster',
      allowAllOutbound: true,
    });

    //keeps cached question data and region-based responses hidden from external networks
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
        this,
        'RedisSubnetGroup',
        {
          subnetIds: vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          }).subnetIds,
          description: 'Subnet group for Redis cluster',
        }
    );

    // Upgraded Redis instance for high-intensity question rotation
    const redis = new elasticache.CfnReplicationGroup(this, 'QuestionsRedis', {
      replicationGroupDescription: 'Redis cluster for questions service',
      engine: 'redis',
      cacheNodeType: props.environment === 'production'
          ? 'cache.r6g.large'  // Upgraded for production
          : 'cache.t3.medium', // Upgraded for development
      numCacheClusters: props.environment === 'production' ? 2 : 1,
      automaticFailoverEnabled: props.environment === 'production',
      multiAzEnabled: props.environment === 'production',
      securityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    /**
     const redis = new elasticache.CfnCacheCluster(this, 'QuestionsRedis', {
     engine: 'redis',
     cacheNodeType: props.environment === 'production'
     ? 'cache.t3.medium'
     : 'cache.t3.micro',
     numCacheNodes: 1,
     vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
     cacheSubnetGroupName: redisSubnetGroup.ref,
     });
     */

    // Connect to Redis and initialize region-specific questions
    const redisClient = new Redis({
      host: redis.attrPrimaryEndPointAddress,
      port: 6379,
    });
    await this.initializeRegionQuestions(redisClient, regions, cycleStartDate);

    return { redis, redisSubnetGroup, redisSecurityGroup, redisClient };
  }

  private questionAssignmentLambdaFunc(
      props: MicroservicesStackProps,
      redis: cdk.aws_elasticache.CfnReplicationGroup,
      vpc: cdk.aws_ec2.Vpc,
      redisSecurityGroup: cdk.aws_ec2.SecurityGroup
  ){
    // Question Assignment Lambda Function
    const questionAssignmentLambda = new lambda.Function(this, 'QuestionAssignmentLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/question-assignment')),
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5),
      environment: {
        REDIS_ENDPOINT: redis.attrPrimaryEndPointAddress,
        REDIS_PORT: redis.attrPrimaryEndPointPort,
        ENVIRONMENT: props.environment,
        REGION_CONFIG: JSON.stringify({
          'SG': { startQuestionId: 1, endQuestionId: 5 },
          'US': { startQuestionId: 6, endQuestionId: 10 }
        })
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });

    // SNS Topic for Question Updates
    const questionUpdatesTopic = new sns.Topic(this, 'QuestionUpdatesTopic', {
      displayName: 'Question Updates Notification'
    });

    // Dead Letter Queue for failed question assignments
    const deadLetterQueue = new sqs.Queue(this, 'QuestionsDLQ', {
      retentionPeriod: cdk.Duration.days(14),
    });

    // Main Queue for question assignments with DLQ
    const questionsQueue = new sqs.Queue(this, 'QuestionsQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3
      }
    });

    // Schedule for question rotation
    const rotationSchedule = new events.Rule(this, 'QuestionRotationSchedule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '0',
        weekDay: 'SUN'
      }),
      description: 'Weekly question rotation trigger'
    });

    rotationSchedule.addTarget(new targets.LambdaFunction(questionAssignmentLambda));

    // Add necessary permissions
    questionUpdatesTopic.grantPublish(questionAssignmentLambda);

    return {
      questionUpdatesTopic,
      questionsQueue,
        deadLetterQueue,
        questionAssignmentLambda
    }
  }

  private createMonitoringAlarms(
      questionsService: ecs_patterns.ApplicationLoadBalancedFargateService,
      lambda: lambda.Function,
      dlq: sqs.Queue
  ) {
    // Service Health Alarm
    new cloudwatch.Alarm(this, 'QuestionsServiceHealthAlarm', {
      metric: questionsService.targetGroup.metrics.unhealthyHostCount(),
      threshold: 1,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      alarmDescription: 'Questions service unhealthy hosts',
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    // Lambda Error Alarm
    new cloudwatch.Alarm(this, 'QuestionAssignmentErrorAlarm', {
      metric: lambda.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Question assignment lambda errors',
    });

    // DLQ Message Alarm
    new cloudwatch.Alarm(this, 'QuestionsDLQAlarm', {
      metric: dlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Messages in Questions DLQ',
    });
  }
}
