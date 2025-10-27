import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

export enum OrderSortBy {
  ORDER_NUMBER = 'orderNumber',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
  CUSTOMER_NAME = 'customerName'
}

export enum OrderSortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export class OrderSearchDto {
  @ApiPropertyOptional({ description: 'Search query', example: 'ORD-20240101-0001' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Order status filter' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Order statuses filter' })
  @IsOptional()
  @IsArray()
  @IsEnum(OrderStatus, { each: true })
  statuses?: OrderStatus[];

  @ApiPropertyOptional({ description: 'Payment status filter' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({ description: 'Customer IDs filter' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  customerIds?: number[];

  @ApiPropertyOptional({ description: 'Product ID filter' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productId?: number;

  @ApiPropertyOptional({ description: 'Product IDs filter' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  productIds?: number[];

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Minimum amount filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum amount filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Payment method filter' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Shipping method filter' })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional({ description: 'Currency filter' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Country filter' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'City filter' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State filter' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code filter' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Has tracking number' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasTrackingNumber?: boolean;

  @ApiPropertyOptional({ description: 'Is rush order' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRushOrder?: boolean;

  @ApiPropertyOptional({ description: 'Is gift order' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isGiftOrder?: boolean;

  @ApiPropertyOptional({ description: 'Is subscription order' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSubscriptionOrder?: boolean;

  @ApiPropertyOptional({ description: 'Requires approval' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Has notes' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasNotes?: boolean;

  @ApiPropertyOptional({ description: 'Has special instructions' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasSpecialInstructions?: boolean;

  @ApiPropertyOptional({ description: 'Marketing source filter' })
  @IsOptional()
  @IsString()
  marketingSource?: string;

  @ApiPropertyOptional({ description: 'Campaign ID filter' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Referral source filter' })
  @IsOptional()
  @IsString()
  referralSource?: string;

  @ApiPropertyOptional({ description: 'Device type filter' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Browser filter' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system filter' })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiPropertyOptional({ description: 'Tags filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Priority level filter' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsEnum(OrderSortBy)
  sortBy?: OrderSortBy;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(OrderSortOrder)
  sortOrder?: OrderSortOrder;

  @ApiPropertyOptional({ description: 'Include customer data' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCustomer?: boolean;

  @ApiPropertyOptional({ description: 'Include order items' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeItems?: boolean;

  @ApiPropertyOptional({ description: 'Include addresses' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAddresses?: boolean;

  @ApiPropertyOptional({ description: 'Include payments' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includePayments?: boolean;

  @ApiPropertyOptional({ description: 'Include tracking info' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTracking?: boolean;

  @ApiPropertyOptional({ description: 'Include analytics' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAnalytics?: boolean;
}
