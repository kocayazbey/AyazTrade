import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { productVariants, products } from '../../../database/schema/products.schema';
import { eq, and, sql } from 'drizzle-orm';

export interface CreateVariantDto {
  productId: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stockQuantity: number;
  attributes: Record<string, any>;
  images?: string[];
  isActive?: boolean;
}

export interface UpdateVariantDto {
  sku?: string;
  name?: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  attributes?: Record<string, any>;
  images?: string[];
  isActive?: boolean;
}

export interface VariantFilters {
  productId?: string;
  sku?: string;
  isActive?: boolean;
  lowStock?: boolean;
  priceRange?: {
    min: number;
    max: number;
  };
}

@Injectable()
export class ProductVariantsService {
  private readonly logger = new Logger(ProductVariantsService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase
  ) {}

  async createVariant(createVariantDto: CreateVariantDto): Promise<any> {
    try {
      // Check if product exists
      const product = await this.db.select().from(products).where(eq(products.id, createVariantDto.productId)).limit(1);
      if (product.length === 0) {
        throw new NotFoundException('Product not found');
      }

      // Check if SKU already exists
      const existingVariant = await this.db.select().from(productVariants).where(eq(productVariants.sku, createVariantDto.sku)).limit(1);
      if (existingVariant.length > 0) {
        throw new BadRequestException('SKU already exists');
      }

      const variant = await this.db.insert(productVariants).values({
        productId: createVariantDto.productId,
        sku: createVariantDto.sku,
        name: createVariantDto.name,
        price: createVariantDto.price.toString(),
        compareAtPrice: createVariantDto.compareAtPrice?.toString(),
        costPrice: createVariantDto.costPrice?.toString(),
        stockQuantity: createVariantDto.stockQuantity,
        options: createVariantDto.attributes || {},
        image: createVariantDto.images?.[0] || null,
        isActive: createVariantDto.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.log(`Product variant created: ${variant[0].id}`);
      return variant[0];
    } catch (error) {
      this.logger.error(`Error creating product variant: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVariantsByProduct(productId: string): Promise<any[]> {
    try {
      const variants = await this.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
        .orderBy(productVariants.createdAt);

      return variants;
    } catch (error) {
      this.logger.error(`Error getting variants by product: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVariantById(id: string): Promise<any> {
    try {
      const variant = await this.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, id))
        .limit(1);

      if (variant.length === 0) {
        throw new NotFoundException('Product variant not found');
      }

      return variant[0];
    } catch (error) {
      this.logger.error(`Error getting variant by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVariantBySku(sku: string): Promise<any> {
    try {
      const variant = await this.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.sku, sku))
        .limit(1);

      if (variant.length === 0) {
        throw new NotFoundException('Product variant not found');
      }

      return variant[0];
    } catch (error) {
      this.logger.error(`Error getting variant by SKU: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateVariant(id: string, updateVariantDto: UpdateVariantDto): Promise<any> {
    try {
      const existingVariant = await this.getVariantById(id);

      // Check if new SKU already exists (if changing SKU)
      if (updateVariantDto.sku && updateVariantDto.sku !== existingVariant.sku) {
        const existingSku = await this.db.select().from(productVariants).where(eq(productVariants.sku, updateVariantDto.sku)).limit(1);
        if (existingSku.length > 0) {
          throw new BadRequestException('SKU already exists');
        }
      }

      const updatedVariant = await this.db
        .update(productVariants)
        .set({
          ...updateVariantDto,
          price: updateVariantDto.price?.toString(),
          compareAtPrice: updateVariantDto.compareAtPrice?.toString(),
          costPrice: updateVariantDto.costPrice?.toString(),
          options: updateVariantDto.attributes || {},
          updatedAt: new Date()
        })
        .where(eq(productVariants.id, id))
        .returning();

      this.logger.log(`Product variant updated: ${id}`);
      return updatedVariant[0];
    } catch (error) {
      this.logger.error(`Error updating product variant: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteVariant(id: string): Promise<void> {
    try {
      const variant = await this.getVariantById(id);
      
      await this.db
        .delete(productVariants)
        .where(eq(productVariants.id, id));

      this.logger.log(`Product variant deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting product variant: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateStock(variantId: string, quantity: number, operation: 'add' | 'subtract' | 'set' = 'set'): Promise<any> {
    try {
      const variant = await this.getVariantById(variantId);
      
      let newStock: number;
      switch (operation) {
        case 'add':
          newStock = variant.stockQuantity + quantity;
          break;
        case 'subtract':
          newStock = Math.max(0, variant.stockQuantity - quantity);
          break;
        case 'set':
        default:
          newStock = Math.max(0, quantity);
          break;
      }

      const updatedVariant = await this.db
        .update(productVariants)
        .set({
          stockQuantity: newStock,
          updatedAt: new Date()
        })
        .where(eq(productVariants.id, variantId))
        .returning();

      this.logger.log(`Stock updated for variant ${variantId}: ${variant.stockQuantity} → ${newStock}`);
      return updatedVariant[0];
    } catch (error) {
      this.logger.error(`Error updating stock: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkStock(variantId: string, quantity: number): Promise<boolean> {
    try {
      const variant = await this.getVariantById(variantId);
      return variant.stockQuantity >= quantity;
    } catch (error) {
      this.logger.error(`Error checking stock: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getLowStockVariants(threshold: number = 10): Promise<any[]> {
    try {
      const variants = await this.db
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.isActive, true),
            sql`${productVariants.stockQuantity} <= ${threshold}`
          )
        )
        .orderBy(productVariants.stockQuantity);

      return variants;
    } catch (error) {
      this.logger.error(`Error getting low stock variants: ${error.message}`, error.stack);
      throw error;
    }
  }

  async searchVariants(filters: VariantFilters, page: number = 1, pageSize: number = 20): Promise<{ variants: any[]; total: number }> {
    try {
      const conditions = [];
      
      if (filters.productId) {
        conditions.push(eq(productVariants.productId, filters.productId));
      }
      
      if (filters.sku) {
        conditions.push(sql`${productVariants.sku} ILIKE ${`%${filters.sku}%`}`);
      }
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(productVariants.isActive, filters.isActive));
      }
      
      if (filters.lowStock) {
        conditions.push(sql`${productVariants.stockQuantity} <= 10`);
      }
      
      if (filters.priceRange) {
        conditions.push(
          sql`${productVariants.price} >= ${filters.priceRange.min} AND ${productVariants.price} <= ${filters.priceRange.max}`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const variants = await this.db
        .select()
        .from(productVariants)
        .where(whereClause)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy(productVariants.createdAt);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(productVariants)
        .where(whereClause);

      return {
        variants,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      this.logger.error(`Error searching variants: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVariantStats(): Promise<any> {
    try {
      const stats = await this.db
        .select({
          totalVariants: sql<number>`count(*)`,
          activeVariants: sql<number>`count(*) FILTER (WHERE ${productVariants.isActive} = true)`,
          lowStockVariants: sql<number>`count(*) FILTER (WHERE ${productVariants.stockQuantity} <= 10)`,
          outOfStockVariants: sql<number>`count(*) FILTER (WHERE ${productVariants.stockQuantity} = 0)`,
          totalStockValue: sql<number>`sum(${productVariants.stockQuantity} * ${productVariants.price})`
        })
        .from(productVariants);

      return stats[0];
    } catch (error) {
      this.logger.error(`Error getting variant stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateVariantSku(productId: string, attributes: Record<string, any>): Promise<string> {
    try {
      const product = await this.db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (product.length === 0) {
        throw new NotFoundException('Product not found');
      }

      const baseSku = product[0].sku;
      const attributeKeys = Object.keys(attributes).sort();
      const attributeValues = attributeKeys.map(key => attributes[key]).join('-');
      
      return `${baseSku}-${attributeValues}`.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    } catch (error) {
      this.logger.error(`Error generating variant SKU: ${error.message}`, error.stack);
      throw error;
    }
  }

  async bulkUpdateStock(updates: Array<{ variantId: string; quantity: number; operation: 'add' | 'subtract' | 'set' }>): Promise<any[]> {
    try {
      const results = [];
      
      for (const update of updates) {
        const result = await this.updateStock(update.variantId, update.quantity, update.operation);
        results.push(result);
      }

      this.logger.log(`Bulk stock update completed for ${updates.length} variants`);
      return results;
    } catch (error) {
      this.logger.error(`Error in bulk stock update: ${error.message}`, error.stack);
      throw error;
    }
  }
}