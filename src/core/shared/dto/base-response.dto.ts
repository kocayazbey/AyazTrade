import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BaseResponseDto<T = any> {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response message', example: 'Operation completed successfully' })
  message?: string;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error details' })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiPropertyOptional({ description: 'Response metadata' })
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };

  @ApiPropertyOptional({ description: 'Pagination information' })
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Success status', example: false })
  success: boolean;

  @ApiProperty({ description: 'Error message', example: 'An error occurred' })
  message: string;

  @ApiProperty({ description: 'Error code', example: 'VALIDATION_ERROR' })
  code: string;

  @ApiPropertyOptional({ description: 'Error details' })
  details?: any;

  @ApiProperty({ description: 'Timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: 'Request path', example: '/api/v1/products' })
  path: string;
}

export class ValidationErrorDto {
  @ApiProperty({ description: 'Field name', example: 'email' })
  field: string;

  @ApiProperty({ description: 'Error message', example: 'Email is required' })
  message: string;

  @ApiProperty({ description: 'Invalid value', example: '' })
  value: any;

  @ApiProperty({ description: 'Validation constraints' })
  constraints: Record<string, string>;
}
