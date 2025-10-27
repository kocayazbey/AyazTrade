import { Module, Global } from '@nestjs/common';
import { ElasticsearchService } from '../../modules/ayaz-comm/search/elasticsearch.service';

@Global()
@Module({
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}

