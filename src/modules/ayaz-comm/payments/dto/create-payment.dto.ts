import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min } from 'class-validator';
import { PaymentMethod } from '../payments.service';

export class CreatePaymentDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsObject()
  @IsOptional()
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
    address?: any;
  };

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

