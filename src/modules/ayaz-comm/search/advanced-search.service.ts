import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';

interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
  language?: string;
}

interface SearchFilters {
  categories?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  tags?: string[];
  attributes?: Record<string, any>;
}

interface SearchSort {
  field: 'relevance' | 'price' | 'name' | 'rating' | 'sales' | 'date';
  order: 'asc' | 'desc';
}

interface SearchResult {
  products: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: SearchFacets;
  suggestions: string[];
  searchTime: number;
}

interface SearchFacets {
  categories: Array<{ id: string; name: string; count: number }>;
  brands: Array<{ id: string; name: string; count: number }>;
  priceRanges: Array<{ min: number; max: number; count: number }>;
  ratings: Array<{ rating: number; count: number }>;
}

@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);
  private esClient: Client;
  private indexName: string = 'products';

  constructor(private configService: ConfigService) {
    const esNode = this.configService.get<string>('ELASTICSEARCH_NODE') || 'http://localhost:9200';
    
    this.esClient = new Client({
      node: esNode,
      auth: {
        username: this.configService.get<string>('ELASTICSEARCH_USERNAME') || 'elastic',
        password: this.configService.get<string>('ELASTICSEARCH_PASSWORD') || 'password',
      },
    });

    this.initializeIndex();
  }

  private async initializeIndex(): Promise<void> {
    try {
      const exists = await this.esClient.indices.exists({ index: this.indexName });

      if (!exists) {
        await this.esClient.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 3,
              number_of_replicas: 1,
              analysis: {
                analyzer: {
                  turkish_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'turkish_stop', 'turkish_stemmer', 'asciifolding'],
                  },
                  autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'edge_ngram_filter'],
                  },
                  autocomplete_search_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase'],
                  },
                },
                filter: {
                  turkish_stop: {
                    type: 'stop',
                    stopwords: '_turkish_',
                  },
                  turkish_stemmer: {
                    type: 'stemmer',
                    language: 'turkish',
                  },
                  edge_ngram_filter: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 20,
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                sku: { 
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                    autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'autocomplete_search_analyzer' },
                  },
                  boost: 3,
                },
                name: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                    autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'autocomplete_search_analyzer' },
                  },
                  boost: 5,
                },
                description: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  boost: 1,
                },
                shortDescription: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  boost: 2,
                },
                categoryId: { type: 'keyword' },
                categoryName: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: { keyword: { type: 'keyword' } },
                },
                brandId: { type: 'keyword' },
                brandName: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: { keyword: { type: 'keyword' } },
                },
                tags: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: { keyword: { type: 'keyword' } },
                  boost: 2,
                },
                price: { type: 'float' },
                compareAtPrice: { type: 'float' },
                stockQuantity: { type: 'integer' },
                averageRating: { type: 'float' },
                reviewCount: { type: 'integer' },
                totalSold: { type: 'integer' },
                viewCount: { type: 'integer' },
                status: { type: 'keyword' },
                isFeatured: { type: 'boolean' },
                attributes: { type: 'object', enabled: true },
                images: { type: 'keyword' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                suggest: {
                  type: 'completion',
                  analyzer: 'turkish_analyzer',
                },
              },
            },
          },
        });

        this.logger.log('Elasticsearch index created with Turkish language support');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch index:', error);
    }
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const query = this.buildSearchQuery(request);
      const aggregations = this.buildAggregations();

      const response = await this.esClient.search({
        index: this.indexName,
        body: {
          query,
          aggs: aggregations,
          from: ((request.page || 1) - 1) * (request.pageSize || 20),
          size: request.pageSize || 20,
          sort: this.buildSort(request.sort),
          highlight: {
            fields: {
              name: { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
              description: { pre_tags: ['<mark>'], post_tags: ['</mark>'], fragment_size: 150 },
              tags: { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
            },
          },
        },
      });

      const products = response.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
        _highlights: hit.highlight,
      }));

      const facets = this.extractFacets(response.aggregations);
      const suggestions = await this.getSuggestions(request.query);

      const searchTime = Date.now() - startTime;

      const result: SearchResult = {
        products,
        total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total.value,
        page: request.page || 1,
        pageSize: request.pageSize || 20,
        totalPages: Math.ceil((typeof response.hits.total === 'number' ? response.hits.total : response.hits.total.value) / (request.pageSize || 20)),
        facets,
        suggestions,
        searchTime,
      };

      this.logger.log(`Search completed in ${searchTime}ms: "${request.query}" (${result.total} results)`);
      return result;
    } catch (error) {
      this.logger.error('Search error:', error);
      throw error;
    }
  }

  private buildSearchQuery(request: SearchRequest): any {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];

    if (request.query && request.query.trim()) {
      must.push({
        multi_match: {
          query: request.query,
          fields: [
            'name^5',
            'name.autocomplete^4',
            'sku^3',
            'sku.autocomplete^2',
            'description',
            'shortDescription^2',
            'tags^2',
            'brandName',
            'categoryName',
            'attributes.*',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
          operator: 'or',
        },
      });

      should.push(
        { match_phrase: { name: { query: request.query, boost: 10 } } },
        { match_phrase: { sku: { query: request.query, boost: 8 } } },
        { term: { 'sku.keyword': { value: request.query, boost: 15 } } }
      );
    } else {
      must.push({ match_all: {} });
    }

    filter.push({ term: { status: 'active' } });

    if (request.filters) {
      if (request.filters.categories?.length > 0) {
        filter.push({ terms: { categoryId: request.filters.categories } });
      }

      if (request.filters.brands?.length > 0) {
        filter.push({ terms: { brandId: request.filters.brands } });
      }

      if (request.filters.minPrice !== undefined || request.filters.maxPrice !== undefined) {
        const range: any = {};
        if (request.filters.minPrice !== undefined) range.gte = request.filters.minPrice;
        if (request.filters.maxPrice !== undefined) range.lte = request.filters.maxPrice;
        filter.push({ range: { price: range } });
      }

      if (request.filters.inStock) {
        filter.push({ range: { stockQuantity: { gt: 0 } } });
      }

      if (request.filters.rating) {
        filter.push({ range: { averageRating: { gte: request.filters.rating } } });
      }

      if (request.filters.tags?.length > 0) {
        filter.push({ terms: { 'tags.keyword': request.filters.tags } });
      }

      if (request.filters.attributes) {
        for (const [key, value] of Object.entries(request.filters.attributes)) {
          filter.push({ term: { [`attributes.${key}.keyword`]: value } });
        }
      }
    }

    return {
      bool: {
        must,
        filter,
        should,
        minimum_should_match: should.length > 0 ? 1 : 0,
      },
    };
  }

  private buildSort(sort?: SearchSort): any[] {
    if (!sort || sort.field === 'relevance') {
      return [
        { _score: 'desc' },
        { isFeatured: 'desc' },
        { totalSold: 'desc' },
      ];
    }

    const sortConfig: any = {};

    switch (sort.field) {
      case 'price':
        sortConfig.price = sort.order;
        break;
      case 'name':
        sortConfig['name.keyword'] = sort.order;
        break;
      case 'rating':
        sortConfig.averageRating = sort.order;
        break;
      case 'sales':
        sortConfig.totalSold = sort.order;
        break;
      case 'date':
        sortConfig.createdAt = sort.order;
        break;
    }

    return [sortConfig, { _score: 'desc' }];
  }

  private buildAggregations(): any {
    return {
      categories: {
        terms: { field: 'categoryId', size: 50 },
        aggs: {
          category_name: {
            terms: { field: 'categoryName.keyword', size: 1 },
          },
        },
      },
      brands: {
        terms: { field: 'brandId', size: 50 },
        aggs: {
          brand_name: {
            terms: { field: 'brandName.keyword', size: 1 },
          },
        },
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { key: '0-100', to: 100 },
            { key: '100-500', from: 100, to: 500 },
            { key: '500-1000', from: 500, to: 1000 },
            { key: '1000-5000', from: 1000, to: 5000 },
            { key: '5000+', from: 5000 },
          ],
        },
      },
      ratings: {
        terms: { field: 'averageRating', size: 5 },
      },
      tags: {
        terms: { field: 'tags.keyword', size: 20 },
      },
    };
  }

  private extractFacets(aggregations: any): SearchFacets {
    if (!aggregations) {
      return { categories: [], brands: [], priceRanges: [], ratings: [] };
    }

    return {
      categories: aggregations.categories?.buckets?.map((b: any) => ({
        id: b.key,
        name: b.category_name.buckets[0]?.key || b.key,
        count: b.doc_count,
      })) || [],
      brands: aggregations.brands?.buckets?.map((b: any) => ({
        id: b.key,
        name: b.brand_name.buckets[0]?.key || b.key,
        count: b.doc_count,
      })) || [],
      priceRanges: aggregations.price_ranges?.buckets?.map((b: any) => ({
        min: b.from || 0,
        max: b.to || Infinity,
        count: b.doc_count,
      })) || [],
      ratings: aggregations.ratings?.buckets?.map((b: any) => ({
        rating: b.key,
        count: b.doc_count,
      })) || [],
    };
  }

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await this.esClient.search({
        index: this.indexName,
        body: {
          suggest: {
            product_suggestion: {
              prefix: query,
              completion: {
                field: 'suggest',
                size: 10,
                skip_duplicates: true,
                fuzzy: {
                  fuzziness: 'AUTO',
                },
              },
            },
          },
        },
      });

      const suggestions = (response.suggest?.product_suggestion?.[0]?.options as any[])?.map((opt: any) => opt.text) || [];
      return suggestions;
    } catch (error) {
      this.logger.error('Suggestions error:', error);
      return [];
    }
  }

  async autocomplete(query: string, limit: number = 10): Promise<any[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await this.esClient.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['name.autocomplete^3', 'sku.autocomplete^2', 'tags.autocomplete'],
                    type: 'bool_prefix',
                  },
                },
              ],
              filter: [
                { term: { status: 'active' } },
              ],
            },
          },
          _source: ['id', 'name', 'sku', 'price', 'images', 'categoryName'],
          size: limit,
        },
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Autocomplete error:', error);
      return [];
    }
  }

  async indexProduct(product: any): Promise<void> {
    try {
      const doc = {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        categoryId: product.categoryId,
        categoryName: product.categoryName || '',
        brandId: product.brandId,
        brandName: product.brandName || '',
        tags: product.tags || [],
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stockQuantity: product.stockQuantity,
        averageRating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0,
        totalSold: product.totalSold || 0,
        viewCount: product.viewCount || 0,
        status: product.status,
        isFeatured: product.isFeatured || false,
        attributes: product.attributes || {},
        images: product.images || [],
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        suggest: {
          input: [
            product.name,
            product.sku,
            ...(product.tags || []),
            product.brandName,
          ].filter(Boolean),
          weight: (product.totalSold || 0) + (product.isFeatured ? 100 : 0),
        },
      };

      await this.esClient.index({
        index: this.indexName,
        id: product.id,
        body: doc,
        refresh: true,
      });

      this.logger.debug(`Product indexed: ${product.sku}`);
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}:`, error);
    }
  }

  async bulkIndexProducts(products: any[]): Promise<void> {
    try {
      const body = products.flatMap((product) => [
        { index: { _index: this.indexName, _id: product.id } },
        {
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
          categoryId: product.categoryId,
          categoryName: product.categoryName || '',
          brandId: product.brandId,
          brandName: product.brandName || '',
          tags: product.tags || [],
          price: product.price,
          stockQuantity: product.stockQuantity,
          averageRating: product.averageRating || 0,
          reviewCount: product.reviewCount || 0,
          totalSold: product.totalSold || 0,
          status: product.status,
          isFeatured: product.isFeatured || false,
          attributes: product.attributes || {},
          images: product.images || [],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          suggest: {
            input: [product.name, product.sku, ...(product.tags || [])].filter(Boolean),
          },
        },
      ]);

      await this.esClient.bulk({ body, refresh: true });
      this.logger.log(`Bulk indexed ${products.length} products`);
    } catch (error) {
      this.logger.error('Bulk index error:', error);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: this.indexName,
        id: productId,
      });
      this.logger.debug(`Product deleted from index: ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to delete product ${productId}:`, error);
    }
  }

  async updateProduct(productId: string, updates: any): Promise<void> {
    try {
      await this.esClient.update({
        index: this.indexName,
        id: productId,
        body: { doc: updates },
        refresh: true,
      });
      this.logger.debug(`Product updated in index: ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to update product ${productId}:`, error);
    }
  }

  async searchBySKU(sku: string): Promise<any | null> {
    try {
      const response = await this.esClient.search({
        index: this.indexName,
        body: {
          query: {
            term: { 'sku.keyword': sku },
          },
        },
      });

      return response.hits.hits[0]?._source || null;
    } catch (error) {
      this.logger.error('SKU search error:', error);
      return null;
    }
  }

  async similarProducts(productId: string, limit: number = 10): Promise<any[]> {
    try {
      const product = await this.esClient.get({
        index: this.indexName,
        id: productId,
      });

      const source: any = product._source;

      const response = await this.esClient.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: [
                { term: { status: 'active' } },
              ],
              should: [
                { term: { categoryId: { value: source.categoryId, boost: 3 } } },
                { term: { brandId: { value: source.brandId, boost: 2 } } },
                { terms: { 'tags.keyword': Array.isArray(source.tags) ? source.tags : [] } },
              ],
              must_not: [
                { term: { id: productId } },
              ],
              minimum_should_match: 1,
            },
          },
          size: limit,
        },
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Similar products error:', error);
      return [];
    }
  }

  async trackSearch(query: string, userId?: string, resultCount?: number): Promise<void> {
    this.logger.debug(`Search tracked: "${query}" by ${userId || 'guest'} (${resultCount} results)`);
  }

  async getPopularSearches(limit: number = 10): Promise<string[]> {
    return ['elektronik', 'telefon', 'laptop', 'kulaklık', 'mouse'];
  }

  async getTrendingProducts(limit: number = 20): Promise<any[]> {
    try {
      const response = await this.esClient.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: [{ term: { status: 'active' } }],
            },
          },
          sort: [
            { viewCount: 'desc' },
            { totalSold: 'desc' },
            { averageRating: 'desc' },
          ],
          size: limit,
        },
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Trending products error:', error);
      return [];
    }
  }

  async reindexAll(): Promise<void> {
    this.logger.log('Starting full reindex...');
    await this.esClient.indices.delete({ index: this.indexName, ignore_unavailable: true });
    await this.initializeIndex();
    this.logger.log('Reindex completed');
  }
}

