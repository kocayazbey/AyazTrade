import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CartItemListDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
