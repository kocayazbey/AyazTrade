import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class UpdatePickingOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({ enum: ['pending', 'in_progress', 'completed', 'cancelled'], required: false })
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  notes?: string;
}
