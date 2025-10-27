import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID' })
  id: number;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product SKU' })
  sku: string;

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Product stock quantity' })
  stock: number;

  @ApiProperty({ description: 'Product status' })
  status: string;

  @ApiProperty({ description: 'Product category' })
  category?: any;

  @ApiProperty({ description: 'Product images' })
  images?: any[];

  @ApiProperty({ description: 'Product variants' })
  variants?: any[];

  @ApiProperty({ description: 'Product SEO data' })
  seo?: any;

  @ApiProperty({ description: 'Product analytics' })
  analytics?: any;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
