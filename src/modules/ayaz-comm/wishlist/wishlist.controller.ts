import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PriceAlertsService } from './price-alerts.service';
import { StockAlertsService } from './stock-alerts.service';

@Controller('wishlist')
export class WishlistController {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly priceAlertsService: PriceAlertsService,
    private readonly stockAlertsService: StockAlertsService,
  ) {}

  @Post()
  async createWishlist(@Body() data: any) {
    return this.wishlistService.createWishlist(data.customerId, data.name);
  }

  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() data: any) {
    return this.wishlistService.addItem(id, data.productId, data.variantId);
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    await this.wishlistService.removeItem(id, itemId);
    return { message: 'Item removed' };
  }

  @Post('price-alerts')
  async createPriceAlert(@Body() data: any) {
    return this.priceAlertsService.createPriceAlert(data.customerId, data.productId, data.targetPrice);
  }

  @Post('stock-alerts')
  async createStockAlert(@Body() data: any) {
    return this.stockAlertsService.createStockAlert(data.customerId, data.productId, data.variantId);
  }
}

