import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivingLineItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  expectedQuantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  serialNumbers?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  manufactureDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;
}

export class CreateReceivingOrderDto {
  @ApiProperty()
  @IsString()
  warehouseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  receivingType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expectedDate?: Date;

  @ApiProperty({ type: [ReceivingLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivingLineItemDto)
  lineItems: ReceivingLineItemDto[];
}

