import { IsString, IsOptional, IsArray, IsEnum, IsObject, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  SALES = 'sales',
  CUSTOMER = 'customer',
  PRODUCT = 'product',
  FINANCIAL = 'financial',
  MARKETING = 'marketing',
  OPERATIONAL = 'operational',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  ON_DEMAND = 'on_demand'
}

export class ReportParameter {
  @ApiProperty({ description: 'Parameter name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Parameter value' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Parameter type' })
  @IsOptional()
  @IsString()
  type?: string;
}

export class ReportFilter {
  @ApiProperty({ description: 'Filter field' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Filter operator' })
  @IsString()
  operator: string;

  @ApiProperty({ description: 'Filter value' })
  value: any;
}

export class CreateReportDto {
  @ApiProperty({ description: 'Report name', example: 'Monthly Sales Report' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Report type', enum: ReportType, example: 'sales' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ description: 'Report format', enum: ReportFormat, example: 'pdf' })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Report frequency', enum: ReportFrequency, example: 'monthly' })
  @IsOptional()
  @IsEnum(ReportFrequency)
  frequency?: ReportFrequency;

  @ApiPropertyOptional({ description: 'Report parameters' })
  @IsOptional()
  @IsArray()
  @Type(() => ReportParameter)
  parameters?: ReportParameter[];

  @ApiPropertyOptional({ description: 'Report filters' })
  @IsOptional()
  @IsArray()
  @Type(() => ReportFilter)
  filters?: ReportFilter[];

  @ApiPropertyOptional({ description: 'Include charts' })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({ description: 'Include tables' })
  @IsOptional()
  @IsBoolean()
  includeTables?: boolean;

  @ApiPropertyOptional({ description: 'Include summaries' })
  @IsOptional()
  @IsBoolean()
  includeSummaries?: boolean;

  @ApiPropertyOptional({ description: 'Include recommendations' })
  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean;

  @ApiPropertyOptional({ description: 'Email recipients' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailRecipients?: string[];

  @ApiPropertyOptional({ description: 'Auto-generate report' })
  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;

  @ApiPropertyOptional({ description: 'Report template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Custom settings' })
  @IsOptional()
  @IsObject()
  customSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Report priority', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({ description: 'Report tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Report visibility' })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional({ description: 'Report expiration date' })
  @IsOptional()
  @IsString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Report access level' })
  @IsOptional()
  @IsString()
  accessLevel?: string;
}
