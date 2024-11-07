# Project: Question Rotation System

## Overview

This project is a dynamic, user-centric application designed with a modular backend 
architecture. It leverages AWS services for efficient and scalable handling of various 
operations, including user onboarding, weekly question assignments, media delivery, and 
secure authentication. Recent updates have optimized data flow, caching, and backend 
infrastructure, making the system more robust and scalable.

## Table of Contents

1. [Architecture](#architecture)
2. [New Features & Improvements](#new-features&improvements)
3. [Setup and Installation](#local-setup)
4. [AWS Deployment](#aws-deployment)
5. [Code Structure](#code-structure)
6. [Environment Variables](#environment-variables)
7. [Usage](#usage)
8. [JSDoc Style Guide](#jsdoc-style-guide)
9. [Resources](#resources)

## Architecture

The backend architecture is built on NestJS and leverages AWS Services to optimize for 
scalability, caching, and efficient handling of user requests.

### Key Components

- **NestJS Controllers and Services**: Modularized to handle specific tasks, such as onboarding,
question assignment, and authentication.
    - **TypeORM** Database ORM for data management.

- **AWS Lambda Functions**: 
  - User Onboarding Lambda: Custom question recommendations for users based on gender and profile data.
  - Weekly Question Assignment Lambda: Distributes weekly questions and manages caching.

- **AWS Services**: 
  - **S3 and CloudFront**: Used for media storage and global delivery with low latency. 
  - **RDS (PostgreSQL)**: Primary data store for user and question data.
  - **Redis Cache**: Caching for onboarding and question assignment data.
  - **SNS and SQS**: Notifications and message queuing for asynchronous processing.
  - **SES**: OTP email verification during the sign-up process.
  - **NestJS** Backend framework used for business logic and routing.
  - **Lambda** Handles scheduled tasks like weekly question rotation.
  - **ECS** for containerized microservices deployment, including separate services for /question, /auth, and /user, with an ECR repository for each service.
  - **API Gateway** for routing and integrating with ECS services.

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



###   New Features and Improvements

1. Enhanced Onboarding Flow
   - Tailored Question Suggestions: Custom question recommendations based on user profile, 
   especially tailored for female users.
   - Efficient Data Flow: Questions and suggestions are stored in PostgreSQL and cached in 
   Redis to reduce latency and database load.
2. AWS Lambda Integrations
   - User Onboarding Lambda: Handles personalized question assignment during onboarding.
   - Weekly Question Assignment Lambda: Automatically distributes weekly questions with AWS 
   EventBridge scheduling, providing seamless weekly updates.
3. Improved Media Handling
   - S3 and CloudFront: Media files are hosted in S3 and delivered globally through CloudFront.
   Each question with media now returns a CloudFront URL for optimized access.
4. Authentication & Verification
   - SES OTP Verification: Integrated SES for OTP-based email verification, enhancing security
   in the user sign-up process.
5. Scalable Notification System
   - SNS and SQS: SNS notifications and SQS message queues handle asynchronous processes such
   as user assignments and system updates.


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


**Code Structure**

   - src/
        - app.module.ts - Main application module
        - auth
            - auth.controller.ts
            - auth.module.ts
            - auth.service.ts
          - aws-s3 service
              - aws.s3.service.ts
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
            - lambda
                - lambda.module.ts
                - lambda.service.ts
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


5. **Usage**
    - API Endpoints
        - Onboarding Questions: POST /onboarding
            - Description: Initiates onboarding, triggering the onboarding Lambda to generate questions based on profile data.
        - Weekly Questions: POST /weekly-questions 
          - Description: Triggers the weekly question assignment Lambda.
        - Authentication: POST /auth/signup 
          - Description: Includes SES-based OTP email verification.
    
    - Updating Onboarding Questions
    To tag onboarding questions with user responses, use the PATCH /questions/onboarding 
   endpoint, which updates each question with relevant user data and response status.
    
    
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
