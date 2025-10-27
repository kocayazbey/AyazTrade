import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, or, inArray, like } from 'drizzle-orm';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId: string;
  categoryName: string;
  brandId?: string;
  brandName?: string;
  price: number;
  costPrice: number;
  compareAtPrice?: number;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  weight?: number;
  weightUnit: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  dimensionUnit: string;
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    slug: string;
  };
  status: 'draft' | 'active' | 'inactive' | 'archived';
  visibility: 'public' | 'private' | 'hidden';
  tags: string[];
  featured: boolean;
  isDigital: boolean;
  downloadUrl?: string;
  downloadLimit?: number;
  metadata: Record<string, any>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt?: string;
  sortOrder: number;
  isPrimary: boolean;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  costPrice: number;
  compareAtPrice?: number;
  stockQuantity: number;
  weight?: number;
  dimensions?: any;
  attributes: Record<string, string>;
  image?: string;
  status: 'active' | 'inactive';
  isDefault: boolean;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  isRequired: boolean;
  isVariantOption: boolean;
  sortOrder: number;
}

export interface BulkEditOperation {
  type: 'update' | 'delete' | 'status_change' | 'price_update' | 'category_change';
  productIds: string[];
  data: Record<string, any>;
  filters?: {
    categoryId?: string;
    brandId?: string;
    status?: string;
    priceRange?: { min: number; max: number };
    stockRange?: { min: number; max: number };
  };
}

export interface BulkEditResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    productId: string;
    error: string;
    operation: string;
  }>;
  summary: {
    totalProducts: number;
    categoriesUpdated: number;
    pricesUpdated: number;
    statusChanged: number;
    deleted: number;
  };
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    sku: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    sku: string;
    warning: string;
  }>;
  products: Product[];
}

