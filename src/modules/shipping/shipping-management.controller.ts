import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ShippingService } from './shipping.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('Shipping Management')
@Controller({ path: 'admin/shipping', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShippingManagementController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('shipments')
  @ApiOperation({ summary: 'Get all shipments' })
  @ApiResponse({ status: 200, description: 'Returns paginated shipments list' })
  async getShipments(@Query() filters: any, @CurrentUser('tenantId') tenantId: string) {
    return this.shippingService.getShipments(filters, tenantId);
  }

  @Get('carriers')
  @ApiOperation({ summary: 'Get available carriers' })
  @ApiResponse({ status: 200, description: 'Returns available shipping carriers' })
  async getCarriers(@CurrentUser('tenantId') tenantId: string) {
    return this.shippingService.getCarriers(tenantId);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create shipment' })
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  async createShipment(
    @Body() data: any, 
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.shippingService.createShipment(data.orderId, data.shippingMethod, tenantId, userId);
  }

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track shipment' })
  @ApiResponse({ status: 200, description: 'Returns shipment tracking information' })
  async trackShipment(
    @Param('trackingNumber') trackingNumber: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.shippingService.trackShipment(trackingNumber, tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get shipping statistics' })
  @ApiResponse({ status: 200, description: 'Returns shipping statistics' })
  async getShippingStats(@CurrentUser('tenantId') tenantId: string) {
    return this.shippingService.getShippingStats(tenantId);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate shipping rates' })
  @ApiResponse({ status: 200, description: 'Returns calculated shipping rates' })
  async calculateShipping(
    @Body() orderData: any,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.shippingService.calculateShipping(orderData, tenantId);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get shipping rates' })
  @ApiResponse({ status: 200, description: 'Returns available shipping rates' })
  async getShippingRates(@CurrentUser('tenantId') tenantId: string) {
    return this.shippingService.getShippingRates(tenantId);
  }
}

