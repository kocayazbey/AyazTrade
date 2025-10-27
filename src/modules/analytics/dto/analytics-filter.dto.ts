import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsPeriod {
  HOUR = '1h',
  DAY = '1d',
  WEEK = '7d',
  MONTH = '30d',
  QUARTER = '90d',
  YEAR = '1y',
  CUSTOM = 'custom'
}

export enum AnalyticsGroupBy {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export class AnalyticsFilterDto {
  @ApiPropertyOptional({ description: 'Start date for analytics', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for analytics', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Analytics period', enum: AnalyticsPeriod, example: '30d' })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({ description: 'Group by time period', enum: AnalyticsGroupBy, example: 'day' })
  @IsOptional()
  @IsEnum(AnalyticsGroupBy)
  groupBy?: AnalyticsGroupBy;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Categories filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Product filter' })
  @IsOptional()
  @IsString()
  product?: string;

  @ApiPropertyOptional({ description: 'Customer segment filter' })
  @IsOptional()
  @IsString()
  customerSegment?: string;

  @ApiPropertyOptional({ description: 'Region filter' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Country filter' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Traffic source filter' })
  @IsOptional()
  @IsString()
  trafficSource?: string;

  @ApiPropertyOptional({ description: 'Campaign filter' })
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiPropertyOptional({ description: 'Channel filter' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: 'Device type filter' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Browser filter' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system filter' })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiPropertyOptional({ description: 'Minimum revenue filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minRevenue?: number;

  @ApiPropertyOptional({ description: 'Maximum revenue filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxRevenue?: number;

  @ApiPropertyOptional({ description: 'Minimum order value filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Maximum order value filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxOrderValue?: number;

  @ApiPropertyOptional({ description: 'Include comparison data' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeComparison?: boolean;

  @ApiPropertyOptional({ description: 'Include trend analysis' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTrends?: boolean;

  @ApiPropertyOptional({ description: 'Include forecasting' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeForecasting?: boolean;

  @ApiPropertyOptional({ description: 'Include benchmarks' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeBenchmarks?: boolean;

  @ApiPropertyOptional({ description: 'Include recommendations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRecommendations?: boolean;

  @ApiPropertyOptional({ description: 'Data granularity level', example: 'detailed' })
  @IsOptional()
  @IsString()
  granularity?: string;

  @ApiPropertyOptional({ description: 'Export format', example: 'json' })
  @IsOptional()
  @IsString()
  exportFormat?: string;

  @ApiPropertyOptional({ description: 'Limit number of results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
