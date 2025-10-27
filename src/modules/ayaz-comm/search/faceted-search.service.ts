import { Injectable } from '@nestjs/common';
import { SearchService } from './search.service';

@Injectable()
export class FacetedSearchService {
  constructor(private readonly searchService: SearchService) {}

  async search(query: string): Promise<any> {
    const results = await this.searchService.search(query, {
      facets: ['category', 'brand', 'price_range', 'rating'],
    });

    return {
      results: results.hits || [],
      total: results.total || 0,
      facets: results.facets || {},
    };
  }
}

