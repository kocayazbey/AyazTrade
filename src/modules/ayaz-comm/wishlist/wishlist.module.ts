import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { PriceAlertsService } from './price-alerts.service';
import { StockAlertsService } from './stock-alerts.service';

@Module({
  controllers: [WishlistController],
  providers: [WishlistService, PriceAlertsService, StockAlertsService],
  exports: [WishlistService],
})
export class WishlistModule {}

