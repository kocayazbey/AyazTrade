import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuoteItemDto {
  @ApiProperty({ description: 'Product ID', example: 'prod123' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Product name', example: 'Premium Software License' })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ description: 'Product description', example: 'Annual license for premium features' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Quantity', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 5000, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Total price', example: 5000, minimum: 0 })
  @IsNumber()
  @Min(0)
  total: number;
}

export class CreateQuoteDto {
  @ApiPropertyOptional({ description: 'Lead ID', example: 'lead123' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Customer ID', example: 'customer123' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'Quote title', example: 'Premium Package Quote' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Quote description', example: 'Complete business solution package' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Quote items', 
    type: [QuoteItemDto],
    example: [
      {
        productId: 'prod1',
        productName: 'Premium Software License',
        description: 'Annual license for premium features',
        quantity: 1,
        unitPrice: 5000,
        total: 5000
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @ApiProperty({ description: 'Subtotal amount', example: 5000, minimum: 0 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ description: 'Tax rate percentage', example: 18, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  taxRate: number;

  @ApiProperty({ description: 'Tax amount', example: 900, minimum: 0 })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiPropertyOptional({ description: 'Discount rate percentage', example: 10, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountRate?: number;

  @ApiPropertyOptional({ description: 'Discount amount', example: 500, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: 'Total amount', example: 5900, minimum: 0 })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({ description: 'Quote validity date', example: '2024-12-31T23:59:59.000Z' })
  @IsDateString()
  validUntil: Date;

  @ApiProperty({ 
    description: 'Quote status', 
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'],
    example: 'draft'
  })
  @IsEnum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'])
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Follow up in 1 week' })
  @IsOptional()
  @IsString()
  notes?: string;
}
