import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create-contact.dto';

export class UpdateContactDto extends PartialType(CreateContactDto) {
  // Update DTO inherits all fields from CreateContactDto as optional
  // This allows partial updates of contact records
}
