import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export interface SearchResult {
  hits: any[];
  total: number;
  aggregations?: any;
  facets?: any;
}

export interface SearchParams {
  query: string;
  filters?: any;
  page?: number;
  pageSize?: number;
  sort?: any;
  facets?: string[];
}

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200');
    const username = this.configService.get<string>('ELASTICSEARCH_USERNAME');
    const password = this.configService.get<string>('ELASTICSEARCH_PASSWORD');

    this.client = new Client({
      node,
      auth: username && password ? { username, password } : undefined,
      maxRetries: 3,
      requestTimeout: 30000,
    });
  }

  async search(indexName: string, params: SearchParams): Promise<SearchResult> {
    try {
      const { query, filters = {}, page = 1, pageSize = 20, sort, facets = [] } = params;
      
      const searchBody: any = {
        query: {
          bool: {
            must: [],
            filter: []
          }
        },
        from: (page - 1) * pageSize,
        size: pageSize,
        sort: sort || [{ '_score': { order: 'desc' } }]
      };

      // Add text search
      if (query) {
        searchBody.query.bool.must.push({
          multi_match: {
            query,
            fields: ['name^3', 'description^2', 'tags', 'category'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // Add filters
      Object.entries(filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            searchBody.query.bool.filter.push({
              terms: { [field]: value }
            });
          } else {
            searchBody.query.bool.filter.push({
              term: { [field]: value }
            });
          }
        }
      });

      // Add aggregations for facets
      if (facets.length > 0) {
        searchBody.aggs = {};
        facets.forEach(facet => {
          searchBody.aggs[facet] = {
            terms: {
              field: facet,
              size: 100
            }
          };
        });
      }

      const response = await this.client.search({
        index: indexName,
        body: searchBody
      });

      return {
        hits: response.hits.hits.map(hit => ({
          ...(hit._source as any),
          _id: hit._id,
          _score: hit._score
        })),
        total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total.value,
        aggregations: response.aggregations,
        facets: response.aggregations
      };
    } catch (error) {
      this.logger.error(`Elasticsearch search error: ${error.message}`, error.stack);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async index(indexName: string, document: any, id?: string): Promise<void> {
    try {
      await this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: 'wait_for'
      });
    } catch (error) {
      this.logger.error(`Elasticsearch index error: ${error.message}`, error.stack);
      throw new Error(`Indexing failed: ${error.message}`);
    }
  }

  async update(indexName: string, id: string, data: any): Promise<void> {
    try {
      await this.client.update({
        index: indexName,
        id,
        body: {
          doc: data
        },
        refresh: 'wait_for'
      });
    } catch (error) {
      this.logger.error(`Elasticsearch update error: ${error.message}`, error.stack);
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  async delete(indexName: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: indexName,
        id,
        refresh: 'wait_for'
      });
    } catch (error) {
      this.logger.error(`Elasticsearch delete error: ${error.message}`, error.stack);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async bulkIndex(indexName: string, documents: any[]): Promise<void> {
    try {
      const body = documents.flatMap(doc => [
        { index: { _index: indexName, _id: doc.id } },
        doc
      ]);

      await this.client.bulk({
        body,
        refresh: 'wait_for'
      });
    } catch (error) {
      this.logger.error(`Elasticsearch bulk index error: ${error.message}`, error.stack);
      throw new Error(`Bulk indexing failed: ${error.message}`);
    }
  }

  async createIndex(indexName: string, mappings: any): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      
      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          body: {
            mappings,
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1,
              analysis: {
                analyzer: {
                  turkish_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'turkish_stop', 'turkish_stemmer']
                  }
                },
                filter: {
                  turkish_stop: {
                    type: 'stop',
                    stopwords: '_turkish_'
                  },
                  turkish_stemmer: {
                    type: 'stemmer',
                    language: 'turkish'
                  }
                }
              }
            }
          }
        });
      }
    } catch (error) {
      this.logger.error(`Elasticsearch create index error: ${error.message}`, error.stack);
      throw new Error(`Index creation failed: ${error.message}`);
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.delete({ index: indexName });
    } catch (error) {
      this.logger.error(`Elasticsearch delete index error: ${error.message}`, error.stack);
      throw new Error(`Index deletion failed: ${error.message}`);
    }
  }

  async getMapping(indexName: string): Promise<any> {
    try {
      const response = await this.client.indices.getMapping({ index: indexName });
      return response.body[indexName]?.mappings;
    } catch (error) {
      this.logger.error(`Elasticsearch get mapping error: ${error.message}`, error.stack);
      throw new Error(`Get mapping failed: ${error.message}`);
    }
  }

  async count(indexName: string, query: any): Promise<number> {
    try {
      const response = await this.client.count({
        index: indexName,
        body: { query }
      });
      return response.count;
    } catch (error) {
      this.logger.error(`Elasticsearch count error: ${error.message}`, error.stack);
      throw new Error(`Count failed: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.cluster.health();
      return response.status === 'green' || response.status === 'yellow';
    } catch (error) {
      this.logger.error(`Elasticsearch health check failed: ${error.message}`, error.stack);
      return false;
    }
  }

  async getStats(): Promise<any> {
    try {
      const response = await this.client.indices.stats();
      return response;
    } catch (error) {
      this.logger.error(`Elasticsearch get stats error: ${error.message}`, error.stack);
      throw new Error(`Get stats failed: ${error.message}`);
    }
  }

  async indexDocument(indexName: string, document: any, id?: string): Promise<void> {
    try {
      await this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: 'wait_for'
      });
    } catch (error) {
      this.logger.error(`Elasticsearch index document error: ${error.message}`, error.stack);
      throw new Error(`Index document failed: ${error.message}`);
    }
  }

  async updateDocument(indexName: string, id: string, data: any): Promise<void> {
    try {
      await this.client.update({
        index: indexName,
        id,
        body: {
          doc: data
        },
        refresh: 'wait_for'
      });
    } catch (error) {
      this.logger.error(`Elasticsearch update document error: ${error.message}`, error.stack);
      throw new Error(`Update document failed: ${error.message}`);
    }
  }

  async deleteDocument(indexName: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: indexName,
        id,
        refresh: 'wait_for'
      });
    } catch (error) {
      this.logger.error(`Elasticsearch delete document error: ${error.message}`, error.stack);
      throw new Error(`Delete document failed: ${error.message}`);
    }
  }
}