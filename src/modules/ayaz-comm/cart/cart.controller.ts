import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  findByUserId(@Param('userId') userId: string) {
    return this.cartService.findByUserId(userId);
  }

  @Post('items')
  addItem(@Body() addItemDto: AddItemDto) {
    return this.cartService.addItem(addItemDto.cartId, addItemDto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    return this.cartService.updateItem(id, updateItemDto);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string, @Param('userId') userId: string) {
    return this.cartService.removeItem(id, userId);
  }

  @Delete('clear')
  clearCart(@Param('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}