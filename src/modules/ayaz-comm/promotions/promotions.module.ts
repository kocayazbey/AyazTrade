import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { CouponsService } from './coupons.service';
import { DiscountsService } from './discounts.service';
import { FlashSalesService } from './flash-sales.service';
import { BundleDealsService } from './bundle-deals.service';
import { B2BCampaignsService } from './b2b-campaigns.service';

@Module({
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    CouponsService,
    DiscountsService,
    FlashSalesService,
    BundleDealsService,
    B2BCampaignsService,
  ],
  exports: [PromotionsService, CouponsService, DiscountsService, B2BCampaignsService],
})
export class PromotionsModule {}
