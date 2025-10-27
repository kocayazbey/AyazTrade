import { IsString, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  name: string;

  @IsString()
  addressLine1: string;

  @IsString()
  addressLine2?: string;

  @IsString()
  city: string;

  @IsString()
  state?: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsString()
  phone: string;
}

class PackageDto {
  @IsString()
  description: string;

  weight: number;

  length?: number;

  width?: number;

  height?: number;

  quantity: number;
}

export class CreateShipmentDto {
  @IsString()
  orderId: string;

  @IsString()
  carrier: string;

  @IsString()
  service: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  fromAddress: AddressDto;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  toAddress: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  packages: PackageDto[];
}

