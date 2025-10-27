import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Price' })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: 'Subtotal' })
  @IsOptional()
  @IsNumber()
  subtotal?: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Subtotal amount' })
  @IsNumber()
  subtotal: number;

  @ApiPropertyOptional({ description: 'Tax amount' })
  @IsOptional()
  @IsNumber()
  tax?: number;

  @ApiPropertyOptional({ description: 'Shipping cost' })
  @IsOptional()
  @IsNumber()
  shipping?: number;

  @ApiPropertyOptional({ description: 'Discount amount' })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ description: 'Total amount' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ description: 'Payment method' })
  @IsEnum(['credit_card', 'bank_transfer', 'cash', 'other'])
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Coupon code' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Coupon discount' })
  @IsOptional()
  @IsNumber()
  couponDiscount?: number;

  @ApiProperty({ description: 'Shipping address' })
  @IsString()
  shippingAddress: string;

  @ApiProperty({ description: 'Billing address' })
  @IsString()
  billingAddress: string;

  @ApiPropertyOptional({ description: 'Shipping method' })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Order items', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Order status' })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status?: string;

  @ApiPropertyOptional({ description: 'Payment status' })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed', 'refunded'])
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Shipping address' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
