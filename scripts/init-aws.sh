#!/bin/bash
# LocalStack initialization script
# This script runs when LocalStack is ready

echo "Initializing LocalStack AWS services..."

# Create SQS Queue for task processing
awslocal sqs create-queue \
    --queue-name skelly-tasks \
    --attributes '{
        "VisibilityTimeout": "300",
        "MessageRetentionPeriod": "1209600",
        "ReceiveMessageWaitTimeSeconds": "20"
    }'

# Create Dead Letter Queue for failed messages
awslocal sqs create-queue \
    --queue-name skelly-tasks-dlq \
    --attributes '{
        "MessageRetentionPeriod": "1209600"
    }'

# Set up redrive policy for main queue
MAIN_QUEUE_URL=$(awslocal sqs get-queue-url --queue-name skelly-tasks --query 'QueueUrl' --output text)
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url $(awslocal sqs get-queue-url --queue-name skelly-tasks-dlq --query 'QueueUrl' --output text) --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal sqs set-queue-attributes \
    --queue-url $MAIN_QUEUE_URL \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

# Create S3 buckets
awslocal s3 mb s3://skelly-uploads
awslocal s3 mb s3://skelly-exports

# Set bucket policies
awslocal s3api put-bucket-cors --bucket skelly-uploads --cors-configuration '{
    "CORSRules": [{
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"],
        "MaxAgeSeconds": 3000
    }]
}'

echo "LocalStack initialization complete!"