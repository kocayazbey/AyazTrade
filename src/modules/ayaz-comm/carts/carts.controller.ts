import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';

@ApiTags('Carts')
@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiResponse({ status: 200, description: 'Cart found' })
  async findOne(@Param('id') id: string) {
    return this.cartsService.findOne(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 200, description: 'Item added to cart' })
  async addItem(
    @Param('id') id: string,
    @Body() body: { productId: string; quantity: number; variantId?: string },
  ) {
    return this.cartsService.addItem(
      id,
      body.productId,
      body.quantity,
      body.variantId,
    );
  }

  @Put(':id/items/:itemIndex')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(
    @Param('id') id: string,
    @Param('itemIndex') itemIndex: number,
    @Body() body: { quantity: number },
  ) {
    return this.cartsService.updateItem(id, itemIndex, body.quantity);
  }

  @Delete(':id/items/:itemIndex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeItem(
    @Param('id') id: string,
    @Param('itemIndex') itemIndex: number,
  ) {
    return this.cartsService.removeItem(id, itemIndex);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clear(@Param('id') id: string) {
    return this.cartsService.clear(id);
  }

  @Post(':id/coupon')
  @ApiOperation({ summary: 'Apply coupon to cart' })
  @ApiResponse({ status: 200, description: 'Coupon applied' })
  async applyCoupon(
    @Param('id') id: string,
    @Body() body: { couponCode: string },
  ) {
    return this.cartsService.applyCoupon(id, body.couponCode);
  }

  @Delete(':id/coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove coupon from cart' })
  @ApiResponse({ status: 200, description: 'Coupon removed' })
  async removeCoupon(@Param('id') id: string) {
    return this.cartsService.removeCoupon(id);
  }
}

