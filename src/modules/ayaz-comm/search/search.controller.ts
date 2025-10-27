import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { FacetedSearchService } from './faceted-search.service';

@ApiTags('Search')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly facetedSearchService: FacetedSearchService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async search(@Query() query: any) {
    return this.searchService.search(query.q || '', {
      category: query.category,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      page: parseInt(query.page) || 1,
      pageSize: parseInt(query.limit) || 20,
    });
  }

  @Get('faceted')
  @ApiOperation({ summary: 'Faceted search with filters' })
  async facetedSearch(@Query() query: any) {
    return this.facetedSearchService.search(query.q || '');
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Search autocomplete suggestions' })
  async autocomplete(@Query('q') query: string) {
    return this.searchService.search(query, { pageSize: 5 });
  }
}