@Injectable()
export class ProductsManagementService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createProduct(productData: {
    sku: string;
    name: string;
    description?: string;
    shortDescription?: string;
    categoryId: string;
    brandId?: string;
    price: number;
    costPrice: number;
    compareAtPrice?: number;
    trackInventory?: boolean;
    stockQuantity?: number;
    lowStockThreshold?: number;
    weight?: number;
    weightUnit?: string;
    dimensions?: any;
    dimensionUnit?: string;
    images?: any[];
    attributes?: any[];
    seo?: any;
    tags?: string[];
    featured?: boolean;
    isDigital?: boolean;
    downloadUrl?: string;
    downloadLimit?: number;
    metadata?: any;
  }, tenantId: string, userId: string): Promise<Product> {

    // Check if SKU already exists
    const existingProduct = await this.findProductBySKU(productData.sku, tenantId);
    if (existingProduct) {
      throw new BadRequestException(`Product with SKU ${productData.sku} already exists`);
    }

    const productId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Generate SEO slug
    const slug = this.generateSlug(productData.name);

    const [product] = await this.databaseService.drizzleClient
      .insert(this.getProductsTable())
      .values({
        id: productId,
        ...productData,
        stockStatus: this.calculateStockStatus(productData.stockQuantity || 0, productData.lowStockThreshold || 0),
        status: 'draft',
        visibility: 'private',
        featured: productData.featured || false,
        isDigital: productData.isDigital || false,
        seo: {
          ...productData.seo,
          slug
        },
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create product images
    if (productData.images && productData.images.length > 0) {
      await this.createProductImages(productId, productData.images, userId);
    }

    // Create product attributes
    if (productData.attributes && productData.attributes.length > 0) {
      await this.createProductAttributes(productId, productData.attributes, userId);
    }

    // Clear products cache
    await this.cacheService.del(`products:${tenantId}`);
    await this.cacheService.del(`product:${tenantId}:${productId}`);

    this.loggerService.log(`Product created: ${product.name} (${product.sku})`, 'ProductsManagementService');
    return await this.getProduct(productId);
  }

  async updateProduct(productId: string, updateData: Partial<Product>, tenantId: string, userId: string): Promise<Product> {
    const product = await this.getProduct(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Update SEO slug if name changed
    if (updateData.name && updateData.name !== product.name) {
      updateData.seo = {
        ...updateData.seo,
        slug: this.generateSlug(updateData.name)
      };
    }

    // Recalculate stock status if stock data changed
    if (updateData.stockQuantity !== undefined || updateData.lowStockThreshold !== undefined) {
      updateData.stockStatus = this.calculateStockStatus(
        updateData.stockQuantity || product.stockQuantity,
        updateData.lowStockThreshold || product.lowStockThreshold
      );
    }

    const [updatedProduct] = await this.databaseService.drizzleClient
      .update(this.getProductsTable())
      .set({
        ...updateData,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        this.getProductsTable().id.eq(productId),
        this.getProductsTable().tenantId.eq(tenantId)
      ))
      .returning();

    // Update product images if provided
    if (updateData.images) {
      await this.updateProductImages(productId, updateData.images, userId);
    }

    // Update product attributes if provided
    if (updateData.attributes) {
      await this.updateProductAttributes(productId, updateData.attributes, userId);
    }

    // Clear cache
    await this.cacheService.del(`product:${tenantId}:${productId}`);
    await this.cacheService.del(`products:${tenantId}`);

    this.loggerService.log(`Product updated: ${product.name} (${product.sku})`, 'ProductsManagementService');
    return await this.getProduct(productId);
  }

  async deleteProduct(productId: string, tenantId: string, userId: string): Promise<void> {
    const product = await this.getProduct(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft delete - set status to archived
    await this.databaseService.drizzleClient
      .update(this.getProductsTable())
      .set({
        status: 'archived',
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        this.getProductsTable().id.eq(productId),
        this.getProductsTable().tenantId.eq(tenantId)
      ));

    // Clear cache
    await this.cacheService.del(`product:${tenantId}:${productId}`);
    await this.cacheService.del(`products:${tenantId}`);

    this.loggerService.log(`Product deleted (archived): ${product.name} (${product.sku})`, 'ProductsManagementService');
  }

  async bulkEditProducts(operation: BulkEditOperation, tenantId: string, userId: string): Promise<BulkEditResult> {
    try {
      this.loggerService.log(`Starting bulk edit operation: ${operation.type} for ${operation.productIds.length} products`, 'ProductsManagementService');

      const result: BulkEditResult = {
        success: false,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        summary: {
          totalProducts: operation.productIds.length,
          categoriesUpdated: 0,
          pricesUpdated: 0,
          statusChanged: 0,
          deleted: 0
        }
      };

      // Get products based on IDs or filters
      const products = operation.filters
        ? await this.getProductsByFilters(operation.filters, tenantId)
        : await this.getProductsByIds(operation.productIds, tenantId);

      result.processed = products.length;

      // Process each product
      for (const product of products) {
        try {
          let updateData: any = {};

          switch (operation.type) {
            case 'update':
              updateData = operation.data;
              break;

            case 'status_change':
              updateData = { status: operation.data.status };
              break;

            case 'price_update':
              updateData = {
                price: operation.data.price,
                costPrice: operation.data.costPrice,
                compareAtPrice: operation.data.compareAtPrice
              };
              break;

            case 'category_change':
              updateData = {
                categoryId: operation.data.categoryId,
                categoryName: operation.data.categoryName
              };
              break;

            case 'delete':
              await this.deleteProduct(product.id, tenantId, userId);
              result.summary.deleted++;
              result.successful++;
              continue;
          }

          await this.updateProduct(product.id, updateData, tenantId, userId);

          // Update summary counters
          if (operation.type === 'category_change') result.summary.categoriesUpdated++;
          if (operation.type === 'price_update') result.summary.pricesUpdated++;
          if (operation.type === 'status_change') result.summary.statusChanged++;

          result.successful++;

        } catch (error) {
          result.failed++;
          result.errors.push({
            productId: product.id,
            error: error.message,
            operation: operation.type
          });
        }
      }

      result.success = result.successful > 0;

      // Clear cache
      await this.cacheService.del(`products:${tenantId}`);

      this.loggerService.log(`Bulk edit completed: ${result.successful} successful, ${result.failed} failed`, 'ProductsManagementService');

      return result;

    } catch (error) {
      this.loggerService.error(`Error in bulk edit operation`, error, 'ProductsManagementService');
      throw error;
    }
  }

  async importProducts(fileData: any, importOptions: {
    updateExisting: boolean;
    skipDuplicates: boolean;
    createCategories: boolean;
    createBrands: boolean;
  }, tenantId: string, userId: string): Promise<ImportResult> {

    try {
      this.loggerService.log(`Starting product import: ${importOptions.updateExisting ? 'with updates' : 'new only'}`, 'ProductsManagementService');

      const result: ImportResult = {
        success: false,
        imported: 0,
        updated: 0,
        failed: 0,
        errors: [],
        warnings: [],
        products: []
      };

      // Parse CSV/Excel data
      const productsData = this.parseImportData(fileData);

      for (let i = 0; i < productsData.length; i++) {
        const productData = productsData[i];

        try {
          // Check if product already exists
          const existingProduct = await this.findProductBySKU(productData.sku, tenantId);

          if (existingProduct) {
            if (importOptions.updateExisting) {
              await this.updateProduct(existingProduct.id, productData, tenantId, userId);
              result.updated++;
              result.products.push(existingProduct);
            } else if (!importOptions.skipDuplicates) {
              result.failed++;
              result.errors.push({
                row: i + 1,
                sku: productData.sku,
                error: 'Product already exists'
              });
            } else {
              result.warnings.push({
                row: i + 1,
                sku: productData.sku,
                warning: 'Product already exists, skipped'
              });
            }
          } else {
            const product = await this.createProduct(productData, tenantId, userId);
            result.imported++;
            result.products.push(product);
          }

        } catch (error) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            sku: productData.sku,
            error: error.message
          });
        }
      }

      result.success = result.imported + result.updated > 0;

      // Clear cache
      await this.cacheService.del(`products:${tenantId}`);

      this.loggerService.log(`Product import completed: ${result.imported} imported, ${result.updated} updated, ${result.failed} failed`, 'ProductsManagementService');

      return result;

    } catch (error) {
      this.loggerService.error(`Error importing products`, error, 'ProductsManagementService');
      throw error;
    }
  }

  async duplicateProduct(productId: string, modifications: Partial<Product>, tenantId: string, userId: string): Promise<Product> {
    const originalProduct = await this.getProduct(productId);
    if (!originalProduct) {
      throw new NotFoundException('Product not found');
    }

    // Generate new SKU for duplicate
    const newSku = `${originalProduct.sku}-COPY-${Date.now()}`;

    const duplicatedProduct = await this.createProduct({
      ...originalProduct,
      sku: newSku,
      name: `${originalProduct.name} (Copy)`,
      status: 'draft',
      visibility: 'private',
      featured: false,
      ...modifications
    }, tenantId, userId);

    this.loggerService.log(`Product duplicated: ${originalProduct.name} -> ${duplicatedProduct.name}`, 'ProductsManagementService');
    return duplicatedProduct;
  }

  async getProducts(filters: any, tenantId: string): Promise<{
    data: Product[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const cacheKey = `products:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = this.getProductsTable().tenantId.eq(tenantId);

    // Apply filters
    if (filters?.status) {
      whereClause = and(whereClause, this.getProductsTable().status.eq(filters.status));
    }

    if (filters?.categoryId) {
      whereClause = and(whereClause, this.getProductsTable().categoryId.eq(filters.categoryId));
    }

    if (filters?.brandId) {
      whereClause = and(whereClause, this.getProductsTable().brandId.eq(filters.brandId));
    }

    if (filters?.search) {
      whereClause = and(whereClause,
        or(
          this.getProductsTable().name.like(`%${filters.search}%`),
          this.getProductsTable().sku.like(`%${filters.search}%`),
          this.getProductsTable().description.like(`%${filters.search}%`)
        )
      );
    }

    if (filters?.priceMin) {
      whereClause = and(whereClause, this.getProductsTable().price.gte(filters.priceMin));
    }

    if (filters?.priceMax) {
      whereClause = and(whereClause, this.getProductsTable().price.lte(filters.priceMax));
    }

    if (filters?.stockStatus) {
      whereClause = and(whereClause, this.getProductsTable().stockStatus.eq(filters.stockStatus));
    }

    const [products, countResult] = await Promise.all([
      this.databaseService.drizzleClient
        .select()
        .from(this.getProductsTable())
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(this.getProductsTable().createdAt),

      this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(this.getProductsTable())
        .where(whereClause)
    ]);

    const total = Number(countResult[0].count);
    const fullProducts = await Promise.all(
      products.map(product => this.getProduct(product.id))
    );

    const result = {
      data: fullProducts.filter(Boolean),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };

    await this.cacheService.set(cacheKey, result, 900); // Cache for 15 minutes
    return result;
  }

  async getProduct(productId: string): Promise<Product> {
    const cacheKey = `product:${productId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const results = await this.databaseService.drizzleClient
      .select({
        product: this.getProductsTable(),
        image: this.getProductImagesTable(),
        variant: this.getProductVariantsTable(),
        attribute: this.getProductAttributesTable(),
        category: this.getCategoriesTable(),
        brand: this.getBrandsTable()
      })
      .from(this.getProductsTable())
      .leftJoin(this.getProductImagesTable(), this.getProductImagesTable().productId.eq(this.getProductsTable().id))
      .leftJoin(this.getProductVariantsTable(), this.getProductVariantsTable().productId.eq(this.getProductsTable().id))
      .leftJoin(this.getProductAttributesTable(), this.getProductAttributesTable().productId.eq(this.getProductsTable().id))
      .leftJoin(this.getCategoriesTable(), this.getCategoriesTable().id.eq(this.getProductsTable().categoryId))
      .leftJoin(this.getBrandsTable(), this.getBrandsTable().id.eq(this.getProductsTable().brandId))
      .where(this.getProductsTable().id.eq(productId));

    if (results.length === 0) return null;

    const productData = results[0];
    const product: Product = {
      id: productData.product.id,
      sku: productData.product.sku,
      name: productData.product.name,
      description: productData.product.description,
      shortDescription: productData.product.shortDescription,
      categoryId: productData.product.categoryId,
      categoryName: productData.category?.name || '',
      brandId: productData.product.brandId,
      brandName: productData.brand?.name || '',
      price: productData.product.price,
      costPrice: productData.product.costPrice,
      compareAtPrice: productData.product.compareAtPrice,
      trackInventory: productData.product.trackInventory,
      stockQuantity: productData.product.stockQuantity,
      lowStockThreshold: productData.product.lowStockThreshold,
      stockStatus: productData.product.stockStatus,
      weight: productData.product.weight,
      weightUnit: productData.product.weightUnit,
      dimensions: productData.product.dimensions,
      dimensionUnit: productData.product.dimensionUnit,
      images: results.filter(r => r.image).map(r => ({
        id: r.image.id,
        productId: r.image.productId,
        url: r.image.url,
        alt: r.image.alt,
        sortOrder: r.image.sortOrder,
        isPrimary: r.image.isPrimary,
        fileSize: r.image.fileSize,
        mimeType: r.image.mimeType,
        uploadedAt: r.image.uploadedAt
      })),
      variants: results.filter(r => r.variant).map(r => ({
        id: r.variant.id,
        productId: r.variant.productId,
        sku: r.variant.sku,
        name: r.variant.name,
        price: r.variant.price,
        costPrice: r.variant.costPrice,
        compareAtPrice: r.variant.compareAtPrice,
        stockQuantity: r.variant.stockQuantity,
        weight: r.variant.weight,
        dimensions: r.variant.dimensions,
        attributes: r.variant.attributes || {},
        image: r.variant.image,
        status: r.variant.status,
        isDefault: r.variant.isDefault
      })),
      attributes: results.filter(r => r.attribute).map(r => ({
        id: r.attribute.id,
        name: r.attribute.name,
        value: r.attribute.value,
        type: r.attribute.type,
        isRequired: r.attribute.isRequired,
        isVariantOption: r.attribute.isVariantOption,
        sortOrder: r.attribute.sortOrder
      })),
      seo: productData.product.seo || {},
      status: productData.product.status,
      visibility: productData.product.visibility,
      tags: productData.product.tags || [],
      featured: productData.product.featured,
      isDigital: productData.product.isDigital,
      downloadUrl: productData.product.downloadUrl,
      downloadLimit: productData.product.downloadLimit,
      metadata: productData.product.metadata || {},
      tenantId: productData.product.tenantId,
      createdBy: productData.product.createdBy,
      updatedBy: productData.product.updatedBy,
      createdAt: productData.product.createdAt,
      updatedAt: productData.product.updatedAt
    };

    await this.cacheService.set(cacheKey, product, 1800); // Cache for 30 minutes
    return product;
  }

  async getProductAnalytics(tenantId: string, days: number = 30): Promise<any> {
    const cacheKey = `product_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Product performance metrics
    const metrics = await this.databaseService.drizzleClient
      .select({
        totalProducts: sql<number>`count(*)`,
        activeProducts: sql<number>`count(*) FILTER (WHERE status = 'active')`,
        draftProducts: sql<number>`count(*) FILTER (WHERE status = 'draft')`,
        lowStockProducts: sql<number>`count(*) FILTER (WHERE stock_status = 'low_stock')`,
        outOfStockProducts: sql<number>`count(*) FILTER (WHERE stock_status = 'out_of_stock')`,
        featuredProducts: sql<number>`count(*) FILTER (WHERE featured = true)`,
        avgPrice: sql<number>`AVG(price)`,
        totalValue: sql<number>`SUM(price * stock_quantity)`,
        categoryDistribution: sql`jsonb_object_agg(category_id, product_count)`
      })
      .from(this.getProductsTable())
      .where(and(
        this.getProductsTable().tenantId.eq(tenantId),
        this.getProductsTable().createdAt.gte(startDate)
      ));

    const result = {
      totalProducts: Number(metrics[0].totalProducts) || 0,
      activeProducts: Number(metrics[0].activeProducts) || 0,
      draftProducts: Number(metrics[0].draftProducts) || 0,
      lowStockProducts: Number(metrics[0].lowStockProducts) || 0,
      outOfStockProducts: Number(metrics[0].outOfStockProducts) || 0,
      featuredProducts: Number(metrics[0].featuredProducts) || 0,
      avgPrice: Number(metrics[0].avgPrice) || 0,
      totalValue: Number(metrics[0].totalValue) || 0,
      categoryDistribution: {}, // Would parse JSON
      topSellingProducts: [], // Would calculate from order data
      slowMovingProducts: [], // Would calculate from order data
      stockTurnoverRate: 0 // Would calculate from inventory movements
    };

    await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  // Private helper methods
  private async findProductBySKU(sku: string, tenantId: string): Promise<Product | null> {
    const products = await this.databaseService.drizzleClient
      .select()
      .from(this.getProductsTable())
      .where(and(
        this.getProductsTable().sku.eq(sku),
        this.getProductsTable().tenantId.eq(tenantId)
      ))
      .limit(1);

    if (products.length === 0) return null;

    return await this.getProduct(products[0].id);
  }

  private calculateStockStatus(stockQuantity: number, lowStockThreshold: number): 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued' {
    if (stockQuantity <= 0) return 'out_of_stock';
    if (stockQuantity <= lowStockThreshold) return 'low_stock';
    return 'in_stock';
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async createProductImages(productId: string, images: any[], userId: string): Promise<void> {
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      await this.databaseService.drizzleClient
        .insert(this.getProductImagesTable())
        .values({
          id: `img-${Date.now()}-${i}`,
          productId,
          ...image,
          sortOrder: i,
          isPrimary: i === 0,
          uploadedAt: new Date()
        });
    }
  }

  private async createProductAttributes(productId: string, attributes: any[], userId: string): Promise<void> {
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];

      await this.databaseService.drizzleClient
        .insert(this.getProductAttributesTable())
        .values({
          id: `attr-${Date.now()}-${i}`,
          productId,
          ...attribute,
          sortOrder: i
        });
    }
  }

  private async updateProductImages(productId: string, images: any[], userId: string): Promise<void> {
    // Delete existing images
    await this.databaseService.drizzleClient
      .delete(this.getProductImagesTable())
      .where(this.getProductImagesTable().productId.eq(productId));

    // Create new images
    await this.createProductImages(productId, images, userId);
  }

  private async updateProductAttributes(productId: string, attributes: any[], userId: string): Promise<void> {
    // Delete existing attributes
    await this.databaseService.drizzleClient
      .delete(this.getProductAttributesTable())
      .where(this.getProductAttributesTable().productId.eq(productId));

    // Create new attributes
    await this.createProductAttributes(productId, attributes, userId);
  }

  private async getProductsByIds(productIds: string[], tenantId: string): Promise<Product[]> {
    const products = await this.databaseService.drizzleClient
      .select()
      .from(this.getProductsTable())
      .where(and(
        this.getProductsTable().tenantId.eq(tenantId),
        inArray(this.getProductsTable().id, productIds)
      ));

    return await Promise.all(
      products.map(product => this.getProduct(product.id))
    );
  }

  private async getProductsByFilters(filters: any, tenantId: string): Promise<Product[]> {
    let whereClause = this.getProductsTable().tenantId.eq(tenantId);

    if (filters.categoryId) {
      whereClause = and(whereClause, this.getProductsTable().categoryId.eq(filters.categoryId));
    }

    if (filters.brandId) {
      whereClause = and(whereClause, this.getProductsTable().brandId.eq(filters.brandId));
    }

    if (filters.status) {
      whereClause = and(whereClause, this.getProductsTable().status.eq(filters.status));
    }

    if (filters.priceRange) {
      whereClause = and(whereClause,
        this.getProductsTable().price.gte(filters.priceRange.min),
        this.getProductsTable().price.lte(filters.priceRange.max)
      );
    }

    if (filters.stockRange) {
      whereClause = and(whereClause,
        this.getProductsTable().stockQuantity.gte(filters.stockRange.min),
        this.getProductsTable().stockQuantity.lte(filters.stockRange.max)
      );
    }

    const products = await this.databaseService.drizzleClient
      .select()
      .from(this.getProductsTable())
      .where(whereClause)
      .limit(1000); // Limit for bulk operations

    return await Promise.all(
      products.map(product => this.getProduct(product.id))
    );
  }

  private async parseImportData(fileData: any): Promise<any[]> {
    // Parse CSV/Excel data
    // For now, return mock data structure
    return [
      {
        sku: 'IMPORT-SKU-001',
        name: 'Imported Product 1',
        description: 'Imported product description',
        categoryId: 'category-1',
        price: 99.99,
        costPrice: 50.00,
        stockQuantity: 100,
        trackInventory: true,
        lowStockThreshold: 10
      },
      {
        sku: 'IMPORT-SKU-002',
        name: 'Imported Product 2',
        description: 'Another imported product',
        categoryId: 'category-1',
        price: 149.99,
        costPrice: 75.00,
        stockQuantity: 50,
        trackInventory: true,
        lowStockThreshold: 5
      }
    ];
  }

  private getProductsTable() {
    return sql`products`;
  }

  private getProductImagesTable() {
    return sql`product_images`;
  }

  private getProductVariantsTable() {
    return sql`product_variants`;
  }

  private getProductAttributesTable() {
    return sql`product_attributes`;
  }

  private getCategoriesTable() {
    return sql`categories`;
  }

  private getBrandsTable() {
    return sql`brands`;
  }
}
