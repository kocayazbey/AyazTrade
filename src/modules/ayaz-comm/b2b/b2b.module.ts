import { Module } from '@nestjs/common';
import { B2BController } from './b2b.controller';
import { TieredPricingService } from './tiered-pricing.service';
import { BulkOrderService } from './bulk-order.service';
import { ShoppingListsService } from './shopping-lists.service';
import { ReorderService } from './reorder.service';
import { FavoritesService } from './favorites.service';

@Module({
  controllers: [B2BController],
  providers: [
    TieredPricingService,
    BulkOrderService,
    ShoppingListsService,
    ReorderService,
    FavoritesService,
  ],
  exports: [
    TieredPricingService,
    BulkOrderService,
    ShoppingListsService,
    ReorderService,
    FavoritesService,
  ],
})
export class B2BModule {}

