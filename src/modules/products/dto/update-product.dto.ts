import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['sku'] as const)
) {
  // SKU cannot be updated after creation
  // All other fields are optional for updates
}
