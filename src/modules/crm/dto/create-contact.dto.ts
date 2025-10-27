import { IsString, IsEmail, IsOptional, IsPhoneNumber, IsUrl, IsBoolean, IsDate, IsArray, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed'
}

export enum ContactSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  TRADE_SHOW = 'trade_show',
  DIRECT_MAIL = 'direct_mail',
  OTHER = 'other'
}

export enum PreferredContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  MOBILE = 'mobile'
}

export class CreateContactDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('TR') // Turkish phone number validation
  phone?: string;

  @IsOptional()
  @IsPhoneNumber('TR')
  mobile?: string;

  @IsOptional()
  @IsPhoneNumber('TR')
  fax?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsUrl()
  linkedin?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  facebook?: string;

  @IsOptional()
  @IsEnum(PreferredContactMethod)
  preferredContactMethod?: PreferredContactMethod;

  @IsOptional()
  @IsBoolean()
  doNotCall?: boolean;

  @IsOptional()
  @IsBoolean()
  doNotEmail?: boolean;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  jobFunction?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  leadScore?: number;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsEnum(ContactSource)
  source?: ContactSource;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : value)
  birthday?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : value)
  anniversary?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  customFields?: Record<string, any>;

  // Optional relationships
  @IsOptional()
  customerId?: string;

  @IsOptional()
  leadId?: string;
}
