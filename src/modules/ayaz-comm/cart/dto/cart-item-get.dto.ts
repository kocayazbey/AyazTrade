import { IsString } from 'class-validator';

export class CartItemGetDto {
  @IsString()
  itemId: string;
}
