import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('Inventory')
@Controller({ path: 'inventory', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiResponse({ status: 200, description: 'Returns paginated inventory list' })
  async getInventory(@Query() filters: any, @CurrentUser('tenantId') tenantId: string) {
    return this.inventoryService.getInventory(filters, tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiResponse({ status: 200, description: 'Returns inventory statistics' })
  async getInventoryStats(@CurrentUser('tenantId') tenantId: string) {
    return this.inventoryService.getInventoryStats(tenantId);
  }

  @Get(':sku')
  @ApiOperation({ summary: 'Get inventory by SKU' })
  @ApiResponse({ status: 200, description: 'Returns inventory details for SKU' })
  async getInventoryBySKU(@Param('sku') sku: string, @CurrentUser('tenantId') tenantId: string) {
    return this.inventoryService.getInventoryBySKU(sku, tenantId);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust inventory levels' })
  @ApiResponse({ status: 200, description: 'Inventory adjusted successfully' })
  async adjustInventory(
    @Body() data: any, 
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.adjustInventory(data, tenantId, userId);
  }

  @Put('transfer')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @ApiResponse({ status: 200, description: 'Stock transferred successfully' })
  async transferStock(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.transferStock(data, tenantId, userId);
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiResponse({ status: 200, description: 'Returns low stock alerts' })
  async getLowStockAlerts(@CurrentUser('tenantId') tenantId: string) {
    return this.inventoryService.getLowStockAlerts(tenantId);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update inventory items' })
  @ApiResponse({ status: 200, description: 'Bulk inventory update completed' })
  async bulkUpdateInventory(
    @Body() data: { updates: any[] },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.bulkUpdateInventory(data.updates, tenantId, userId);
  }

  @Post('bulk-transfer')
  @ApiOperation({ summary: 'Bulk transfer stock between warehouses' })
  @ApiResponse({ status: 200, description: 'Bulk stock transfer completed' })
  async bulkTransferStock(
    @Body() data: { transfers: any[] },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.inventoryService.bulkTransferStock(data.transfers, tenantId, userId);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to real-time inventory changes' })
  @ApiResponse({ status: 200, description: 'Subscription started' })
  async subscribeToChanges(@CurrentUser('tenantId') tenantId: string) {
    return {
      success: true,
      message: 'Subscription started',
      channel: `inventory_changes:${tenantId}`
    };
  }
}

