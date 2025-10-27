import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(
  OmitType(CreateOrderDto, ['customerId', 'items'] as const)
) {
  // Customer ID and items cannot be updated after order creation
  // All other fields are optional for updates
}
