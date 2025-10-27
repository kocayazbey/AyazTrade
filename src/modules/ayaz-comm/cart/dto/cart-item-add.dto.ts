import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CartItemAddDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  variantId?: string;
}
