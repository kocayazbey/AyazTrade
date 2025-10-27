import { IsNumber, IsOptional } from 'class-validator';

export class CartTotalDto {
  @IsNumber()
  subtotal: number;

  @IsNumber()
  tax: number;

  @IsNumber()
  shipping: number;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsNumber()
  discount?: number;
}
