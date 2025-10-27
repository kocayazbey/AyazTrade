import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({ description: 'Customer ID', example: 'customer123' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Contract title', example: 'Software License Agreement' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Contract description', example: 'Annual software license with support' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Contract type', 
    enum: ['service', 'product', 'maintenance', 'support'],
    example: 'service'
  })
  @IsEnum(['service', 'product', 'maintenance', 'support'])
  contractType: 'service' | 'product' | 'maintenance' | 'support';

  @ApiProperty({ description: 'Contract start date', example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ description: 'Contract end date', example: '2024-12-31T23:59:59.000Z' })
  @IsDateString()
  endDate: Date;

  @ApiProperty({ description: 'Contract value', example: 50000, minimum: 0 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Payment terms', example: 'Net 30' })
  @IsString()
  paymentTerms: string;

  @ApiProperty({ 
    description: 'Contract status', 
    enum: ['draft', 'pending', 'active', 'expired', 'terminated', 'renewed'],
    example: 'draft'
  })
  @IsEnum(['draft', 'pending', 'active', 'expired', 'terminated', 'renewed'])
  status: 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'renewed';

  @ApiProperty({ description: 'Contract terms and conditions', example: 'Standard software license terms and conditions' })
  @IsString()
  terms: string;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Quarterly reviews scheduled' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Auto renewal enabled', example: true })
  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;

  @ApiPropertyOptional({ description: 'Renewal period in months', example: 12, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  renewalPeriod?: number;
}
