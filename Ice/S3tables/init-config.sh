#!/bin/bash
set -e

if [ -z "$S3_TABLE_ARN" ] || [ -z "$ICE_BEARER_TOKEN" ]; then
    echo "ERROR: Required environment variables not set"
    echo "Please set:"
    echo "  export S3_TABLE_ARN='arn:aws:s3tables:us-east-1:123456789012:bucket/your-bucket'"
    echo "  export ICE_BEARER_TOKEN='your-secret-token'"
    echo "The variable AWS_REGION defaults to 'us-east-1'."
    exit 1
fi

export AWS_REGION=${AWS_REGION:-us-east-1}

envsubst < .ice-rest-catalog.yaml.template > .ice-rest-catalog.yaml
envsubst < .ice.yaml.template > .ice.yaml
envsubst < nimtable-config.yaml.template > nimtable-config.yaml
echo "✓ Configuration files generated"
