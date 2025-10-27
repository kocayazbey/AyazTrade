import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateContactDto } from './update-contact.dto';

export class ContactUpdate {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => UpdateContactDto)
  data: UpdateContactDto;
}

export class BulkUpdateContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactUpdate)
  updates: ContactUpdate[];
}
