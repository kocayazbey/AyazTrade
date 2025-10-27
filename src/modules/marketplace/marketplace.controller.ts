import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@ApiTags('Marketplace')
@Controller({ path: 'marketplace', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketplaceController {
  @Get('platforms')
  @ApiOperation({ summary: 'Get all marketplace platforms' })
  async getPlatforms() {
    return [
      { name: 'Trendyol', status: 'connected', products: 450, orders: 1234 },
      { name: 'Hepsiburada', status: 'connected', products: 520, orders: 987 },
      { name: 'N11', status: 'connected', products: 380, orders: 654 },
      { name: 'Amazon TR', status: 'disconnected', products: 0, orders: 0 },
      { name: 'Sahibinden', status: 'connected', products: 125, orders: 234 },
    ];
  }

  @Post('sync/:platform')
  @ApiOperation({ summary: 'Sync products with marketplace' })
  async syncPlatform(@Param('platform') platform: string) {
    return {
      platform,
      synced: true,
      productsUpdated: 450,
      ordersImported: 23,
    };
  }

  @Get('orders/:platform')
  @ApiOperation({ summary: 'Get orders from marketplace' })
  async getMarketplaceOrders(@Param('platform') platform: string) {
    return [];
  }

  @Put('product/:platform/:productId')
  @ApiOperation({ summary: 'Update product on marketplace' })
  async updateMarketplaceProduct(
    @Param('platform') platform: string,
    @Param('productId') productId: string,
    @Body() data: any,
  ) {
    return { success: true, platform, productId };
  }

  @Post('configure/:platform')
  @ApiOperation({ summary: 'Configure marketplace integration' })
  async configurePlatform(
    @Param('platform') platform: string,
    @Body() credentials: any,
  ) {
    return { success: true, platform, configured: true };
  }
}

