# Project: Question Rotation System

## Overview

This Question Rotation System is designed to assign and rotate questions for different global 
regions, such as Singapore and the US, on a weekly cycle. Each region receives a unique 
question per cycle, which is updated weekly. The application is built with NestJS and 
leverages AWS services to handle deployment, scaling, and scheduled tasks.

The architecture currently includes core services for questions, authentication (auth), 
and user management. It’s built to be extensible, allowing for more microservices to be 
added in the future. As the number of services grows, we plan to enhance the architecture 
to support scalability and improved management.

## Table of Contents

1. [Architecture](#architecture)
2. [Technologies](#technologies)
3. [Local Setup](#local-setup)
4. [AWS Deployment](#aws-deployment)
5. [Code Structure](#code-structure)
6. [Environment Variables](#environment-variables)
7. [Improvement Plans](#improvement-plans)
8. [JSDoc Style Guide](#jsdoc-style-guide)
9. [Resources](#resources)

## Architecture

The application uses NestJS for backend logic, with each microservice (e.g., /question, 
/auth, /user) deployed as an individual container on AWS ECS Fargate. AWS Lambda is used to 
handle scheduled tasks, such as updating the question cycle weekly. Amazon RDS (PostgreSQL) 
serves as the database, and Redis is used for caching to enhance performance.

## Why This Architecture?
Currently, this architecture is optimized to handle three main services, allowing each to 
run in isolation for better fault tolerance and scalability. This setup ensures that each 
service can scale independently based on demand, but as we add more services (e.g., if we 
reach eight or more microservices), we’ll adjust the design for improved scalability and 
manageability.

### Key Components

- **NestJS** Backend framework used for business logic and routing.
- **Redis** for caching question data per region
- **TypeORM** Database ORM for data management.
- **AWS Lambda** Handles scheduled tasks like weekly question rotation.
- **AWS ECS** for containerized microservices deployment, including separate services for /question, /auth, and /user, with an ECR repository for each service.
- **AWS RDS (PostgreSQL)** as the primary database
- **Amazon API Gateway** for routing and integrating with ECS services.

### Service flow and Decision Rationale

1. **Separate ECS Services**: Each microservice (e.g., /question, /auth, /user) is isolated 
into its own ECS Fargate service, promoting a modular microservices architecture.

2. **Database Connectivity**: Each ECS service has its own task definition with environment 
variables that allow communication with RDS and Redis.

3. **Redis Cache and Database**: Redis stores frequently accessed data, reducing database 
load. If data is missing in Redis, the service fetches it directly from the database.

## How It Works

1. **Weekly Question Rotation** AWS Lambda triggers a scheduled job via EventBridge every Monday 
at 7 PM Singapore Time, ensuring each region receives a new question for the week.

2. **Microservices on ECS** The /question, /auth, and /user services are deployed as Fargate tasks,
enabling independent scaling and management.

3. **Caching with Redis** Redis stores frequently accessed questions, reducing database load.

## Technologies

- **Node.js** (Runtime)
- **NestJS** (Backend Framework)
- **AWS Services** (RDS, Lambda, ECS, CloudWatch, EventBridge, CDK)
- **Node.js** (Runtime)
- **NestJS** (Backend Framework)
- **TypeORM** (ORM)
- **PostgreSQL** (Database)
- **Redis** (In-memory Cache)
- **AWS Services** (ECR, ECS, RDS, Lambda, CloudWatch, EventBridge, API Gateway, CDK)


## Local Setup

### Prerequisites

1. **Node.js** and **npm** (Ensure Node.js is v14 or higher)
2. **Docker** for local containerization
3. AWS CLI configured with appropriate access

### Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>

2. **Install Dependencies**:
    ```bash
    npm install

3. **Configure environment variables**: Copy .env.example to .env and fill in the values 
(see Environment Variables section).

4. **Run the application**
    ```bash
   npm run start:dev
   
### AWS Deployment
    
1. We use AWS CDK for deploying the application components, automating the infrastructure 
setup, and enabling seamless scaling. The application image is pushed to Amazon ECR, and 
ECS Fargate handles containerized service deployment.

### Steps

1. **Build and push Docker Image**
    ```bash
    docker build -t <ecr-repository-name> .
    docker tag <local-image-name> <ecr-repository-url>
    docker push <ecr-repository-url>
   
2. **Deploy with AWS CDK**
    ```bash
    cdk deploy

3. **Scheduled Lambda: AWS EventBridge triggers the Lambda to update the weekly cycle on 
Mondays at 7 PM Singapore Time.**

   **Code Structure**

   - src/
        - app.module.ts - Main application module
        - auth
            - auth.controller.ts
            - auth.module.ts
            - auth.service.ts
        - common
            - decorators
                - get-current-user-id.decorator.ts
                - get current-user.decorator.ts
                - index.ts
                - public.decorator.ts
                - team-role.decorator.ts
            - guards
                - at.guard.ts
                - index.ts
                - role.guard.ts
                - rt.guard.ts
        - config
            - env.config.ts
        - database 
            - dtos
                - account.dto.ts
                - index.ts
                - question.dto.ts
                - update-user.dto.ts
            - entities
                - Account.entity.ts
                - index.ts
                - question.entity.ts
            - interfaces
                - account.interface.ts
                - index.ts
                - permissions.interface.ts
                - question-cache.interface.ts
            - postgres
                - postgres.provider.ts
            - connection.ts
        - identifier
            - identifier.module.ts
            - identifier.service.ts
        - mailservice
            - emailTemplates
                - index.ts
            - mailservice.controller.ts
            - mailservice.module.ts
            - mailservice.service.ts
        - migrations
            - 1635000000000-CreateQuestionsTable.ts
        - question
            - question.controller.ts
            - question.module.ts
            - question.service.ts
        - user
            - user.controller.ts
            - user.module.ts
            - user.service.ts
        - utils
            - error-manager.ts
            - index.ts
            - pagination.ts
            - password-manager.ts
            - quesry.ts
        - app.controller.ts
        - app.module.ts
        - app.service.ts
        - main.ts
    
4. **Environment Variables**
   
     - These environment variables are required to run the application both locally and on AWS:
     - DB_HOST: Database host 
     - DB_PORT: Database port 
     - DB_USERNAME: Database username 
     - DB_PASSWORD: Database password 
     - DB_NAME: Database name 
     - REDIS_HOST: Redis host (for caching)
     - REDIS_PORT: Redis port
     - JWT_ACCESS_TOKEN_SECRET 
     - JWT_ACCESS_TOKEN_EXPIRES 
     - JWT_REFRESH_TOKEN_SECRET
     - JWT_REFRESH_TOKEN_EXPIRES
     - JWT_VERIFICATION_TOKEN_EXPIRES
     - JWT_VERIFICATION_TOKEN_SECRET
     - AWS_REGION 
     - AWS_ACCESS_KEY_ID
     - AWS_ACCESS_KEY_SECRET
     - AWS_SENDER_EMAIL
    
5. **Improvement Plans**

    As we anticipate growth in the number of services (e.g., beyond /question, /auth, 
    and /user), we plan to adapt the architecture as follows:

    - **Enhanced API Gateway Routing**: When the number of services increases (e.g., beyond 
    /question, /auth, /user), consider refining API Gateway setup to streamline routing 
    and load balancing.

   - **Distributed ECR Repositories**: Each service currently has a dedicated ECR repository.
   This approach will be maintained but can be optimized by managing shared or versioned 
   repositories if deployment complexity grows. This structure aligns well with the 
   microservices model and enhances modularity.

   - **Centralized Service Discovery and Load Balancing**:
     - With more than three services, maintaining inter-service communication directly can 
     become complex. Consider implementing AWS Service Discovery or using API Gateway as a 
     central routing layer for improved manageability.
     - A dedicated load balancer for each service or a single ALB with targeted listeners 
     can help streamline routing and prevent traffic bottlenecks.

   - **Autoscaling Policies**:
     - Ensure each service has autoscaling policies based on CPU or memory utilization. 
        This setup, already applied to the current services, will need consistent monitoring 
        and adjustment with additional services. 
     - Amazon CloudWatch and AWS CloudFormation can automate monitoring, adjusting 
     thresholds to optimize performance.

   - **Enhanced Caching Strategies**: 
     - Expanding the Redis setup to a cluster or using Amazon ElastiCache will improve resilience
     and scaling if cache demands increase. 
     - Consider using Redis for session management and broader caching across microservices 
     to reduce latency and load on the database.

   - **Future Database Partitioning**: As the number of services grows, database load can 
   increase. Planning for database partitioning (e.g., through Amazon RDS read replicas or 
   sharding) may be beneficial to prevent scaling limitations.

6. **JSDoc Styled Guide**

All methods and classes should use JSDoc comments for maintainability and readability. 
This is crucial for understanding complex services and for junior developers to easily 
navigate the code.

**Example of JSDoc comment**
    /**
    * Daily cron job to refresh the cache.
    * @returns {Promise<void>}
    */
    async handleDailyQuestionUpdate() {
        await this.warmupCache();
    }

7. **Resources**

- **AWS CDK Documentation** - AWS CDK guide for defining cloud infrastructure.
- **NestJS Documentation** - NestJS documentation for framework-specific details.
- **TypeORM Documentation** - ORM documentation for database interactions.
- **Redis Documentation** - Redis for caching implementation.
- **Docker Documentation** - Docker for containerization
