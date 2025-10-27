import { IsString } from 'class-validator';

export class RemoveItemDto {
  @IsString()
  itemId: string;
}
