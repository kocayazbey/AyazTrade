import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CartItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  variantId?: string;
}
