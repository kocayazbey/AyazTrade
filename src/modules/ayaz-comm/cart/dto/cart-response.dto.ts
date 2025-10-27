import { IsString, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class CartResponseDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemResponseDto)
  items: CartItemResponseDto[];

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  totalItems: number;
}
