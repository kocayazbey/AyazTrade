import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CartItemUpdateDto {
  @IsString()
  itemId: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  price?: number;
}
