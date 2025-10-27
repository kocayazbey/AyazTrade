import { IsOptional, IsString } from 'class-validator';

export class ClearCartDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
