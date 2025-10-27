import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Register new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  async create(@Body() createCustomerDto: any) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async findAll(@Query() filters: any) {
    return this.customersService.findAll(filters);
  }

  @Get('top')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get top customers' })
  @ApiResponse({ status: 200, description: 'Top customers retrieved' })
  async getTopCustomers(@Query('limit') limit?: number) {
    return this.customersService.getTopCustomers(limit);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search customers' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') query: string) {
    return this.customersService.searchCustomers(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  async update(@Param('id') id: string, @Body() updateCustomerDto: any) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 204, description: 'Customer deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Post(':id/verify-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify customer email' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verifyEmail(@Param('id') id: string) {
    return this.customersService.verifyEmail(id);
  }

  // Wishlist endpoints for mobile app
  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@CurrentUser('id') userId: string) {
    return this.customersService.getWishlist(userId);
  }

  @Post('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product to wishlist' })
  async addToWishlist(@CurrentUser('id') userId: string, @Body() data: { productId: string }) {
    return this.customersService.addToWishlist(userId, data.productId);
  }

  @Delete('wishlist/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async removeFromWishlist(@Param('productId') productId: string, @CurrentUser('id') userId: string) {
    return this.customersService.removeFromWishlist(userId, productId);
  }

  // Address endpoints for mobile app
  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user addresses' })
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.customersService.getAddresses(userId);
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add new address' })
  async addAddress(@CurrentUser('id') userId: string, @Body() addressData: any) {
    return this.customersService.addAddress(userId, addressData);
  }

  @Put('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address' })
  async updateAddress(@Param('id') addressId: string, @CurrentUser('id') userId: string, @Body() addressData: any) {
    return this.customersService.updateAddress(userId, addressId, addressData);
  }

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete address' })
  async deleteAddress(@Param('id') addressId: string, @CurrentUser('id') userId: string) {
    return this.customersService.deleteAddress(userId, addressId);
  }
}

