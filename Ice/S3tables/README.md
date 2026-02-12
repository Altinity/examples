# Using Altinity Ice with S3tables on AWS

AWS's S3tables 

### AWS Credentials

Set your AWS credentials as environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_SESSION_TOKEN=your_token  # if using temporary credentials
```

**Note:** If you use AWS SSO, you can mount `~/.aws` as a volume and set `AWS_PROFILE` instead.

```bash
aws configure sso
aws sso login --profile your-profile
export AWS_PROFILE=your-profile
```

Then start the environment:
```bash
docker-compose up
```
