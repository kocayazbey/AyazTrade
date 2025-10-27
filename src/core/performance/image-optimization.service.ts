import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

interface ImageOptimizationConfig {
  quality: number;
  format: 'webp' | 'jpeg' | 'png' | 'avif';
  maxWidth: number;
  maxHeight: number;
  enableLazyLoading: boolean;
  enableResponsive: boolean;
}

interface OptimizedImage {
  originalUrl: string;
  optimizedUrl: string;
  formats: {
    webp: string;
    jpeg: string;
    png: string;
  };
  sizes: {
    small: string;
    medium: string;
    large: string;
  };
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);
  private readonly defaultConfig: ImageOptimizationConfig = {
    quality: 85,
    format: 'webp',
    maxWidth: 1920,
    maxHeight: 1080,
    enableLazyLoading: true,
    enableResponsive: true,
  };

  constructor(private readonly cacheService: CacheService) {}

  async optimizeImage(
    imageUrl: string,
    config: Partial<ImageOptimizationConfig> = {}
  ): Promise<OptimizedImage> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const cacheKey = `optimized_image:${imageUrl}:${JSON.stringify(finalConfig)}`;

    try {
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached.toString());
      }

      // In a real implementation, this would use Sharp or similar library
      const optimizedImage = await this.processImage(imageUrl, finalConfig);

      // Cache the result
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(optimizedImage),
        24 * 60 * 60 // 24 hours
      );

      return optimizedImage;
    } catch (error) {
      this.logger.error('Image optimization error:', error);
      throw new Error('Failed to optimize image');
    }
  }

  async generateResponsiveImages(imageUrl: string): Promise<any> {
    const sizes = [
      { name: 'small', width: 480, height: 320 },
      { name: 'medium', width: 768, height: 512 },
      { name: 'large', width: 1200, height: 800 },
      { name: 'xlarge', width: 1920, height: 1280 },
    ];

    const responsiveImages: any = {};

    for (const size of sizes) {
      const optimized = await this.optimizeImage(imageUrl, {
        maxWidth: size.width,
        maxHeight: size.height,
        quality: 85,
      });

      responsiveImages[size.name] = {
        url: optimized.optimizedUrl,
        width: size.width,
        height: size.height,
        sizes: `(max-width: ${size.width}px) 100vw, ${size.width}px`,
      };
    }

    return responsiveImages;
  }

  async generateWebpImages(imageUrl: string): Promise<any> {
    const formats = ['webp', 'jpeg', 'png'];
    const webpImages: any = {};

    for (const format of formats) {
      const optimized = await this.optimizeImage(imageUrl, {
        format: format as any,
        quality: 85,
      });

      webpImages[format] = {
        url: optimized.optimizedUrl,
        format: format,
        quality: 85,
      };
    }

    return webpImages;
  }

  async generateLazyLoadConfig(images: string[]): Promise<any> {
    return {
      images: images.map((url, index) => ({
        src: url,
        loading: 'lazy',
        decoding: 'async',
        dataIndex: index,
        placeholder: this.generatePlaceholder(url),
      })),
      intersectionObserver: {
        rootMargin: '50px',
        threshold: 0.1,
      },
    };
  }

  async generateImagePreloadConfig(criticalImages: string[]): Promise<any> {
    return {
      preload: criticalImages.map(url => ({
        href: url,
        as: 'image',
        type: 'image/webp',
        crossorigin: 'anonymous',
      })),
      prefetch: criticalImages.map(url => ({
        href: url,
        as: 'image',
        type: 'image/webp',
        crossorigin: 'anonymous',
      })),
    };
  }

  async analyzeImagePerformance(images: string[]): Promise<any> {
    const analysis = {
      totalImages: images.length,
      totalSize: 0,
      recommendations: [] as string[],
      optimizedImages: [] as any[],
    };

    for (const imageUrl of images) {
      try {
        const optimized = await this.optimizeImage(imageUrl);
        analysis.totalSize += optimized.metadata.size;
        analysis.optimizedImages.push(optimized);

        if (optimized.metadata.size > 500 * 1024) { // 500KB
          analysis.recommendations.push(
            `Image ${imageUrl} is large (${Math.round(optimized.metadata.size / 1024)}KB). Consider further optimization.`
          );
        }
      } catch (error) {
        this.logger.error(`Error analyzing image ${imageUrl}:`, error);
      }
    }

    if (analysis.totalSize > 5 * 1024 * 1024) { // 5MB
      analysis.recommendations.push(
        'Total image size is large. Consider implementing progressive loading.'
      );
    }

    return analysis;
  }

  private async processImage(
    imageUrl: string,
    config: ImageOptimizationConfig
  ): Promise<OptimizedImage> {
    // Mock implementation - in real scenario, use Sharp or similar
    return {
      originalUrl: imageUrl,
      optimizedUrl: `${imageUrl}?optimized=true&q=${config.quality}&w=${config.maxWidth}`,
      formats: {
        webp: `${imageUrl}?format=webp&q=${config.quality}`,
        jpeg: `${imageUrl}?format=jpeg&q=${config.quality}`,
        png: `${imageUrl}?format=png&q=${config.quality}`,
      },
      sizes: {
        small: `${imageUrl}?w=480&h=320&q=${config.quality}`,
        medium: `${imageUrl}?w=768&h=512&q=${config.quality}`,
        large: `${imageUrl}?w=1200&h=800&q=${config.quality}`,
      },
      metadata: {
        width: config.maxWidth,
        height: config.maxHeight,
        size: 1024 * 100, // Mock size
        format: config.format,
      },
    };
  }

  private generatePlaceholder(imageUrl: string): string {
    // Generate a low-quality placeholder
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#f0f0f0"/>
        <text x="50" y="50" text-anchor="middle" fill="#999">Loading...</text>
      </svg>`
    ).toString('base64')}`;
  }

  async generateImageManifest(images: string[]): Promise<any> {
    const manifest = {
      version: '1.0',
      images: images.map((url, index) => ({
        id: `image_${index}`,
        url,
        optimized: true,
        formats: ['webp', 'jpeg', 'png'],
        sizes: ['small', 'medium', 'large'],
      })),
    };

    return manifest;
  }
}
