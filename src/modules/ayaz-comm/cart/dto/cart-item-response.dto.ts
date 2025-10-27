import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CartItemResponseDto {
  @IsString()
  id: string;

  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  variantId?: string;
}
