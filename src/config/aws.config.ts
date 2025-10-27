import { ConfigService } from '@nestjs/config';

export const getAwsConfig = (configService: ConfigService) => {
  return {
    region: configService.get('AWS_REGION', 'us-east-1'),
    accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
    s3: {
      bucket: configService.get('AWS_S3_BUCKET', 'ayaztrade-storage'),
      region: configService.get('AWS_S3_REGION', 'us-east-1'),
      endpoint: configService.get('AWS_S3_ENDPOINT'),
      forcePathStyle: configService.get('AWS_S3_FORCE_PATH_STYLE', false),
    },
    ses: {
      region: configService.get('AWS_SES_REGION', 'us-east-1'),
      fromEmail: configService.get('AWS_SES_FROM_EMAIL', 'noreply@ayaztrade.com'),
    },
    sns: {
      region: configService.get('AWS_SNS_REGION', 'us-east-1'),
    },
    sqs: {
      region: configService.get('AWS_SQS_REGION', 'us-east-1'),
      queueUrl: configService.get('AWS_SQS_QUEUE_URL'),
    },
  };
};
