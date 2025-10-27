import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { products, productVariants, categories, brands, productImages } from '../../database/schema/products.schema';
import { reviews } from '../../database/schema/reviews.schema';

@Injectable()
export class ProductsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getProducts(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Apply pagination
    let queryBuilder = this.databaseService.drizzleClient
      .select()
      .from(products)
      .limit(limit)
      .offset(offset);
    
    const conditions = [];
    
    // Filter by status
    conditions.push(eq(products.status, query.status || 'active'));
    
    // Filter by category
    if (query.category) {
      conditions.push(eq(products.categoryId, query.category));
    }
    
    // Filter by brand
    if (query.brand) {
      conditions.push(eq(products.brandId, query.brand));
    }
    
    // Filter by price range
    if (query.minPrice) {
      conditions.push(gte(products.price, query.minPrice));
    }
    if (query.maxPrice) {
      conditions.push(lte(products.price, query.maxPrice));
    }
    
    // Filter by featured
    if (query.featured === 'true') {
      conditions.push(eq(products.isFeatured, true));
    }
    
    // Filter by stock
    if (query.inStock === 'true') {
      conditions.push(sql`${products.stockQuantity} > 0`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.databaseService.drizzleClient
      .select()
      .from(products)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(products.createdAt));

    const totalResults = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    return {
      success: true,
      data: {
        products: results,
        total: Number(totalResults[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResults[0].count) / limit)
      }
    };
  }

  async searchProducts(searchTerm: string, filters: any) {
    const conditions = [
      or(
        like(products.name, `%${searchTerm}%`),
        like(products.description, `%${searchTerm}%`),
        like(products.sku, `%${searchTerm}%`)
      )
    ];

    if (filters.category) {
      conditions.push(eq(products.categoryId, filters.category));
    }

    if (filters.status) {
      conditions.push(eq(products.status, filters.status));
    }

    let results = await this.databaseService.drizzleClient
      .select()
      .from(products)
      .where(and(...conditions))
      .limit(50);

    // Optional semantic search with pgvector if available
    if (filters.embedding && Array.isArray(filters.embedding)) {
      try {
        const vector = filters.embedding as number[];
        // Use drizzle sql template for vector search
        const vectorResults = await this.databaseService.drizzleClient.execute(
          sql`SELECT * FROM products WHERE embedding IS NOT NULL ORDER BY embedding <-> ${sql.raw(`ARRAY[${vector.join(',')}]::vector`)} LIMIT 50`
        );
        results = vectorResults as any[];
      } catch (error) {
        // If vector search fails, continue with regular search
        console.warn('Vector search failed:', error);
      }
    }

    return {
      data: results,
      total: results.length,
      searchTerm
    };
  }

  async getFeaturedProducts(limit: number) {
    const results = await this.databaseService.drizzleClient
      .select()
      .from(products)
      .where(and(
        eq(products.isFeatured, true),
        eq(products.status, 'active')
      ))
      .limit(limit);

    return {
      data: results,
      total: results.length
    };
  }

  async getCategories() {
    const results = await this.databaseService.drizzleClient
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.position));

    // Get product count for each category
    const categoriesWithCounts = await Promise.all(
      results.map(async (category) => {
        const countResult = await this.databaseService.drizzleClient
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(eq(products.categoryId, category.id));

        return {
          ...category,
          productCount: Number(countResult[0].count)
        };
      })
    );

    return {
      data: categoriesWithCounts,
      total: results.length
    };
  }

  // Note: getCategories() is defined above for public use with product counts
  // The method below was duplicate and has been removed

  async getProductById(productId: string) {
    try {
      const product = await this.databaseService.drizzleClient
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          slug: products.slug,
          description: products.description,
          shortDescription: products.shortDescription,
          price: products.price,
          compareAtPrice: products.compareAtPrice,
          costPrice: products.costPrice,
          wholesalePrice: products.wholesalePrice,
          stockQuantity: products.stockQuantity,
          lowStockThreshold: products.lowStockThreshold,
          trackInventory: products.trackInventory,
          allowBackorders: products.allowBackorders,
          categoryId: products.categoryId,
          brandId: products.brandId,
          vendorId: products.vendorId,
          weight: products.weight,
          weightUnit: products.weightUnit,
          length: products.length,
          width: products.width,
          height: products.height,
          dimensionUnit: products.dimensionUnit,
          images: products.images,
          videos: products.videos,
          featuredImage: products.featuredImage,
          status: products.status,
          visibility: products.visibility,
          isDigital: products.isDigital,
          isFeatured: products.isFeatured,
          metaTitle: products.metaTitle,
          metaDescription: products.metaDescription,
          metaKeywords: products.metaKeywords,
          hasVariants: products.hasVariants,
          options: products.options,
          attributes: products.attributes,
          averageRating: products.averageRating,
          reviewCount: products.reviewCount,
          totalSold: products.totalSold,
          viewCount: products.viewCount,
          publishedAt: products.publishedAt,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product.length) {
        throw new NotFoundException('Product not found');
      }

      // Get category and brand info
      const [category, brand] = await Promise.all([
        product[0].categoryId ? this.databaseService.drizzleClient
          .select()
          .from(categories)
          .where(eq(categories.id, product[0].categoryId))
          .limit(1) : null,
        product[0].brandId ? this.databaseService.drizzleClient
          .select()
          .from(brands)
          .where(eq(brands.id, product[0].brandId))
          .limit(1) : null
      ]);

      // Get product images
      const productImagesData = await this.databaseService.drizzleClient
        .select()
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(productImages.position);

      return {
        ...product[0],
        category: category?.[0] || null,
        brand: brand?.[0] || null,
        images: productImagesData
      };
    } catch (error) {
      console.error('Error getting product by ID', error);
      throw error;
    }
  }

  async createProduct(data: any, userId: string) {
    const [product] = await this.databaseService.drizzleClient
      .insert(products)
      .values({
        ...data,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return product;
  }

  async updateProduct(productId: string, data: any) {
    const [updatedProduct] = await this.databaseService.drizzleClient
      .update(products)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async deleteProduct(productId: string) {
    const [deletedProduct] = await this.databaseService.drizzleClient
      .update(products)
      .set({
        deletedAt: new Date(),
        status: 'archived'
      })
      .where(eq(products.id, productId))
      .returning();

    if (!deletedProduct) {
      throw new NotFoundException('Product not found');
    }

    return { id: productId, deleted: true, deletedAt: deletedProduct.deletedAt };
  }

  async getProductReviews(productId: string, query: any) {
    const conditions = [eq(reviews.productId, productId), eq(reviews.isPublic, true)];
    
    if (query.rating) {
      conditions.push(eq(reviews.rating, parseInt(query.rating)));
    }
    
    if (query.status) {
      conditions.push(eq(reviews.status, query.status));
    } else {
      conditions.push(eq(reviews.status, 'approved'));
    }

    const results = await this.databaseService.drizzleClient
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt))
      .limit(query.limit || 50);

    // Calculate average rating
    const avgResult = await this.databaseService.drizzleClient
      .select({ avg: sql<number>`avg(${reviews.rating})` })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')));

    // Get rating distribution
    const distribution = await this.databaseService.drizzleClient
      .select({
        rating: reviews.rating,
        count: sql<number>`count(*)`
      })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
      .groupBy(reviews.rating);

    const ratingDistribution = {};
    for (const dist of distribution) {
      ratingDistribution[dist.rating] = Number(dist.count);
    }

    return {
      data: results,
      total: results.length,
      averageRating: Number(avgResult[0].avg) || 0,
      ratingDistribution
    };
  }

  async addProductReview(productId: string, data: any, userId: string) {
    const [review] = await this.databaseService.drizzleClient
      .insert(reviews)
      .values({
        productId,
        customerId: userId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        status: 'pending',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return review;
  }

  async requestRefund(orderId: string, refundData: any, userId: string) {
    // Refund logic here
    return { message: 'Refund request submitted' };
  }

  // Categories CRUD operations (already defined above, keeping only create/update/delete here)
  async createCategory(data: any) {
    const [category] = await this.databaseService.drizzleClient
      .insert(categories)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return category;
  }

  async updateCategory(id: string, data: any) {
    const [category] = await this.databaseService.drizzleClient
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    
    return category;
  }

  async deleteCategory(id: string) {
    await this.databaseService.drizzleClient
      .delete(categories)
      .where(eq(categories.id, id));
    
    return { message: 'Category deleted successfully' };
  }

  // Brands CRUD operations
  async getBrands() {
    return await this.databaseService.drizzleClient
      .select()
      .from(brands)
      .orderBy(asc(brands.name));
  }

  async bulkCreateProducts(productsData: any[]) {
    return await this.databaseService.transaction(async (tx) => {
      const createdProducts = [];
      for (const productData of productsData) {
        const [product] = await tx
          .insert(products)
          .values({
            ...productData,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        createdProducts.push(product);
      }
      return createdProducts;
    });
  }

  async bulkUpdateProducts(updates: Array<{ id: string; data: any }>) {
    return await this.databaseService.transaction(async (tx) => {
      const updatedProducts = [];
      for (const update of updates) {
        const [product] = await tx
          .update(products)
          .set({
            ...update.data,
            updatedAt: new Date(),
          })
          .where(eq(products.id, update.id))
          .returning();
        if (product) updatedProducts.push(product);
      }
      return updatedProducts;
    });
  }

  async bulkDeleteProducts(productIds: string[]) {
    return await this.databaseService.transaction(async (tx) => {
      const deletedProducts = [];
      for (const productId of productIds) {
        const [product] = await tx
          .update(products)
          .set({
            deletedAt: new Date(),
            status: 'archived',
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId))
          .returning();
        if (product) deletedProducts.push({ id: productId, deleted: true });
      }
      return deletedProducts;
    });
  }

  async createBrand(data: any) {
    const [brand] = await this.databaseService.drizzleClient
      .insert(brands)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return brand;
  }

  async updateBrand(id: string, data: any) {
    const [brand] = await this.databaseService.drizzleClient
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    
    return brand;
  }

  async updateProductStatus(productId: string, status: string) {
    const [product] = await this.databaseService.drizzleClient
      .update(products)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async deleteBrand(id: string) {
    await this.databaseService.drizzleClient
      .delete(brands)
      .where(eq(brands.id, id));

    return { message: 'Brand deleted successfully' };
  }
}