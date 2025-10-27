import { IsUUID, IsNumber, IsOptional } from 'class-validator';

export class AddItemDto {
  @IsUUID()
  cartId: string;

  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}
