import { IsString, IsArray, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BroadcastPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export class BroadcastMessageDto {
  @ApiProperty({ description: 'Broadcast message content' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Target channels' })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiPropertyOptional({ description: 'Message subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Broadcast priority', enum: BroadcastPriority })
  @IsOptional()
  @IsEnum(BroadcastPriority)
  priority?: BroadcastPriority;

  @ApiPropertyOptional({ description: 'Message template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Scheduled broadcast time' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Broadcast tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
