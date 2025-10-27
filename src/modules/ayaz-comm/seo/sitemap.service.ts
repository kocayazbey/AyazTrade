import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create } from 'xmlbuilder2';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{
    loc: string;
    title?: string;
    caption?: string;
  }>;
}

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://yourstore.com';
  }

  async generateSitemap(urls: SitemapUrl[]): Promise<string> {
    try {
      const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('urlset', {
          xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
          'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1',
        });

      for (const url of urls) {
        const urlElement = root.ele('url');
        urlElement.ele('loc').txt(url.loc);

        if (url.lastmod) {
          urlElement.ele('lastmod').txt(url.lastmod);
        }

        if (url.changefreq) {
          urlElement.ele('changefreq').txt(url.changefreq);
        }

        if (url.priority !== undefined) {
          urlElement.ele('priority').txt(url.priority.toString());
        }

        if (url.images && url.images.length > 0) {
          for (const image of url.images) {
            const imageElement = urlElement.ele('image:image');
            imageElement.ele('image:loc').txt(image.loc);
            if (image.title) {
              imageElement.ele('image:title').txt(image.title);
            }
            if (image.caption) {
              imageElement.ele('image:caption').txt(image.caption);
            }
          }
        }
      }

      const xml = root.end({ prettyPrint: true });
      this.logger.log(`Sitemap generated with ${urls.length} URLs`);
      return xml;
    } catch (error) {
      this.logger.error('Sitemap generation error:', error);
      throw error;
    }
  }

  async generateProductsSitemap(products: any[]): Promise<string> {
    const urls: SitemapUrl[] = products.map((product) => ({
      loc: `${this.baseUrl}/products/${product.slug}`,
      lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
      changefreq: 'weekly',
      priority: product.isFeatured ? 0.9 : 0.7,
      images: product.images?.map((img: string) => ({
        loc: img,
        title: product.name,
        caption: product.shortDescription,
      })),
    }));

    return this.generateSitemap(urls);
  }

  async generateCategoriesSitemap(categories: any[]): Promise<string> {
    const urls: SitemapUrl[] = categories.map((category) => ({
      loc: `${this.baseUrl}/categories/${category.slug}`,
      lastmod: category.updatedAt ? new Date(category.updatedAt).toISOString() : undefined,
      changefreq: 'weekly',
      priority: category.level === 0 ? 0.8 : 0.6,
    }));

    return this.generateSitemap(urls);
  }

  async generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: string }>): Promise<string> {
    try {
      const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('sitemapindex', {
          xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        });

      for (const sitemap of sitemaps) {
        const sitemapElement = root.ele('sitemap');
        sitemapElement.ele('loc').txt(sitemap.loc);
        if (sitemap.lastmod) {
          sitemapElement.ele('lastmod').txt(sitemap.lastmod);
        }
      }

      return root.end({ prettyPrint: true });
    } catch (error) {
      this.logger.error('Sitemap index generation error:', error);
      throw error;
    }
  }

  async generateStaticPagesSitemap(): Promise<string> {
    const pages = [
      { path: '/', priority: 1.0, changefreq: 'daily' as const },
      { path: '/about', priority: 0.8, changefreq: 'monthly' as const },
      { path: '/contact', priority: 0.8, changefreq: 'monthly' as const },
      { path: '/shipping', priority: 0.6, changefreq: 'monthly' as const },
      { path: '/returns', priority: 0.6, changefreq: 'monthly' as const },
      { path: '/privacy', priority: 0.5, changefreq: 'yearly' as const },
      { path: '/terms', priority: 0.5, changefreq: 'yearly' as const },
    ];

    const urls: SitemapUrl[] = pages.map((page) => ({
      loc: `${this.baseUrl}${page.path}`,
      lastmod: new Date().toISOString(),
      changefreq: page.changefreq,
      priority: page.priority,
    }));

    return this.generateSitemap(urls);
  }

  generateRobotsTxt(sitemapUrl: string): string {
    return `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /cart/
Disallow: /account/

Sitemap: ${sitemapUrl}
`;
  }
}

