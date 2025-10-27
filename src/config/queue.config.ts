import { ConfigService } from '@nestjs/config';

export const getQueueConfig = (configService: ConfigService) => {
  return {
    redis: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB', 0),
    },
    bull: {
      defaultJobOptions: {
        removeOnComplete: configService.get('QUEUE_REMOVE_ON_COMPLETE', 10),
        removeOnFail: configService.get('QUEUE_REMOVE_ON_FAIL', 5),
        attempts: configService.get('QUEUE_ATTEMPTS', 3),
        backoff: {
          type: 'exponential',
          delay: configService.get('QUEUE_BACKOFF_DELAY', 2000),
        },
      },
      settings: {
        stalledInterval: configService.get('QUEUE_STALLED_INTERVAL', 30000),
        maxStalledCount: configService.get('QUEUE_MAX_STALLED_COUNT', 1),
      },
    },
    kafka: {
      clientId: configService.get('KAFKA_CLIENT_ID', 'ayaztrade'),
      brokers: configService.get('KAFKA_BROKERS', 'localhost:9092').split(','),
      ssl: configService.get('KAFKA_SSL', false),
      sasl: {
        mechanism: configService.get('KAFKA_SASL_MECHANISM', 'plain'),
        username: configService.get('KAFKA_SASL_USERNAME'),
        password: configService.get('KAFKA_SASL_PASSWORD'),
      },
      connectionTimeout: configService.get('KAFKA_CONNECTION_TIMEOUT', 3000),
      requestTimeout: configService.get('KAFKA_REQUEST_TIMEOUT', 30000),
      retry: {
        initialRetryTime: configService.get('KAFKA_INITIAL_RETRY_TIME', 100),
        retries: configService.get('KAFKA_RETRIES', 5),
      },
    },
  };
};
