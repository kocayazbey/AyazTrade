import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'main', enum: ['main', 'distribution', 'production', 'returns'], required: false })
  @IsOptional()
  @IsEnum(['main', 'distribution', 'production', 'returns'])
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalArea?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  usableArea?: number;
}

