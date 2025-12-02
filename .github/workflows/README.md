# GitHub Actions CI/CD Setup for Backend API

This workflow builds the TypeScript backend API, packages it as a Docker image, pushes to DockerHub, and deploys to AWS ECS Fargate.

## Prerequisites

1. **AWS IAM Role with OIDC Provider**
   - Create an OIDC identity provider in AWS IAM for GitHub
   - Create an IAM role that trusts the GitHub OIDC provider
   - The role should have permissions to:
     - `ecs:DescribeTaskDefinition`
     - `ecs:RegisterTaskDefinition`
     - `ecs:UpdateService`
     - `ecs:DescribeServices`
     - `iam:PassRole` (if the task definition uses an execution role)

2. **DockerHub Account**
   - Create a DockerHub account
   - Generate an access token (Settings → Security → New Access Token)

3. **AWS ECS Setup**
   - Create an ECS cluster (Fargate)
   - Create a task definition
   - Create an ECS service

4. **GitHub Variables and Secrets**
   Configure the following in your GitHub repository settings (Settings → Secrets and variables → Actions):
   
   **Variables:**
   - `AWS_ROLE_ARN`: The ARN of the IAM role (e.g., `arn:aws:iam::123456789012:role/github-actions-ecs-role`)
   - `AWS_REGION`: AWS region (e.g., `us-east-1`)
   - `DOCKERHUB_USERNAME`: Your DockerHub username
   
   **Secrets:**
   - `DOCKERHUB_TOKEN`: Your DockerHub access token

## IAM Role Trust Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/one_api:*"
        }
      }
    }
  ]
}
```

## IAM Role Permissions Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:ListTasks",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole"
    }
  ]
}
```

## ECS Task Definition Example

Your ECS task definition should reference the DockerHub image. Example:

```json
{
  "family": "one-api-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "one-api",
      "image": "YOUR_DOCKERHUB_USERNAME/one-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/one-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Workflow Variables

You can customize these in the workflow file's `env` section:
- `DOCKERHUB_REPOSITORY`: DockerHub repository name (default: `one-api`)
- `ECS_SERVICE`: ECS service name (default: `one-api-service`)
- `ECS_CLUSTER`: ECS cluster name (default: `one-api-cluster`)
- `ECS_TASK_DEFINITION`: ECS task definition name (default: `one-api-task`)
- `CONTAINER_NAME`: Container name in task definition (default: `one-api`)

## Workflow Triggers

- **Push to main branch**: Automatically builds and deploys
- **Manual trigger**: Use "Run workflow" button in GitHub Actions tab

## Build Process

1. Checks out the code
2. Sets up Node.js 20
3. Installs dependencies and builds TypeScript (`npm ci` → `npm run build`)
4. Configures AWS credentials using OIDC
5. Logs in to DockerHub
6. Builds Docker image with build cache
7. Pushes image to DockerHub with tags: `latest` and commit SHA
8. Downloads current ECS task definition
9. Updates task definition with new image tag
10. Registers new task definition revision
11. Updates ECS service to use new task definition
12. Waits for service to stabilize

## Docker Image Tags

- `latest`: Always points to the latest build
- `{commit-sha}`: Specific commit SHA for versioning

## Notes

- The workflow uses Docker layer caching for faster builds
- The task definition is updated dynamically with the new image tag
- The ECS service is force-updated to ensure a new deployment
- The workflow waits for the service to stabilize before completing

