import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TieredPricingService } from './tiered-pricing.service';
import { BulkOrderService } from './bulk-order.service';
import { ShoppingListsService } from './shopping-lists.service';

@ApiTags('B2B')
@ApiBearerAuth()
@Controller('b2b')
export class B2BController {
  constructor(
    private readonly pricingService: TieredPricingService,
    private readonly bulkOrderService: BulkOrderService,
    private readonly shoppingListsService: ShoppingListsService,
  ) {}

  @Get('pricing/calculate')
  @ApiOperation({ summary: 'Calculate tiered price for product' })
  async calculatePrice(
    @Query('productId') productId: string,
    @Query('quantity') quantity: number,
    @Query('customerId') customerId?: string,
  ) {
    return this.pricingService.calculatePrice(productId, Number(quantity), customerId);
  }

  @Post('pricing/tiers')
  @ApiOperation({ summary: 'Create price tier' })
  async createTier(@Body() tier: any) {
    return this.pricingService.createTier(tier);
  }

  @Get('pricing/tiers/:productId')
  @ApiOperation({ summary: 'Get price tiers for product' })
  async getTiers(@Param('productId') productId: string) {
    return this.pricingService.getTiersForProduct(productId);
  }

  @Post('bulk-order/import/excel')
  @ApiOperation({ summary: 'Import bulk order from Excel' })
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.bulkOrderService.importFromExcel(file.buffer);
  }

  @Post('bulk-order/import/csv')
  @ApiOperation({ summary: 'Import bulk order from CSV' })
  async importCSV(@Body('csvContent') csvContent: string) {
    return this.bulkOrderService.importFromCSV(csvContent);
  }

  @Post('bulk-order/quick')
  @ApiOperation({ summary: 'Quick order by SKU list' })
  async quickOrder(@Body('items') items: any[]) {
    return this.bulkOrderService.quickOrder(items);
  }

  @Get('bulk-order/template/excel')
  @ApiOperation({ summary: 'Download Excel template' })
  async downloadExcelTemplate() {
    const buffer = this.bulkOrderService.generateExcelTemplate();
    return { template: buffer.toString('base64') };
  }

  @Post('shopping-lists')
  @ApiOperation({ summary: 'Create shopping list' })
  async createShoppingList(@Body() data: { customerId: string; name: string; description?: string }) {
    return this.shoppingListsService.createList(data.customerId, data.name, data.description);
  }

  @Get('shopping-lists/customer/:customerId')
  @ApiOperation({ summary: 'Get customer shopping lists' })
  async getCustomerLists(@Param('customerId') customerId: string) {
    return this.shoppingListsService.getCustomerLists(customerId);
  }

  @Get('shopping-lists/:listId')
  @ApiOperation({ summary: 'Get shopping list' })
  async getList(@Param('listId') listId: string) {
    return this.shoppingListsService.getList(listId);
  }

  @Put('shopping-lists/:listId')
  @ApiOperation({ summary: 'Update shopping list' })
  async updateList(@Param('listId') listId: string, @Body() updates: any) {
    return this.shoppingListsService.updateList(listId, updates);
  }

  @Delete('shopping-lists/:listId')
  @ApiOperation({ summary: 'Delete shopping list' })
  async deleteList(@Param('listId') listId: string) {
    await this.shoppingListsService.deleteList(listId);
    return { success: true };
  }

  @Post('shopping-lists/:listId/items')
  @ApiOperation({ summary: 'Add item to shopping list' })
  async addItem(@Param('listId') listId: string, @Body() item: any) {
    return this.shoppingListsService.addItem(listId, item.productId, item.sku, item.quantity, item.notes);
  }

  @Delete('shopping-lists/:listId/items/:itemId')
  @ApiOperation({ summary: 'Remove item from shopping list' })
  async removeItem(@Param('listId') listId: string, @Param('itemId') itemId: string) {
    await this.shoppingListsService.removeItem(listId, itemId);
    return { success: true };
  }

  @Post('shopping-lists/:listId/add-to-cart')
  @ApiOperation({ summary: 'Add shopping list to cart' })
  async addListToCart(@Param('listId') listId: string) {
    return this.shoppingListsService.addToCart(listId);
  }
}

