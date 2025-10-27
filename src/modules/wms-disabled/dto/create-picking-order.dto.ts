import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PickingItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  requestedQuantity: number;
}

export class CreatePickingOrderDto {
  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty()
  @IsString()
  orderNumber: string;

  @ApiProperty({ enum: ['wave', 'batch', 'zone', 'discrete'], required: false })
  @IsOptional()
  @IsEnum(['wave', 'batch', 'zone', 'discrete'])
  pickingStrategy?: string;

  @ApiProperty({ enum: ['sales', 'transfer', 'production'], required: false })
  @IsOptional()
  @IsEnum(['sales', 'transfer', 'production'])
  pickingType?: string;

  @ApiProperty({ enum: ['low', 'normal', 'high', 'urgent'], required: false })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiProperty({ type: [PickingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickingItemDto)
  items: PickingItemDto[];
}

