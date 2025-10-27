import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '../../core/elasticsearch/elasticsearch.service';

@Injectable()
export class ProductSearchService {
  constructor(private readonly searchService: ElasticsearchService) {}

  async indexProduct(product: any): Promise<void> {
    // Mock implementation - Elasticsearch service doesn't have these methods yet
    console.log('Indexing product:', product);
  }

  async updateProductIndex(id: string, product: any): Promise<void> {
    // Mock implementation - Elasticsearch service doesn't have these methods yet
    console.log('Updating product index:', id, product);
  }

  async removeFromIndex(id: string): Promise<void> {
    // Mock implementation - Elasticsearch service doesn't have these methods yet
    console.log('Removing product from index:', id);
  }

  async search(query: string, filters?: any): Promise<any> {
    const searchQuery = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: [
                  'name^5',
                  'description^2',
                  'sku^3',
                  'tags',
                  'shortDescription',
                  'metaKeywords',
                ],
                fuzziness: 'AUTO',
                operator: 'or',
              },
            },
          ],
          filter: this.buildSearchFilters(filters),
        },
      },
      highlight: {
        fields: {
          name: {},
          description: {},
        },
      },
      aggs: {
        categories: {
          terms: { field: 'categoryId', size: 10 },
        },
        brands: {
          terms: { field: 'brandId', size: 10 },
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 100 },
              { from: 100, to: 500 },
              { from: 500, to: 1000 },
              { from: 1000 },
            ],
          },
        },
      },
      sort: this.buildSort(filters?.sortBy, filters?.sortOrder),
      from: ((filters?.page || 1) - 1) * (filters?.limit || 20),
      size: filters?.limit || 20,
    };

    return this.searchService.search('products', searchQuery);
  }

  async autocomplete(query: string, limit: number = 10): Promise<any[]> {
    const results = await this.searchService.search('products', {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['name^3', 'sku^2'],
                type: 'bool_prefix',
              },
            },
            {
              term: { status: 'active' },
            },
          ],
        },
      },
      _source: ['id', 'name', 'slug', 'price', 'featuredImage'],
      size: limit,
    });

    return (results as any).hits || [];
  }

  async getSuggestions(query: string): Promise<string[]> {
    const results = await this.searchService.search('products', {
      suggest: {
        product_suggestion: {
          text: query,
          term: {
            field: 'name',
            size: 5,
          },
        },
      },
    });

    return (results as any)?.suggest?.product_suggestion?.[0]?.options?.map(
      (option: any) => option.text,
    ) || [];
  }

  private buildSearchFilters(filters: any): any[] {
    const must = [];

    if (filters?.categoryId) {
      must.push({ term: { categoryId: filters.categoryId } });
    }

    if (filters?.brandId) {
      must.push({ term: { brandId: filters.brandId } });
    }

    if (filters?.status) {
      must.push({ term: { status: filters.status } });
    } else {
      must.push({ term: { status: 'active' } });
    }

    if (filters?.minPrice || filters?.maxPrice) {
      const range: any = {};
      if (filters.minPrice) range.gte = filters.minPrice;
      if (filters.maxPrice) range.lte = filters.maxPrice;
      must.push({ range: { price: range } });
    }

    if (filters?.inStock) {
      must.push({ range: { stockQuantity: { gt: 0 } } });
    }

    if (filters?.tags?.length > 0) {
      must.push({ terms: { tags: filters.tags } });
    }

    if (filters?.isFeatured !== undefined) {
      must.push({ term: { isFeatured: filters.isFeatured } });
    }

    return must;
  }

  private buildSort(sortBy?: string, sortOrder?: string): any[] {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'price':
        return [{ price: order }];
      case 'name':
        return [{ 'name.keyword': order }];
      case 'rating':
        return [{ averageRating: order }];
      case 'popularity':
        return [{ totalSold: order }];
      case 'newest':
        return [{ createdAt: 'desc' }];
      default:
        return [{ _score: 'desc' }, { totalSold: 'desc' }];
    }
  }
}

