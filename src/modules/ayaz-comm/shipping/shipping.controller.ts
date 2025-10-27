import { Controller, Post, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingRatesService } from './shipping-rates.service';
import { TrackingService } from './tracking.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';

@Controller('shipping')
export class ShippingManagementController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly shippingRatesService: ShippingRatesService,
    private readonly trackingService: TrackingService,
  ) {}

  @Post('shipments')
  async createShipment(@Body() createShipmentDto: CreateShipmentDto) {
    return this.shippingService.createShipment(createShipmentDto);
  }

  @Get('shipments')
  async getShipments(@Query() filters: any) {
    return this.shippingService.getShipments(filters);
  }

  @Get('shipments/:id')
  async getShipment(@Param('id') id: string) {
    return this.shippingService.getShipmentById(id);
  }

  @Get('shipments/order/:orderId')
  async getShipmentByOrder(@Param('orderId') orderId: string) {
    return this.shippingService.getShipmentByOrderId(orderId);
  }

  @Put('shipments/:id/status')
  async updateShipmentStatus(@Param('id') id: string, @Body() data: any) {
    return this.shippingService.updateShipmentStatus(id, data.status, data.location);
  }

  @Post('shipments/:id/cancel')
  async cancelShipment(@Param('id') id: string, @Body('reason') reason: string) {
    return this.shippingService.cancelShipment(id, reason);
  }

  @Post('shipments/:id/pickup')
  async schedulePickup(@Param('id') id: string, @Body() data: any) {
    return this.shippingService.schedulePickup(id, data.pickupDate, data.pickupTime);
  }

  @Get('shipments/:id/label')
  async generateLabel(@Param('id') id: string) {
    return this.shippingService.generateLabel(id);
  }

  @Post('rates')
  async getRates(@Body() data: any) {
    return this.shippingRatesService.getRates(data.weight, data.destination, data.origin);
  }

  @Post('rates/calculate')
  async calculateRate(@Body() data: any) {
    return this.shippingService.calculateShippingCost(data.carrier, data.service, data.weight, data.destination);
  }

  @Get('tracking/:trackingNumber')
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.trackShipment(trackingNumber);
  }

  @Post('tracking/multiple')
  async trackMultipleShipments(@Body('trackingNumbers') trackingNumbers: string[]) {
    return this.trackingService.trackMultipleShipments(trackingNumbers);
  }

  @Post('tracking/:trackingNumber/subscribe')
  async subscribeToTracking(@Param('trackingNumber') trackingNumber: string, @Body('email') email: string) {
    await this.trackingService.subscribeToUpdates(trackingNumber, email);
    return { message: 'Subscribed to tracking updates' };
  }

  @Post('address/validate')
  async validateAddress(@Body() address: any) {
    return this.shippingRatesService.validateAddress(address);
  }
}

