import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SchemaMarkupService {
  private readonly logger = new Logger(SchemaMarkupService.name);
  private baseUrl: string;
  private organizationName: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('APP_URL') || 'https://yourstore.com';
    this.organizationName = this.configService.get<string>('ORGANIZATION_NAME') || 'Your Store';
  }

  generateProductSchema(product: any): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images || [],
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: product.brand || this.organizationName,
      },
      offers: {
        '@type': 'Offer',
        url: `${this.baseUrl}/products/${product.slug}`,
        priceCurrency: product.currency || 'TRY',
        price: product.price,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availability: product.stockQuantity > 0 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
      aggregateRating: product.averageRating && product.reviewCount > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: product.averageRating,
        reviewCount: product.reviewCount,
        bestRating: '5',
        worstRating: '1',
      } : undefined,
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  generateOrganizationSchema(org: any): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: org.name || this.organizationName,
      url: this.baseUrl,
      logo: org.logo || `${this.baseUrl}/logo.png`,
      description: org.description,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: org.phone,
        contactType: 'customer service',
        email: org.email,
        availableLanguage: ['Turkish', 'English'],
      },
      sameAs: org.socialMedia || [],
      address: org.address ? {
        '@type': 'PostalAddress',
        streetAddress: org.address.street,
        addressLocality: org.address.city,
        addressRegion: org.address.state,
        postalCode: org.address.zip,
        addressCountry: org.address.country,
      } : undefined,
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  generateWebsiteSchema(): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: this.baseUrl,
      name: this.organizationName,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  generateReviewSchema(review: any): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'Product',
        name: review.productName,
        image: review.productImage,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: '5',
        worstRating: '1',
      },
      author: {
        '@type': 'Person',
        name: review.authorName,
      },
      reviewBody: review.comment,
      datePublished: review.createdAt,
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  generateOfferCatalogSchema(products: any[]): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      name: 'Product Catalog',
      itemListElement: products.map((product) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name: product.name,
          image: product.featuredImage,
          sku: product.sku,
        },
        price: product.price,
        priceCurrency: product.currency || 'TRY',
        availability: product.stockQuantity > 0 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/OutOfStock',
      })),
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  generateFAQSchema(faqs: Array<{ question: string; answer: string }>): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  generateLocalBusinessSchema(business: any): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: business.name || this.organizationName,
      image: business.image,
      '@id': this.baseUrl,
      url: this.baseUrl,
      telephone: business.phone,
      priceRange: business.priceRange || '$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: business.address.street,
        addressLocality: business.address.city,
        addressRegion: business.address.state,
        postalCode: business.address.zip,
        addressCountry: business.address.country,
      },
      geo: business.geo ? {
        '@type': 'GeoCoordinates',
        latitude: business.geo.latitude,
        longitude: business.geo.longitude,
      } : undefined,
      openingHoursSpecification: business.hours || [],
    };

    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }
}

