import { IsString, IsOptional, IsObject, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class ShippingAddressDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  zipCode: string;

  @IsString()
  country: string;

  @IsString()
  phone: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsEnum(['stripe', 'iyzico', 'cash_on_delivery'])
  paymentMethod: 'stripe' | 'iyzico' | 'cash_on_delivery';

  @IsOptional()
  @IsString()
  couponCode?: string;
}
