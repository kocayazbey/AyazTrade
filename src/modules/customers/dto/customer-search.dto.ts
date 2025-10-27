import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked'
}

export enum CustomerSegment {
  NEW = 'new',
  REGULAR = 'regular',
  VIP = 'vip',
  PREMIUM = 'premium',
  WHOLESALE = 'wholesale',
  ENTERPRISE = 'enterprise'
}

export enum CustomerSortBy {
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TOTAL_ORDERS = 'totalOrders',
  LIFETIME_VALUE = 'lifetimeValue',
  LAST_ORDER_DATE = 'lastOrderDate'
}

export enum CustomerSortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

export class CustomerSearchDto {
  @ApiPropertyOptional({ description: 'Search query', example: 'John Doe' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Customer status filter' })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ description: 'Customer statuses filter' })
  @IsOptional()
  @IsArray()
  @IsEnum(CustomerStatus, { each: true })
  statuses?: CustomerStatus[];

  @ApiPropertyOptional({ description: 'Customer segment filter' })
  @IsOptional()
  @IsEnum(CustomerSegment)
  segment?: CustomerSegment;

  @ApiPropertyOptional({ description: 'Customer segments filter' })
  @IsOptional()
  @IsArray()
  @IsEnum(CustomerSegment, { each: true })
  segments?: CustomerSegment[];

  @ApiPropertyOptional({ description: 'Country filter' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Countries filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @ApiPropertyOptional({ description: 'City filter' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Cities filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ description: 'State filter' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'States filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ description: 'Minimum orders filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrders?: number;

  @ApiPropertyOptional({ description: 'Maximum orders filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxOrders?: number;

  @ApiPropertyOptional({ description: 'Minimum lifetime value filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minLifetimeValue?: number;

  @ApiPropertyOptional({ description: 'Maximum lifetime value filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxLifetimeValue?: number;

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Last order date from filter' })
  @IsOptional()
  @IsDateString()
  lastOrderDateFrom?: string;

  @ApiPropertyOptional({ description: 'Last order date to filter' })
  @IsOptional()
  @IsDateString()
  lastOrderDateTo?: string;

  @ApiPropertyOptional({ description: 'Has orders filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasOrders?: boolean;

  @ApiPropertyOptional({ description: 'Is VIP customer filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVip?: boolean;

  @ApiPropertyOptional({ description: 'Is newsletter subscribed filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isNewsletterSubscribed?: boolean;

  @ApiPropertyOptional({ description: 'Is SMS subscribed filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSmsSubscribed?: boolean;

  @ApiPropertyOptional({ description: 'Is email marketing subscribed filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isEmailMarketingSubscribed?: boolean;

  @ApiPropertyOptional({ description: 'Has phone number filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasPhone?: boolean;

  @ApiPropertyOptional({ description: 'Has company filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasCompany?: boolean;

  @ApiPropertyOptional({ description: 'Company filter' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Industry filter' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Industries filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({ description: 'Company size filter' })
  @IsOptional()
  @IsString()
  companySize?: string;

  @ApiPropertyOptional({ description: 'Company sizes filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companySizes?: string[];

  @ApiPropertyOptional({ description: 'Language filter' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Languages filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ description: 'Currency filter' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Currencies filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currencies?: string[];

  @ApiPropertyOptional({ description: 'Timezone filter' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Timezones filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timezones?: string[];

  @ApiPropertyOptional({ description: 'Source filter' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Sources filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @ApiPropertyOptional({ description: 'Referral source filter' })
  @IsOptional()
  @IsString()
  referralSource?: string;

  @ApiPropertyOptional({ description: 'Referral sources filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referralSources?: string[];

  @ApiPropertyOptional({ description: 'Campaign ID filter' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Campaign IDs filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campaignIds?: string[];

  @ApiPropertyOptional({ description: 'Marketing source filter' })
  @IsOptional()
  @IsString()
  marketingSource?: string;

  @ApiPropertyOptional({ description: 'Marketing sources filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketingSources?: string[];

  @ApiPropertyOptional({ description: 'Tags filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Has tags filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasTags?: boolean;

  @ApiPropertyOptional({ description: 'Has notes filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasNotes?: boolean;

  @ApiPropertyOptional({ description: 'Priority level filter' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: 'Priority levels filter' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  priorities?: number[];

  @ApiPropertyOptional({ description: 'Risk level filter' })
  @IsOptional()
  @IsString()
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'Risk levels filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskLevels?: string[];

  @ApiPropertyOptional({ description: 'Assigned to user ID filter' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  assignedTo?: number;

  @ApiPropertyOptional({ description: 'Assigned to user IDs filter' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  assignedToUsers?: number[];

  @ApiPropertyOptional({ description: 'Group ID filter' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  groupId?: number;

  @ApiPropertyOptional({ description: 'Group IDs filter' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  groupIds?: number[];

  @ApiPropertyOptional({ description: 'Is archived filter' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isArchived?: boolean;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(CustomerSortOrder)
  sortOrder?: CustomerSortOrder;

  @ApiPropertyOptional({ description: 'Include addresses' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAddresses?: boolean;

  @ApiPropertyOptional({ description: 'Include orders' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeOrders?: boolean;

  @ApiPropertyOptional({ description: 'Include notes' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeNotes?: boolean;

  @ApiPropertyOptional({ description: 'Include tags' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTags?: boolean;

  @ApiPropertyOptional({ description: 'Include analytics' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAnalytics?: boolean;
}
