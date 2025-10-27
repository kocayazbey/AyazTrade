import { Client } from '@elastic/elasticsearch';

export interface IndexTemplate {
  name: string;
  template: any;
  index_patterns: string[];
  priority: number;
  version: number;
}

export class ElasticsearchIndexTemplates {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async createIndexTemplates() {
    const templates = [
      this.getProductsTemplate(),
      this.getOrdersTemplate(),
      this.getUsersTemplate(),
      this.getLogsTemplate(),
    ];

    for (const template of templates) {
      try {
        await this.client.indices.putIndexTemplate(template);
        console.log(`Created index template: ${template.name}`);
      } catch (error) {
        console.error(`Failed to create index template ${template.name}:`, error);
      }
    }
  }

  private getProductsTemplate(): IndexTemplate {
    return {
      name: 'products_template',
      index_patterns: ['products-*'],
      priority: 200,
      version: 1,
      template: {
        settings: {
          number_of_shards: 2,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              turkish_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: [
                  'lowercase',
                  'turkish_stop',
                  'turkish_stemmer',
                  'asciifolding',
                ],
              },
              turkish_search_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: [
                  'lowercase',
                  'turkish_stop',
                  'turkish_stemmer',
                  'asciifolding',
                ],
              },
              keyword_analyzer: {
                type: 'custom',
                tokenizer: 'keyword',
                filter: ['lowercase', 'asciifolding'],
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
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'turkish_analyzer',
              search_analyzer: 'turkish_search_analyzer',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
                suggest: {
                  type: 'completion',
                  analyzer: 'keyword_analyzer',
                },
              },
            },
            description: {
              type: 'text',
              analyzer: 'turkish_analyzer',
              search_analyzer: 'turkish_search_analyzer',
            },
            sku: {
              type: 'keyword',
            },
            price: {
              type: 'double',
            },
            currency: {
              type: 'keyword',
            },
            status: {
              type: 'keyword',
            },
            category: {
              properties: {
                id: { type: 'keyword' },
                name: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                slug: { type: 'keyword' },
              },
            },
            brand: {
              properties: {
                id: { type: 'keyword' },
                name: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                slug: { type: 'keyword' },
              },
            },
            tags: {
              type: 'keyword',
            },
            attributes: {
              type: 'object',
              properties: {
                color: { type: 'keyword' },
                size: { type: 'keyword' },
                material: { type: 'keyword' },
                weight: { type: 'float' },
                dimensions: {
                  type: 'object',
                  properties: {
                    length: { type: 'float' },
                    width: { type: 'float' },
                    height: { type: 'float' },
                  },
                },
              },
            },
            stock: {
              type: 'integer',
            },
            isVisible: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            images: {
              type: 'object',
              properties: {
                url: { type: 'keyword' },
                alt: { type: 'text' },
                order: { type: 'integer' },
              },
            },
            seo: {
              type: 'object',
              properties: {
                title: { type: 'text' },
                description: { type: 'text' },
                keywords: { type: 'keyword' },
              },
            },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            publishedAt: { type: 'date' },
          },
        },
      },
    };
  }

  private getOrdersTemplate(): IndexTemplate {
    return {
      name: 'orders_template',
      index_patterns: ['orders-*'],
      priority: 200,
      version: 1,
      template: {
        settings: {
          number_of_shards: 2,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              turkish_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: [
                  'lowercase',
                  'turkish_stop',
                  'turkish_stemmer',
                  'asciifolding',
                ],
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
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            orderNumber: { type: 'keyword' },
            status: { type: 'keyword' },
            totalAmount: { type: 'double' },
            currency: { type: 'keyword' },
            customer: {
              properties: {
                id: { type: 'keyword' },
                email: { type: 'keyword' },
                firstName: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                lastName: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                  },
                },
                phone: { type: 'keyword' },
              },
            },
            shippingAddress: {
              type: 'object',
              properties: {
                firstName: { type: 'text' },
                lastName: { type: 'text' },
                address: { type: 'text' },
                city: { type: 'keyword' },
                postalCode: { type: 'keyword' },
                country: { type: 'keyword' },
              },
            },
            items: {
              type: 'nested',
              properties: {
                productId: { type: 'keyword' },
                productName: {
                  type: 'text',
                  analyzer: 'turkish_analyzer',
                },
                quantity: { type: 'integer' },
                price: { type: 'double' },
                total: { type: 'double' },
              },
            },
            payment: {
              type: 'object',
              properties: {
                method: { type: 'keyword' },
                status: { type: 'keyword' },
                transactionId: { type: 'keyword' },
                paidAt: { type: 'date' },
              },
            },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            shippedAt: { type: 'date' },
            deliveredAt: { type: 'date' },
          },
        },
      },
    };
  }

  private getUsersTemplate(): IndexTemplate {
    return {
      name: 'users_template',
      index_patterns: ['users-*'],
      priority: 200,
      version: 1,
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              turkish_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: [
                  'lowercase',
                  'turkish_stop',
                  'turkish_stemmer',
                  'asciifolding',
                ],
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
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            email: { type: 'keyword' },
            firstName: {
              type: 'text',
              analyzer: 'turkish_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            lastName: {
              type: 'text',
              analyzer: 'turkish_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            phone: { type: 'keyword' },
            status: { type: 'keyword' },
            role: { type: 'keyword' },
            permissions: { type: 'keyword' },
            lastLoginAt: { type: 'date' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
    };
  }

  private getLogsTemplate(): IndexTemplate {
    return {
      name: 'logs_template',
      index_patterns: ['logs-*'],
      priority: 100,
      version: 1,
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              log_analyzer: {
                type: 'custom',
                tokenizer: 'keyword',
                filter: ['lowercase'],
              },
            },
          },
        },
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            service: { type: 'keyword' },
            requestId: { type: 'keyword' },
            userId: { type: 'keyword' },
            ip: { type: 'ip' },
            userAgent: { type: 'text' },
            method: { type: 'keyword' },
            url: { type: 'keyword' },
            statusCode: { type: 'integer' },
            responseTime: { type: 'float' },
            error: {
              type: 'object',
              properties: {
                name: { type: 'keyword' },
                message: { type: 'text' },
                stack: { type: 'text' },
              },
            },
            metadata: { type: 'object' },
          },
        },
      },
    };
  }

  async createIndices() {
    const indices = [
      { name: 'products-2024-01', template: 'products_template' },
      { name: 'orders-2024-01', template: 'orders_template' },
      { name: 'users-2024-01', template: 'users_template' },
      { name: 'logs-2024-01', template: 'logs_template' },
    ];

    for (const index of indices) {
      try {
        await this.client.indices.create({
          index: index.name,
        });
        console.log(`Created index: ${index.name}`);
      } catch (error) {
        if (error.meta?.statusCode !== 400) {
          console.error(`Failed to create index ${index.name}:`, error);
        }
      }
    }
  }
}
