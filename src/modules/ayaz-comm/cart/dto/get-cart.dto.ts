import { IsOptional, IsString } from 'class-validator';

export class GetCartDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
