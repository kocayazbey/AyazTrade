import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { RequireCsrf } from '../../core/decorators/security.decorator';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { CreateOrderDto, UpdateOrderDto } from './dto/create-order.dto';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Public } from '../../core/auth/decorators/public.decorator';
import { ShippingService } from './services/shipping.service';

@ApiTags('Orders - E-commerce Order Management')
@Controller({ path: 'orders', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shippingService: ShippingService,
  ) {}

  @Get()
  @Roles('admin', 'super_admin', 'manager', 'order_manager')
  @ApiOperation({ summary: 'Get orders (Admin or User orders)' })
  async getOrders(@Query() query: any, @CurrentUser('id') userId: string, @CurrentUser('role') userRole: string) {
    return this.ordersService.getOrders(query, userId, userRole);
  }

  @Get('stats')
  @Roles('admin', 'super_admin', 'manager', 'order_manager')
  @ApiOperation({ summary: 'Get order statistics' })
  async getOrderStats(@CurrentUser('id') userId: string, @CurrentUser('role') userRole: string) {
    return this.ordersService.getOrderStats(userId, userRole);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrderById(@Param('id') orderId: string, @CurrentUser('id') userId: string, @CurrentUser('role') userRole: string) {
    return this.ordersService.getOrderById(orderId, userId, userRole);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequireCsrf()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new order' })
  async createOrder(@Body() data: CreateOrderDto, @CurrentUser('id') userId: string) {
    return this.ordersService.createOrder(data, userId);
  }

  @Put(':id')
  @Roles('admin', 'super_admin', 'order_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update order (Admin only)' })
  async updateOrder(@Param('id') orderId: string, @Body() data: UpdateOrderDto) {
    return this.ordersService.updateOrder(orderId, data);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin', 'order_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update order status' })
  async updateOrderStatus(@Param('id') orderId: string, @Body() data: any) {
    return this.ordersService.updateOrderStatus(orderId, data.status);
  }

  @Patch(':id/cancel')
  @Roles('admin', 'super_admin', 'order_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.cancelOrder(orderId, userId);
  }

  @Post(':id/payment')
  @UseGuards(JwtAuthGuard)
  @RequireCsrf()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process order payment' })
  async processPayment(@Param('id') orderId: string, @Body() paymentData: any, @CurrentUser('id') userId: string) {
    return this.ordersService.processPayment(orderId, paymentData, userId);
  }

  @Get(':id/tracking')
  @Public()
  @ApiOperation({ summary: 'Get order tracking information' })
  async getOrderTracking(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.getOrderTracking(orderId, userId);
  }

  @Post(':id/refund')
  @Roles('admin', 'super_admin', 'order_manager')
  @RequireCsrf()
  @ApiOperation({ summary: 'Request order refund' })
  async requestRefund(@Param('id') orderId: string, @Body() refundData: any, @CurrentUser('id') userId: string) {
    return this.ordersService.requestRefund(orderId, refundData, userId);
  }

  @Post(':id/partial-refund')
  @Roles('admin', 'super_admin', 'manager', 'customer_service')
  @RequireCsrf()
  @ApiOperation({ summary: 'Process partial refund' })
  async processPartialRefund(@Param('id') orderId: string, @Body() refundData: any, @CurrentUser('id') userId: string) {
    return this.ordersService.processPartialRefund(orderId, refundData, userId);
  }

  @Post(':id/cancel-with-refund')
  @Roles('admin', 'super_admin', 'manager', 'customer_service')
  @RequireCsrf()
  @ApiOperation({ summary: 'Cancel order with full refund' })
  async cancelOrderWithRefund(
    @Param('id') orderId: string,
    @Body() data: { reason?: string },
    @CurrentUser('id') userId: string
  ) {
    return this.ordersService.cancelOrder(orderId, userId, data.reason || 'Cancelled by admin');
  }

  // Shipping endpoints
  @Get('shipping/providers')
  @ApiOperation({ summary: 'Get available shipping providers' })
  async getShippingProviders() {
    return this.shippingService.getAvailableProviders();
  }

  @Post('shipping/rates')
  @ApiOperation({ summary: 'Get shipping rates' })
  async getShippingRates(@Body() shipmentData: any, @CurrentUser('tenantId') tenantId: string) {
    // Add orderId and tenant info to shipment data
    const fullShipmentData = {
      ...shipmentData,
      orderId: shipmentData.orderId || 'temp-order',
      tenantId,
    };
    return this.shippingService.getShippingRates(fullShipmentData);
  }

  @Post('shipping/create')
  @RequireCsrf()
  @ApiOperation({ summary: 'Create shipment with provider' })
  async createShipment(
    @Body() data: { provider: string; shipmentData: any },
    @CurrentUser('tenantId') tenantId: string
  ) {
    const fullShipmentData = {
      ...data.shipmentData,
      orderId: data.shipmentData.orderId || 'temp-order',
      tenantId,
    };
    return this.shippingService.createShipment(data.provider, fullShipmentData);
  }

  @Get('shipping/track/:provider/:trackingNumber')
  @ApiOperation({ summary: 'Track shipment' })
  async trackShipment(@Param('provider') provider: string, @Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.trackShipment(provider, trackingNumber);
  }

  @Delete('shipping/cancel/:provider/:trackingNumber')
  @RequireCsrf()
  @ApiOperation({ summary: 'Cancel shipment' })
  async cancelShipment(@Param('provider') provider: string, @Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.cancelShipment(provider, trackingNumber);
  }

  @Post('shipping/validate-address')
  @ApiOperation({ summary: 'Validate shipping address' })
  async validateAddress(@Body() address: any) {
    return this.shippingService.validateAddress(address);
  }

  @Get('shipping/zones')
  @ApiOperation({ summary: 'Get shipping zones' })
  async getShippingZones() {
    return this.shippingService.getShippingZones();
  }
}