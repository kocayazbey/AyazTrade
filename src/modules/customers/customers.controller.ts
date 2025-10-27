import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RateLimit } from '../../core/decorators/rate-limit.decorator';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';

@ApiTags('Customers - Customer Management')
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customers (Admin only)' })
  async getCustomers(@Query() query: any, @CurrentUser('role') userRole: string) {
    if (userRole !== 'admin') {
      throw new Error('Unauthorized');
    }
    return this.customersService.getCustomers(query);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.customersService.getProfile(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (alias)' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.customersService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.customersService.updateProfile(userId, data);
  }

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user addresses' })
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  })
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.customersService.getAddresses(userId);
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add new address' })
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute (very restrictive for address creation)
  })
  async addAddress(@CurrentUser('id') userId: string, @Body() data: any) {
    // Validate required fields
    if (!data.title || !data.address || !data.city || !data.postalCode || !data.country) {
      throw new HttpException('All address fields are required (title, address, city, postalCode, country)', HttpStatus.BAD_REQUEST);
    }
    return this.customersService.addAddress(userId, data);
  }

  @Put('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address' })
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 15, // 15 requests per minute
  })
  async updateAddress(@Param('id') addressId: string, @CurrentUser('id') userId: string, @Body() data: any) {
    // Validate addressId format
    if (!addressId || typeof addressId !== 'string') {
      throw new HttpException('Valid address ID is required', HttpStatus.BAD_REQUEST);
    }
    return this.customersService.updateAddress(addressId, userId, data);
  }

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete address' })
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute (restrictive for deletions)
  })
  async deleteAddress(@Param('id') addressId: string, @CurrentUser('id') userId: string) {
    // Validate addressId format
    if (!addressId || typeof addressId !== 'string') {
      throw new HttpException('Valid address ID is required', HttpStatus.BAD_REQUEST);
    }
    return this.customersService.deleteAddress(addressId, userId);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  async getUserOrders(@CurrentUser('id') userId: string, @Query() query: any) {
    return this.customersService.getUserOrders(userId, query);
  }

  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user wishlist' })
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  })
  async getWishlist(@CurrentUser('id') userId: string) {
    return this.customersService.getWishlist(userId);
  }

  @Post('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add to wishlist' })
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute (more restrictive for writes)
  })
  async addToWishlist(@CurrentUser('id') userId: string, @Body() data: any) {
    // Validate input
    if (!data.productId) {
      throw new HttpException('Product ID is required', HttpStatus.BAD_REQUEST);
    }
    return this.customersService.addToWishlist(userId, data.productId);
  }

  @Delete('wishlist/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove from wishlist' })
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute (more restrictive for writes)
  })
  async removeFromWishlist(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    // Validate productId format
    if (!productId || typeof productId !== 'string') {
      throw new HttpException('Valid product ID is required', HttpStatus.BAD_REQUEST);
    }
    return this.customersService.removeFromWishlist(userId, productId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by ID (Admin only)' })
  async getCustomerById(@Param('id') customerId: string, @CurrentUser('role') userRole: string) {
    if (userRole !== 'admin') {
      throw new Error('Unauthorized');
    }
    return this.customersService.getCustomerById(customerId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer (Admin only)' })
  async updateCustomer(@Param('id') customerId: string, @Body() data: UpdateCustomerDto, @CurrentUser('role') userRole: string) {
    if (userRole !== 'admin') {
      throw new Error('Unauthorized');
    }
    return this.customersService.updateCustomer(customerId, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete customer (Admin only)' })
  async deleteCustomer(@Param('id') customerId: string, @CurrentUser('role') userRole: string) {
    if (userRole !== 'admin') {
      throw new Error('Unauthorized');
    }
    return this.customersService.deleteCustomer(customerId);
  }
}