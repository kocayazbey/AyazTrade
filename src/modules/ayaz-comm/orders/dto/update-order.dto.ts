import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed', 'refunded'])
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}