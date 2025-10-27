import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';

export class UpdateReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsOptional()
  wouldRecommend?: boolean;
}

