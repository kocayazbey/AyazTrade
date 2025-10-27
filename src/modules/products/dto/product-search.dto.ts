import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductSortBy {
  NAME = 'name',
  PRICE = 'price',
  STOCK = 'stock',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SALES_COUNT = 'salesCount',
  VIEW_COUNT = 'viewCount',
  AVERAGE_RATING = 'averageRating'
}

export enum ProductSortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export class ProductSearchDto {
  @ApiPropertyOptional({ description: 'Search query', example: 'MacBook Pro' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category ID filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Category IDs filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Brand filter' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Brands filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brands?: string[];

  @ApiPropertyOptional({ description: 'Product status filter' })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: 'Product statuses filter' })
  @IsOptional()
  @IsArray()
  @IsEnum(ProductStatus, { each: true })
  statuses?: ProductStatus[];

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Price range filter [min, max]' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Type(() => Number)
  priceRange?: [number, number];

  @ApiPropertyOptional({ description: 'Minimum stock filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @ApiPropertyOptional({ description: 'Maximum stock filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxStock?: number;

  @ApiPropertyOptional({ description: 'Low stock filter' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'Low stock threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ description: 'Featured products filter' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Minimum rating filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ description: 'Minimum sales count filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minSales?: number;

  @ApiPropertyOptional({ description: 'Maximum sales count filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxSales?: number;

  @ApiPropertyOptional({ description: 'Minimum view count filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minViews?: number;

  @ApiPropertyOptional({ description: 'Maximum view count filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxViews?: number;

  @ApiPropertyOptional({ description: 'Tags filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Created date from' })
  @IsOptional()
  @Type(() => Date)
  createdFrom?: Date;

  @ApiPropertyOptional({ description: 'Created date to' })
  @IsOptional()
  @Type(() => Date)
  createdTo?: Date;

  @ApiPropertyOptional({ description: 'Updated date from' })
  @IsOptional()
  @Type(() => Date)
  updatedFrom?: Date;

  @ApiPropertyOptional({ description: 'Updated date to' })
  @IsOptional()
  @Type(() => Date)
  updatedTo?: Date;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(ProductSortOrder)
  sortOrder?: ProductSortOrder;

  @ApiPropertyOptional({ description: 'Include variants' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeVariants?: boolean;

  @ApiPropertyOptional({ description: 'Include images' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeImages?: boolean;

  @ApiPropertyOptional({ description: 'Include reviews' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeReviews?: boolean;

  @ApiPropertyOptional({ description: 'Include SEO data' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSeo?: boolean;

  @ApiPropertyOptional({ description: 'Include analytics' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAnalytics?: boolean;

  @ApiPropertyOptional({ description: 'Include category data' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCategory?: boolean;

  @ApiPropertyOptional({ description: 'Search in variants' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  searchInVariants?: boolean;

  @ApiPropertyOptional({ description: 'Search in tags' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  searchInTags?: boolean;

  @ApiPropertyOptional({ description: 'Search in attributes' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  searchInAttributes?: boolean;

  @ApiPropertyOptional({ description: 'Exact match search' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  exactMatch?: boolean;

  @ApiPropertyOptional({ description: 'Case sensitive search' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  caseSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Fuzzy search' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  fuzzySearch?: boolean;

  @ApiPropertyOptional({ description: 'Highlight search results' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  highlight?: boolean;

  @ApiPropertyOptional({ description: 'Search suggestions' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  suggestions?: boolean;

  @ApiPropertyOptional({ description: 'Faceted search' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  facets?: boolean;
}
