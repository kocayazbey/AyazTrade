import { ConfigService } from '@nestjs/config';

export const getAppConfig = (configService: ConfigService) => {
  return {
    name: configService.get('APP_NAME', 'AyazTrade'),
    version: configService.get('APP_VERSION', '1.0.0'),
    description: configService.get('APP_DESCRIPTION', 'Comprehensive e-commerce and business management platform'),
    port: configService.get('PORT', 3000),
    host: configService.get('HOST', '0.0.0.0'),
    environment: configService.get('NODE_ENV', 'development'),
    url: configService.get('APP_URL', 'http://localhost:3000'),
    apiPrefix: configService.get('API_PREFIX', 'api/v1'),
    cors: {
      origin: configService.get('CORS_ORIGIN', '*').split(','),
      credentials: true,
    },
    compression: {
      enabled: configService.get('COMPRESSION_ENABLED', true),
      level: configService.get('COMPRESSION_LEVEL', 6),
      threshold: configService.get('COMPRESSION_THRESHOLD', 1024),
    },
    timeout: {
      request: configService.get('REQUEST_TIMEOUT', 30000),
      response: configService.get('RESPONSE_TIMEOUT', 30000),
    },
    limits: {
      bodySize: configService.get('BODY_SIZE_LIMIT', '10mb'),
      urlSize: configService.get('URL_SIZE_LIMIT', '2kb'),
      parameterLimit: configService.get('PARAMETER_LIMIT', 1000),
    },
    features: {
      swagger: configService.get('SWAGGER_ENABLED', true),
      metrics: configService.get('METRICS_ENABLED', true),
      healthCheck: configService.get('HEALTH_CHECK_ENABLED', true),
      rateLimit: configService.get('RATE_LIMIT_ENABLED', true),
      cors: configService.get('CORS_ENABLED', true),
    },
  };
};
