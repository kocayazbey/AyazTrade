import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('Cart - Shopping Cart Management')
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.cartService.addToCart(userId, data);
  }

  @Put('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateCartItem(@Param('itemId') itemId: string, @CurrentUser('id') userId: string, @Body() data: any) {
    return this.cartService.updateCartItem(itemId, userId, data);
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeFromCart(@Param('itemId') itemId: string, @CurrentUser('id') userId: string) {
    return this.cartService.removeFromCart(itemId, userId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart item count' })
  async getCartCount(@CurrentUser('id') userId: string) {
    return this.cartService.getCartCount(userId);
  }
}
