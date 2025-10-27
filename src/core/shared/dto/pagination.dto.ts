import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Page number', 
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of items per page', 
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Sort field',
    example: 'createdAt'
  })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ 
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC']
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
