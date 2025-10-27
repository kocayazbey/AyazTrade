import { Injectable, Logger, NotFoundException } from '@nestjs/common';

interface CMSPage {
  id: string;
  slug: string;
  type: 'page' | 'blog' | 'faq' | 'landing';
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CMSContent {
  pageId: string;
  locale: string;
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  featuredImage?: string;
  author?: string;
  tags?: string[];
}

interface CMSBlock {
  id: string;
  identifier: string;
  type: 'text' | 'html' | 'banner' | 'slider' | 'products' | 'categories';
  status: 'active' | 'inactive';
  position?: number;
}

interface CMSBlockContent {
  blockId: string;
  locale: string;
  title?: string;
  content: string;
  settings?: Record<string, any>;
}

@Injectable()
export class CMSContentService {
  private readonly logger = new Logger(CMSContentService.name);
  private translations = new Map<string, Map<string, string>>();
  private pages: Map<string, CMSPage> = new Map();
  private pageContents: Map<string, CMSContent[]> = new Map();
  private blocks: Map<string, CMSBlock> = new Map();
  private blockContents: Map<string, CMSBlockContent[]> = new Map();

  constructor() {
    this.seedDefaultContent();
  }

  private seedDefaultContent(): void {
    const homePage: CMSPage = {
      id: 'home',
      slug: 'home',
      type: 'page',
      status: 'published',
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pages.set('home', homePage);

    const homeContentTR: CMSContent = {
      pageId: 'home',
      locale: 'tr',
      title: 'Ana Sayfa',
      content: '<h1>Hoş Geldiniz</h1><p>En iyi ürünleri keşfedin!</p>',
      excerpt: 'En iyi ürünleri keşfedin',
      metaTitle: 'Ana Sayfa - AyazComm',
      metaDescription: 'AyazComm ile en kaliteli ürünleri keşfedin',
    };

    const homeContentEN: CMSContent = {
      pageId: 'home',
      locale: 'en',
      title: 'Home',
      content: '<h1>Welcome</h1><p>Discover the best products!</p>',
      excerpt: 'Discover the best products',
      metaTitle: 'Home - AyazComm',
      metaDescription: 'Discover quality products with AyazComm',
    };

    this.pageContents.set('home', [homeContentTR, homeContentEN]);
  }

  async createPage(page: Partial<CMSPage>): Promise<CMSPage> {
    const newPage: CMSPage = {
      id: `page_${Date.now()}`,
      slug: page.slug || '',
      type: page.type || 'page',
      status: page.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pages.set(newPage.id, newPage);
    this.logger.log(`CMS page created: ${newPage.id}`);
    return newPage;
  }

  async updatePage(id: string, updates: Partial<CMSPage>): Promise<CMSPage> {
    const page = this.pages.get(id);
    if (!page) {
      throw new NotFoundException(`Page ${id} not found`);
    }

    const updatedPage = {
      ...page,
      ...updates,
      updatedAt: new Date(),
    };

    this.pages.set(id, updatedPage);
    this.logger.log(`CMS page updated: ${id}`);
    return updatedPage;
  }

  async deletePage(id: string): Promise<void> {
    if (!this.pages.has(id)) {
      throw new NotFoundException(`Page ${id} not found`);
    }

    this.pages.delete(id);
    this.pageContents.delete(id);
    this.logger.log(`CMS page deleted: ${id}`);
  }

  async getPage(id: string): Promise<CMSPage> {
    const page = this.pages.get(id);
    if (!page) {
      throw new NotFoundException(`Page ${id} not found`);
    }
    return page;
  }

  async getPageBySlug(slug: string, locale?: string): Promise<{ page: CMSPage; content?: CMSContent }> {
    for (const [id, page] of this.pages.entries()) {
      if (page.slug === slug) {
        const contents = this.pageContents.get(id) || [];
        const content = locale ? contents.find((c) => c.locale === locale) : contents[0];
        return { page, content };
      }
    }
    throw new NotFoundException(`Page with slug ${slug} not found`);
  }

  async getAllPages(filters?: { type?: string; status?: string }): Promise<CMSPage[]> {
    let pages = Array.from(this.pages.values());

    if (filters?.type) {
      pages = pages.filter((p) => p.type === filters.type);
    }

    if (filters?.status) {
      pages = pages.filter((p) => p.status === filters.status);
    }

    return pages;
  }

  async setPageContent(pageId: string, locale: string, content: Partial<CMSContent>): Promise<CMSContent> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    let contents = this.pageContents.get(pageId) || [];
    const existingIndex = contents.findIndex((c) => c.locale === locale);

    const newContent: CMSContent = {
      pageId,
      locale,
      title: content.title || '',
      content: content.content || '',
      excerpt: content.excerpt,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      metaKeywords: content.metaKeywords,
      featuredImage: content.featuredImage,
      author: content.author,
      tags: content.tags,
    };

    if (existingIndex >= 0) {
      contents[existingIndex] = newContent;
    } else {
      contents.push(newContent);
    }

    this.pageContents.set(pageId, contents);
    this.logger.log(`CMS page content set: ${pageId} (${locale})`);
    return newContent;
  }

  async getPageContent(pageId: string, locale: string): Promise<CMSContent> {
    const contents = this.pageContents.get(pageId);
    if (!contents) {
      throw new NotFoundException(`Content for page ${pageId} not found`);
    }

    const content = contents.find((c) => c.locale === locale);
    if (!content) {
      throw new NotFoundException(`Content for page ${pageId} in locale ${locale} not found`);
    }

    return content;
  }

  async createBlock(block: Partial<CMSBlock>): Promise<CMSBlock> {
    const newBlock: CMSBlock = {
      id: `block_${Date.now()}`,
      identifier: block.identifier || '',
      type: block.type || 'text',
      status: block.status || 'active',
      position: block.position || 0,
    };

    this.blocks.set(newBlock.id, newBlock);
    this.logger.log(`CMS block created: ${newBlock.id}`);
    return newBlock;
  }

  async updateBlock(id: string, updates: Partial<CMSBlock>): Promise<CMSBlock> {
    const block = this.blocks.get(id);
    if (!block) {
      throw new NotFoundException(`Block ${id} not found`);
    }

    const updatedBlock = { ...block, ...updates };
    this.blocks.set(id, updatedBlock);
    this.logger.log(`CMS block updated: ${id}`);
    return updatedBlock;
  }

  async deleteBlock(id: string): Promise<void> {
    if (!this.blocks.has(id)) {
      throw new NotFoundException(`Block ${id} not found`);
    }

    this.blocks.delete(id);
    this.blockContents.delete(id);
    this.logger.log(`CMS block deleted: ${id}`);
  }

  async setBlockContent(blockId: string, locale: string, content: Partial<CMSBlockContent>): Promise<CMSBlockContent> {
    const block = this.blocks.get(blockId);
    if (!block) {
      throw new NotFoundException(`Block ${blockId} not found`);
    }

    let contents = this.blockContents.get(blockId) || [];
    const existingIndex = contents.findIndex((c) => c.locale === locale);

    const newContent: CMSBlockContent = {
      blockId,
      locale,
      title: content.title,
      content: content.content || '',
      settings: content.settings,
    };

    if (existingIndex >= 0) {
      contents[existingIndex] = newContent;
    } else {
      contents.push(newContent);
    }

    this.blockContents.set(blockId, contents);
    this.logger.log(`CMS block content set: ${blockId} (${locale})`);
    return newContent;
  }

  async getBlockContent(blockId: string, locale: string): Promise<CMSBlockContent> {
    const contents = this.blockContents.get(blockId);
    if (!contents) {
      throw new NotFoundException(`Content for block ${blockId} not found`);
    }

    const content = contents.find((c) => c.locale === locale);
    if (!content) {
      throw new NotFoundException(`Content for block ${blockId} in locale ${locale} not found`);
    }

    return content;
  }

  async getBlockByIdentifier(identifier: string, locale: string): Promise<{ block: CMSBlock; content?: CMSBlockContent }> {
    for (const [id, block] of this.blocks.entries()) {
      if (block.identifier === identifier && block.status === 'active') {
        const contents = this.blockContents.get(id) || [];
        const content = contents.find((c) => c.locale === locale);
        return { block, content };
      }
    }
    throw new NotFoundException(`Block with identifier ${identifier} not found`);
  }

  async getAllBlocks(filters?: { type?: string; status?: string }): Promise<CMSBlock[]> {
    let blocks = Array.from(this.blocks.values());

    if (filters?.type) {
      blocks = blocks.filter((b) => b.type === filters.type);
    }

    if (filters?.status) {
      blocks = blocks.filter((b) => b.status === filters.status);
    }

    return blocks.sort((a, b) => (a.position || 0) - (b.position || 0));
  }

  async duplicatePage(pageId: string): Promise<CMSPage> {
    const originalPage = await this.getPage(pageId);
    const originalContents = this.pageContents.get(pageId) || [];

    const duplicatedPage: CMSPage = {
      ...originalPage,
      id: `page_${Date.now()}`,
      slug: `${originalPage.slug}-copy`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pages.set(duplicatedPage.id, duplicatedPage);

    const duplicatedContents = originalContents.map((content) => ({
      ...content,
      pageId: duplicatedPage.id,
    }));

    this.pageContents.set(duplicatedPage.id, duplicatedContents);
    this.logger.log(`CMS page duplicated: ${pageId} -> ${duplicatedPage.id}`);
    return duplicatedPage;
  }

  async importTranslations(locale: string, translations: Record<string, string>): Promise<number> {
    let localeTranslations = this.translations.get(locale);

    if (!localeTranslations) {
      localeTranslations = new Map();
      this.translations.set(locale, localeTranslations);
    }

    let count = 0;
    for (const [key, value] of Object.entries(translations)) {
      localeTranslations.set(key, value);
      count++;
    }

    this.logger.log(`Imported ${count} translations for locale ${locale}`);
    return count;
  }

  async exportTranslations(locale: string, namespace?: string): Promise<Record<string, string>> {
    const localeTranslations = this.translations.get(locale);
    if (!localeTranslations) {
      throw new NotFoundException(`Locale ${locale} not found`);
    }

    const result: Record<string, string> = {};

    for (const [key, value] of localeTranslations.entries()) {
      if (!namespace || key.startsWith(`${namespace}.`)) {
        result[key] = value;
      }
    }

    return result;
  }

  async getMissingTranslations(sourceLocale: string, targetLocale: string): Promise<string[]> {
    const sourceTranslations = this.translations.get(sourceLocale);
    const targetTranslations = this.translations.get(targetLocale);

    if (!sourceTranslations) {
      throw new NotFoundException(`Source locale ${sourceLocale} not found`);
    }

    if (!targetTranslations) {
      return Array.from(sourceTranslations.keys());
    }

    const missing: string[] = [];

    for (const key of sourceTranslations.keys()) {
      if (!targetTranslations.has(key)) {
        missing.push(key);
      }
    }

    return missing;
  }
}

