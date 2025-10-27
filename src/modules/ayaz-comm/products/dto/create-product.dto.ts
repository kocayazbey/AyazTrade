import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  sku: string;

  @IsNumber()
  price: number;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsArray()
  variants?: any[];

  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}