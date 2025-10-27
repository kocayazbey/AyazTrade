import { IsString, IsOptional, IsEnum, IsDate, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  TASK = 'task',
  NOTE = 'note',
  FOLLOW_UP = 'follow-up',
  DEMO = 'demo',
  PROPOSAL = 'proposal',
  CONTRACT = 'contract',
  SUPPORT = 'support',
  OTHER = 'other'
}

export enum ActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ActivityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export class CreateActivityDto {
  @ApiProperty({ description: 'Activity type', enum: ActivityType, example: ActivityType.CALL })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiProperty({ description: 'Activity subject', example: 'Follow up on proposal' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'Activity description', example: 'Call customer to discuss proposal details' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Related entity type', example: 'customer', enum: ['customer', 'lead', 'contact', 'opportunity'] })
  @IsOptional()
  @IsEnum(['customer', 'lead', 'contact', 'opportunity'])
  relatedTo?: string;

  @ApiPropertyOptional({ description: 'Related entity ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiPropertyOptional({
    description: 'Scheduled date and time',
    example: '2024-01-20T10:00:00.000Z',
    type: Date
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : value)
  scheduledAt?: Date;

  @ApiPropertyOptional({
    description: 'Completion date and time',
    example: '2024-01-20T11:00:00.000Z',
    type: Date
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : value)
  completedAt?: Date;

  @ApiProperty({ description: 'Activity priority', enum: ActivityPriority, example: ActivityPriority.MEDIUM })
  @IsEnum(ActivityPriority)
  priority: ActivityPriority;

  @ApiProperty({ description: 'Activity status', enum: ActivityStatus, example: ActivityStatus.PENDING })
  @IsEnum(ActivityStatus)
  status: ActivityStatus;

  @ApiPropertyOptional({ description: 'Assigned user ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Activity notes', example: 'Customer showed interest in premium package' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Activity outcome', example: 'Customer agreed to schedule demo' })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { campaign: 'summer_sale' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
