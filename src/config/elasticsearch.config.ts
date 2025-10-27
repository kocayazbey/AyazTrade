import { ElasticsearchModuleOptions } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

export const getElasticsearchConfig = (configService: ConfigService): ElasticsearchModuleOptions => {
  return {
    node: configService.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
    auth: {
      username: configService.get('ELASTICSEARCH_USERNAME'),
      password: configService.get('ELASTICSEARCH_PASSWORD'),
    },
    maxRetries: configService.get('ELASTICSEARCH_MAX_RETRIES', 3),
    requestTimeout: configService.get('ELASTICSEARCH_REQUEST_TIMEOUT', 30000),
    pingTimeout: configService.get('ELASTICSEARCH_PING_TIMEOUT', 3000),
    sniffOnStart: configService.get('ELASTICSEARCH_SNIFF_ON_START', false),
    sniffOnConnectionFault: configService.get('ELASTICSEARCH_SNIFF_ON_CONNECTION_FAULT', true),
    sniffInterval: configService.get('ELASTICSEARCH_SNIFF_INTERVAL', 300000),
    sniffEndpoint: configService.get('ELASTICSEARCH_SNIFF_ENDPOINT', '_nodes/_all/http'),
  };
};
