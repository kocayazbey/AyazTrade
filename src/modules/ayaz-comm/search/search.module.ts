import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchService } from './elasticsearch.service';
import { AutocompleteService } from './autocomplete.service';
import { FacetedSearchService } from './faceted-search.service';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    ElasticsearchService,
    AutocompleteService,
    FacetedSearchService,
  ],
  exports: [SearchService, ElasticsearchService],
})
export class SearchModule {}

