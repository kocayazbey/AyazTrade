import { Controller, Post, Get, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CouponsService } from './coupons.service';
import { FlashSalesService } from './flash-sales.service';
import { BundleDealsService } from './bundle-deals.service';

@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly couponsService: CouponsService,
    private readonly flashSalesService: FlashSalesService,
    private readonly bundleDealsService: BundleDealsService,
  ) {}

  @Post()
  async createPromotion(@Body() data: any) {
    return this.promotionsService.createPromotion(data);
  }

  @Post('coupons')
  async createCoupon(@Body() data: any) {
    return this.couponsService.createCoupon(data);
  }

  @Post('coupons/validate')
  async validateCoupon(@Body() data: any) {
    return this.couponsService.validateCoupon(data.code, data.customerId, data.orderData);
  }

  @Post('flash-sales')
  async createFlashSale(@Body() data: any) {
    return this.flashSalesService.createFlashSale(data);
  }

  @Post('bundles')
  async createBundle(@Body() data: any) {
    return this.bundleDealsService.createBundle(data);
  }

  @Get('active')
  async getActivePromotions() {
    return this.promotionsService.getActivePromotions();
  }
}

