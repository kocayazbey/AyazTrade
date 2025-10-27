import { IsString, IsObject, IsEnum, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class StripePaymentDataDto {
  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}

class IyzicoPaymentDataDto {
  @IsObject()
  paymentCard: {
    cardNumber: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
    cardHolderName: string;
  };

  @IsObject()
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    identityNumber: string;
    city: string;
    country: string;
    registrationAddress: string;
    ip: string;
  };
}

export class ProcessPaymentDto {
  @IsEnum(['stripe', 'iyzico', 'cash_on_delivery'])
  paymentMethod: 'stripe' | 'iyzico' | 'cash_on_delivery';

  @IsOptional()
  @ValidateNested()
  @Type(() => StripePaymentDataDto)
  stripeData?: StripePaymentDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IyzicoPaymentDataDto)
  iyzicoData?: IyzicoPaymentDataDto;

  // Generic payment data for flexibility
  @IsOptional()
  @IsObject()
  paymentData?: any;
}
