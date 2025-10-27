import { ConfigService } from '@nestjs/config';

export const getMonitoringConfig = (configService: ConfigService) => {
  return {
    prometheus: {
      enabled: configService.get('PROMETHEUS_ENABLED', true),
      port: configService.get('PROMETHEUS_PORT', 9090),
      path: configService.get('PROMETHEUS_PATH', '/metrics'),
      defaultMetrics: {
        enabled: configService.get('PROMETHEUS_DEFAULT_METRICS', true),
        config: {
          timeout: configService.get('PROMETHEUS_TIMEOUT', 5000),
          prefix: configService.get('PROMETHEUS_PREFIX', 'ayaztrade_'),
        },
      },
    },
    health: {
      enabled: configService.get('HEALTH_CHECK_ENABLED', true),
      path: configService.get('HEALTH_CHECK_PATH', '/health'),
      timeout: configService.get('HEALTH_CHECK_TIMEOUT', 5000),
    },
    logging: {
      level: configService.get('LOG_LEVEL', 'info'),
      format: configService.get('LOG_FORMAT', 'json'),
      file: {
        enabled: configService.get('LOG_FILE_ENABLED', true),
        path: configService.get('LOG_FILE_PATH', './logs'),
        maxSize: configService.get('LOG_FILE_MAX_SIZE', '10m'),
        maxFiles: configService.get('LOG_FILE_MAX_FILES', 5),
      },
    },
    tracing: {
      enabled: configService.get('TRACING_ENABLED', true),
      serviceName: configService.get('TRACING_SERVICE_NAME', 'ayaztrade'),
      jaeger: {
        enabled: configService.get('JAEGER_ENABLED', false),
        endpoint: configService.get('JAEGER_ENDPOINT', 'http://localhost:14268/api/traces'),
      },
    },
  };
};
