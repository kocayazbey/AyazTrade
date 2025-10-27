import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  productId: string;

  @IsString()
  customerId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  title: string;

  @IsString()
  comment: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsOptional()
  wouldRecommend?: boolean;
}

