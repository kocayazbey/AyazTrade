import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { CacheService } from '@/core/cache/cache.service';
import { DatabaseService } from '../../../core/database/database.service';
import { CategoryTreeService } from './category-tree.service';
import { categories } from '../../../database/schema/products.schema';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly treeService: CategoryTreeService,
  ) {}

  async create(createCategoryDto: any): Promise<any> {
    const slug = this.generateSlug(createCategoryDto.name);
    const level = await this.calculateLevel(createCategoryDto.parentId);
    const path = await this.calculatePath(createCategoryDto.parentId, slug);

    const [newCategory] = await this.databaseService.drizzleClient
      .insert(categories)
      .values({
        ...createCategoryDto,
        slug,
        level,
        path,
      })
      .returning();

    // Invalidate cache
    await this.cacheService.del('categories:*');

    return newCategory;
  }

  async findAll(): Promise<any[]> {
    const cacheKey = 'categories:all';
    
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached as any[];
    }

    const categories = await this.queryCategories();

    await this.cacheService.set(cacheKey, categories, 3600); // 1 hour

    return categories;
  }

  async findOne(id: string): Promise<any> {
    const cacheKey = `category:${id}`;
    
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached as any[];
    }

    const category = await this.getCategory(id);
    
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.cacheService.set(cacheKey, category, 3600);

    return category;
  }

  async findBySlug(slug: string): Promise<any> {
    const cacheKey = `category:slug:${slug}`;
    
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached as any[];
    }

    const category = await this.getCategoryBySlug(slug);
    
    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    await this.cacheService.set(cacheKey, category, 3600);

    return category;
  }

  async getTree(): Promise<any[]> {
    const cacheKey = 'categories:tree';
    
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached as any[];
    }

    const categories = await this.findAll();
    const tree = this.treeService.buildTree(categories);

    await this.cacheService.set(cacheKey, tree, 3600);

    return tree;
  }

  async getChildren(parentId: string): Promise<any[]> {
    const categories = await this.findAll();
    return categories.filter(cat => cat.parentId === parentId);
  }

  async getBreadcrumbs(categoryId: string): Promise<any[]> {
    const category = await this.findOne(categoryId);
    const breadcrumbs = [];

    let current = category;
    while (current) {
      breadcrumbs.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug,
      });

      if (current.parentId) {
        current = await this.findOne(current.parentId);
      } else {
        current = null;
      }
    }

    return breadcrumbs;
  }

  async update(id: string, updateCategoryDto: any): Promise<any> {
    const updateData: any = { ...updateCategoryDto, updatedAt: new Date() };

    // Recalculate level and path if parent changed
    if (updateCategoryDto.parentId !== undefined) {
      const existing = await this.getCategory(id);
      updateData.level = await this.calculateLevel(updateCategoryDto.parentId);
      updateData.path = await this.calculatePath(updateCategoryDto.parentId, existing?.slug || updateCategoryDto.slug);
    }

    const [updated] = await this.databaseService.drizzleClient
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Invalidate caches
    await this.cacheService.del('categories:*');
    await this.cacheService.del(`category:${id}`);

    return updated;
  }

  async remove(id: string): Promise<void> {
    // Check for children
    const children = await this.getChildren(id);
    
    if (children.length > 0) {
      throw new Error('Cannot delete category with children');
    }

    // Soft delete
    await this.databaseService.drizzleClient
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, id));

    // Invalidate caches
    await this.cacheService.del('categories:*');
    await this.cacheService.del(`category:${id}`);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async calculateLevel(parentId?: string): Promise<number> {
    if (!parentId) {
      return 0;
    }

    const parent = await this.findOne(parentId);
    return parent.level + 1;
  }

  private async calculatePath(parentId: string | undefined, slug: string): Promise<string> {
    if (!parentId) {
      return slug;
    }

    const parent = await this.findOne(parentId);
    return `${parent.path}/${slug}`;
  }

  private async queryCategories(): Promise<any[]> {
    const allCategories = await this.databaseService.drizzleClient
      .select()
      .from(categories)
      .where(eq(categories.isActive, true));

    return allCategories;
  }

  private async getCategory(id: string): Promise<any> {
    const [category] = await this.databaseService.drizzleClient
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.isActive, true)))
      .limit(1);

    return category || null;
  }

  private async getCategoryBySlug(slug: string): Promise<any> {
    const [category] = await this.databaseService.drizzleClient
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
      .limit(1);

    return category || null;
  }
}

