import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { RequireCsrf } from '../../core/decorators/security.decorator';
import { ProductsService } from './products.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Public } from '../../core/auth/decorators/public.decorator';

@ApiTags('Products - E-commerce Product Management')
@Controller({ path: 'products', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get products with filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated products list' })
  async getProducts(@Query() query: any) {
    return this.productsService.getProducts(query);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search products' })
  async searchProducts(@Query('q') searchTerm: string, @Query() filters: any) {
    return this.productsService.searchProducts(searchTerm, filters);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured products' })
  async getFeaturedProducts(@Query('limit') limit?: number) {
    return this.productsService.getFeaturedProducts(limit || 8);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get product categories' })
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  async getProductById(@Param('id') productId: string) {
    return this.productsService.getProductById(productId);
  }

  @Post()
  @Roles('admin', 'super_admin', 'product_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Create product (Admin only)' })
  async createProduct(@Body() data: CreateProductDto, @CurrentUser('id') userId: string) {
    return this.productsService.createProduct(data, userId);
  }

  @Put(':id')
  @Roles('admin', 'super_admin', 'product_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  async updateProduct(@Param('id') productId: string, @Body() data: UpdateProductDto) {
    return this.productsService.updateProduct(productId, data);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @RequireCsrf()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  async deleteProduct(@Param('id') productId: string) {
    return this.productsService.deleteProduct(productId);
  }

  @Get(':id/reviews')
  @Public()
  @ApiOperation({ summary: 'Get product reviews' })
  async getProductReviews(@Param('id') productId: string, @Query() query: any) {
    return this.productsService.getProductReviews(productId, query);
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @RequireCsrf()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product review' })
  async addProductReview(@Param('id') productId: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.productsService.addProductReview(productId, data, userId);
  }

  @Post('categories')
  @Roles('admin', 'super_admin', 'product_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Create category (Admin only)' })
  async createCategory(@Body() data: any) {
    return this.productsService.createCategory(data);
  }

  @Put('categories/:id')
  @Roles('admin', 'super_admin', 'product_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update category (Admin only)' })
  async updateCategory(@Param('id') categoryId: string, @Body() data: any) {
    return this.productsService.updateCategory(categoryId, data);
  }

  @Delete('categories/:id')
  @Roles('admin', 'super_admin')
  @RequireCsrf()
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  async deleteCategory(@Param('id') categoryId: string) {
    return this.productsService.deleteCategory(categoryId);
  }

  // Brands endpoints
  @Get('brands')
  @Public()
  @ApiOperation({ summary: 'Get all brands' })
  async getBrands() {
    return this.productsService.getBrands();
  }

  @Post('brands')
  @Roles('admin', 'super_admin', 'product_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Create brand (Admin only)' })
  async createBrand(@Body() data: any) {
    return this.productsService.createBrand(data);
  }

  @Put('brands/:id')
  @Roles('admin', 'super_admin', 'product_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update brand (Admin only)' })
  async updateBrand(@Param('id') brandId: string, @Body() data: any) {
    return this.productsService.updateBrand(brandId, data);
  }

  @Delete('brands/:id')
  @Roles('admin', 'super_admin')
  @RequireCsrf()
  @ApiOperation({ summary: 'Delete brand (Admin only)' })
  async deleteBrand(@Param('id') brandId: string) {
    return this.productsService.deleteBrand(brandId);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin', 'product_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update product status' })
  async updateProductStatus(@Param('id') productId: string, @Body() data: any) {
    return this.productsService.updateProductStatus(productId, data.status);
  }
}