import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.module';

interface Documentation {
  id: string;
  title: string;
  type: 'api' | 'user_guide' | 'technical' | 'deployment' | 'troubleshooting';
  category: string;
  content: string;
  version: string;
  language: string;
  tags: string[];
  author: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

interface DocumentationSection {
  id: string;
  documentationId: string;
  title: string;
  content: string;
  order: number;
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentationComment {
  id: string;
  documentationId: string;
  sectionId?: string;
  content: string;
  author: string;
  type: 'comment' | 'suggestion' | 'question' | 'answer';
  status: 'open' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentationAnalytics {
  totalDocuments: number;
  publishedDocuments: number;
  draftDocuments: number;
  totalViews: number;
  averageRating: number;
  popularDocuments: Array<{
    id: string;
    title: string;
    views: number;
    rating: number;
  }>;
  recentActivity: Array<{
    action: string;
    document: string;
    author: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createDocumentation(documentation: Omit<Documentation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Documentation> {
    const docId = `doc-${Date.now()}`;
    
    const newDocumentation: Documentation = {
      id: docId,
      ...documentation,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveDocumentation(newDocumentation);
    
    this.logger.log(`Created documentation: ${docId}`);
    return newDocumentation;
  }

  async getDocumentations(type?: string, category?: string, status?: string): Promise<Documentation[]> {
    let query = 'SELECT * FROM documentations';
    const params = [];
    
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    
    if (category) {
      query += type ? ' AND category = $2' : ' WHERE category = $1';
      params.push(category);
    }
    
    if (status) {
      query += (type || category) ? ' AND status = $' + (params.length + 1) : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  async getDocumentation(docId: string): Promise<Documentation> {
    const result = await this.db.execute(`
      SELECT * FROM documentations WHERE id = $1
    `, [docId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Documentation not found: ${docId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]')
    };
  }

  async updateDocumentation(docId: string, updates: Partial<Documentation>): Promise<Documentation> {
    const existing = await this.getDocumentation(docId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    if (updates.status === 'published' && !existing.publishedAt) {
      updated.publishedAt = new Date();
    }
    
    await this.saveDocumentation(updated);
    
    this.logger.log(`Updated documentation: ${docId}`);
    return updated;
  }

  async createDocumentationSection(section: Omit<DocumentationSection, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentationSection> {
    const sectionId = `section-${Date.now()}`;
    
    const newSection: DocumentationSection = {
      id: sectionId,
      ...section,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveDocumentationSection(newSection);
    
    this.logger.log(`Created documentation section: ${sectionId}`);
    return newSection;
  }

  async getDocumentationSections(docId: string): Promise<DocumentationSection[]> {
    const result = await this.db.execute(`
      SELECT * FROM documentation_sections
      WHERE documentation_id = $1 AND is_active = true
      ORDER BY "order" ASC
    `, [docId]);
    
    return result.rows;
  }

  async updateDocumentationSection(sectionId: string, updates: Partial<DocumentationSection>): Promise<DocumentationSection> {
    const existing = await this.getDocumentationSection(sectionId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveDocumentationSection(updated);
    
    this.logger.log(`Updated documentation section: ${sectionId}`);
    return updated;
  }

  async createDocumentationComment(comment: Omit<DocumentationComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentationComment> {
    const commentId = `comment-${Date.now()}`;
    
    const newComment: DocumentationComment = {
      id: commentId,
      ...comment,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveDocumentationComment(newComment);
    
    this.logger.log(`Created documentation comment: ${commentId}`);
    return newComment;
  }

  async getDocumentationComments(docId: string, sectionId?: string): Promise<DocumentationComment[]> {
    let query = 'SELECT * FROM documentation_comments WHERE documentation_id = $1';
    const params = [docId];
    
    if (sectionId) {
      query += ' AND section_id = $2';
      params.push(sectionId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  async updateCommentStatus(commentId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE documentation_comments SET status = $2, updated_at = NOW() WHERE id = $1
    `, [commentId, status]);
    
    this.logger.log(`Updated comment status: ${commentId} to ${status}`);
  }

  async generateAPIDocumentation(): Promise<{
    endpoints: Array<{
      path: string;
      method: string;
      description: string;
      parameters: any[];
      responses: any[];
      examples: any[];
    }>;
    schemas: Array<{
      name: string;
      type: string;
      properties: any;
      required: string[];
    }>;
    authentication: {
      type: string;
      description: string;
      examples: any[];
    };
  }> {
    this.logger.log('Generating API documentation');
    
    // Mock API documentation generation
    const endpoints = [
      {
        path: '/api/v1/products',
        method: 'GET',
        description: 'Get all products',
        parameters: [
          { name: 'page', type: 'number', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page' }
        ],
        responses: [
          { status: 200, description: 'Success', schema: 'ProductList' },
          { status: 400, description: 'Bad Request' }
        ],
        examples: [
          { request: 'GET /api/v1/products?page=1&limit=10', response: '{ "products": [], "total": 0 }' }
        ]
      },
      {
        path: '/api/v1/products',
        method: 'POST',
        description: 'Create a new product',
        parameters: [
          { name: 'body', type: 'object', required: true, description: 'Product data' }
        ],
        responses: [
          { status: 201, description: 'Created', schema: 'Product' },
          { status: 400, description: 'Bad Request' }
        ],
        examples: [
          { request: 'POST /api/v1/products', response: '{ "id": "123", "name": "Product" }' }
        ]
      }
    ];
    
    const schemas = [
      {
        name: 'Product',
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          description: { type: 'string' }
        },
        required: ['id', 'name', 'price']
      },
      {
        name: 'ProductList',
        type: 'object',
        properties: {
          products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          total: { type: 'number' }
        },
        required: ['products', 'total']
      }
    ];
    
    const authentication = {
      type: 'Bearer Token',
      description: 'JWT token authentication',
      examples: [
        { header: 'Authorization: Bearer <token>' }
      ]
    };
    
    return { endpoints, schemas, authentication };
  }

  async generateUserGuide(): Promise<{
    sections: Array<{
      title: string;
      content: string;
      order: number;
    }>;
    screenshots: Array<{
      title: string;
      url: string;
      description: string;
    }>;
    faq: Array<{
      question: string;
      answer: string;
    }>;
  }> {
    this.logger.log('Generating user guide');
    
    const sections = [
      {
        title: 'Getting Started',
        content: 'Welcome to AyazTrade! This guide will help you get started with our platform.',
        order: 1
      },
      {
        title: 'Creating Your Account',
        content: 'Learn how to create and set up your account.',
        order: 2
      },
      {
        title: 'Managing Products',
        content: 'Add, edit, and manage your product catalog.',
        order: 3
      },
      {
        title: 'Processing Orders',
        content: 'Handle customer orders and fulfillments.',
        order: 4
      }
    ];
    
    const screenshots = [
      {
        title: 'Dashboard Overview',
        url: '/screenshots/dashboard.png',
        description: 'Main dashboard showing key metrics'
      },
      {
        title: 'Product Management',
        url: '/screenshots/products.png',
        description: 'Product management interface'
      }
    ];
    
    const faq = [
      {
        question: 'How do I add a new product?',
        answer: 'Go to Products > Add New Product and fill in the required information.'
      },
      {
        question: 'How do I process an order?',
        answer: 'Navigate to Orders, select the order, and click Process Order.'
      }
    ];
    
    return { sections, screenshots, faq };
  }

  async generateTechnicalDocumentation(): Promise<{
    architecture: {
      overview: string;
      components: Array<{
        name: string;
        description: string;
        dependencies: string[];
      }>;
      dataFlow: string;
    };
    deployment: {
      requirements: string[];
      steps: string[];
      configuration: Record<string, any>;
    };
    troubleshooting: Array<{
      issue: string;
      solution: string;
      prevention: string;
    }>;
  }> {
    this.logger.log('Generating technical documentation');
    
    const architecture = {
      overview: 'AyazTrade is built using a microservices architecture with NestJS, PostgreSQL, and Redis.',
      components: [
        {
          name: 'API Gateway',
          description: 'Handles routing and authentication',
          dependencies: ['Redis', 'PostgreSQL']
        },
        {
          name: 'User Service',
          description: 'Manages user accounts and authentication',
          dependencies: ['PostgreSQL', 'Redis']
        },
        {
          name: 'Product Service',
          description: 'Handles product catalog and inventory',
          dependencies: ['PostgreSQL', 'Elasticsearch']
        }
      ],
      dataFlow: 'Requests flow through API Gateway → Service → Database → Response'
    };
    
    const deployment = {
      requirements: [
        'Node.js 18+',
        'PostgreSQL 14+',
        'Redis 6+',
        'Docker & Docker Compose'
      ],
      steps: [
        'Clone the repository',
        'Install dependencies',
        'Configure environment variables',
        'Run database migrations',
        'Start the application'
      ],
      configuration: {
        database: {
          host: 'localhost',
          port: 5432,
          name: 'ayaztrade'
        },
        redis: {
          host: 'localhost',
          port: 6379
        }
      }
    };
    
    const troubleshooting = [
      {
        issue: 'Database connection failed',
        solution: 'Check database credentials and network connectivity',
        prevention: 'Monitor database health and set up alerts'
      },
      {
        issue: 'High memory usage',
        solution: 'Restart the application and check for memory leaks',
        prevention: 'Implement proper memory management and monitoring'
      }
    ];
    
    return { architecture, deployment, troubleshooting };
  }

  async getDocumentationAnalytics(): Promise<DocumentationAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_documents,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_documents,
        SUM(view_count) as total_views,
        AVG(rating) as average_rating
      FROM documentations
    `);
    
    const stats = result.rows[0];
    
    // Get popular documents
    const popularResult = await this.db.execute(`
      SELECT id, title, view_count, rating
      FROM documentations
      WHERE status = 'published'
      ORDER BY view_count DESC
      LIMIT 5
    `);
    
    const popularDocuments = popularResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      views: parseInt(row.view_count) || 0,
      rating: parseFloat(row.rating) || 0
    }));
    
    // Get recent activity
    const activityResult = await this.db.execute(`
      SELECT action, document_title, author, timestamp
      FROM documentation_activity
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    const recentActivity = activityResult.rows.map(row => ({
      action: row.action,
      document: row.document_title,
      author: row.author,
      timestamp: row.timestamp
    }));
    
    return {
      totalDocuments: parseInt(stats.total_documents) || 0,
      publishedDocuments: parseInt(stats.published_documents) || 0,
      draftDocuments: parseInt(stats.draft_documents) || 0,
      totalViews: parseInt(stats.total_views) || 0,
      averageRating: parseFloat(stats.average_rating) || 0,
      popularDocuments,
      recentActivity
    };
  }

  async searchDocumentation(query: string, type?: string): Promise<Documentation[]> {
    let sqlQuery = `
      SELECT * FROM documentations
      WHERE (title ILIKE $1 OR content ILIKE $1)
        AND status = 'published'
    `;
    const params = [`%${query}%`];
    
    if (type) {
      sqlQuery += ' AND type = $2';
      params.push(type);
    }
    
    sqlQuery += ' ORDER BY updated_at DESC';
    
    const result = await this.db.execute(sqlQuery, params);
    
    return result.rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  async exportDocumentation(docId: string, format: 'pdf' | 'html' | 'markdown'): Promise<{
    content: string;
    filename: string;
    mimeType: string;
  }> {
    const documentation = await this.getDocumentation(docId);
    const sections = await this.getDocumentationSections(docId);
    
    let content = '';
    let filename = '';
    let mimeType = '';
    
    switch (format) {
      case 'pdf':
        content = this.generatePDFContent(documentation, sections);
        filename = `${documentation.title}.pdf`;
        mimeType = 'application/pdf';
        break;
      case 'html':
        content = this.generateHTMLContent(documentation, sections);
        filename = `${documentation.title}.html`;
        mimeType = 'text/html';
        break;
      case 'markdown':
        content = this.generateMarkdownContent(documentation, sections);
        filename = `${documentation.title}.md`;
        mimeType = 'text/markdown';
        break;
    }
    
    this.logger.log(`Exported documentation: ${docId} as ${format}`);
    
    return { content, filename, mimeType };
  }

  private generatePDFContent(documentation: Documentation, sections: DocumentationSection[]): string {
    // Mock PDF generation - in real implementation, this would use a PDF library
    let content = `# ${documentation.title}\n\n`;
    content += `${documentation.content}\n\n`;
    
    for (const section of sections.sort((a, b) => a.order - b.order)) {
      content += `## ${section.title}\n\n`;
      content += `${section.content}\n\n`;
    }
    
    return content;
  }

  private generateHTMLContent(documentation: Documentation, sections: DocumentationSection[]): string {
    let content = `<html><head><title>${documentation.title}</title></head><body>`;
    content += `<h1>${documentation.title}</h1>`;
    content += `<div>${documentation.content}</div>`;
    
    for (const section of sections.sort((a, b) => a.order - b.order)) {
      content += `<h2>${section.title}</h2>`;
      content += `<div>${section.content}</div>`;
    }
    
    content += `</body></html>`;
    return content;
  }

  private generateMarkdownContent(documentation: Documentation, sections: DocumentationSection[]): string {
    let content = `# ${documentation.title}\n\n`;
    content += `${documentation.content}\n\n`;
    
    for (const section of sections.sort((a, b) => a.order - b.order)) {
      content += `## ${section.title}\n\n`;
      content += `${section.content}\n\n`;
    }
    
    return content;
  }

  private async getDocumentationSection(sectionId: string): Promise<DocumentationSection> {
    const result = await this.db.execute(`
      SELECT * FROM documentation_sections WHERE id = $1
    `, [sectionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Documentation section not found: ${sectionId}`);
    }
    
    return result.rows[0];
  }

  private async saveDocumentation(documentation: Documentation): Promise<void> {
    await this.db.execute(`
      INSERT INTO documentations (id, title, type, category, content, version, language, tags, author, status, is_public, created_at, updated_at, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        type = EXCLUDED.type,
        category = EXCLUDED.category,
        content = EXCLUDED.content,
        version = EXCLUDED.version,
        language = EXCLUDED.language,
        tags = EXCLUDED.tags,
        author = EXCLUDED.author,
        status = EXCLUDED.status,
        is_public = EXCLUDED.is_public,
        updated_at = EXCLUDED.updated_at,
        published_at = EXCLUDED.published_at
    `, [
      documentation.id,
      documentation.title,
      documentation.type,
      documentation.category,
      documentation.content,
      documentation.version,
      documentation.language,
      JSON.stringify(documentation.tags),
      documentation.author,
      documentation.status,
      documentation.isPublic,
      documentation.createdAt,
      documentation.updatedAt,
      documentation.publishedAt
    ]);
  }

  private async saveDocumentationSection(section: DocumentationSection): Promise<void> {
    await this.db.execute(`
      INSERT INTO documentation_sections (id, documentation_id, title, content, "order", parent_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        "order" = EXCLUDED."order",
        parent_id = EXCLUDED.parent_id,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
    `, [
      section.id,
      section.documentationId,
      section.title,
      section.content,
      section.order,
      section.parentId,
      section.isActive,
      section.createdAt,
      section.updatedAt
    ]);
  }

  private async saveDocumentationComment(comment: DocumentationComment): Promise<void> {
    await this.db.execute(`
      INSERT INTO documentation_comments (id, documentation_id, section_id, content, author, type, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      comment.id,
      comment.documentationId,
      comment.sectionId,
      comment.content,
      comment.author,
      comment.type,
      comment.status,
      comment.createdAt,
      comment.updatedAt
    ]);
  }
}
