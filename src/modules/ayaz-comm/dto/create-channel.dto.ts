import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
  GROUP = 'group',
  BROADCAST = 'broadcast'
}

export class CreateChannelDto {
  @ApiProperty({ description: 'Channel name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Channel type', enum: ChannelType })
  @IsEnum(ChannelType)
  type: ChannelType;

  @ApiPropertyOptional({ description: 'Channel description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Channel is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Channel members' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];

  @ApiPropertyOptional({ description: 'Channel settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Channel tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Channel metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
