import { IsString } from 'class-validator';

export class CartItemRemoveDto {
  @IsString()
  itemId: string;
}
