import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, or } from 'drizzle-orm';

export interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  customerId: string;
  customerName: string;
  type: 'personal' | 'shared' | 'template' | 'recurring';
  status: 'active' | 'archived' | 'deleted';
  isDefault: boolean; // Default list for the customer
  items: ShoppingListItem[];
  totalItems: number;
  estimatedValue: number;
  tags: string[];
  sharedWith: string[]; // User IDs with access
  permissions: {
    canEdit: string[]; // User IDs who can edit
    canView: string[]; // User IDs who can view
    canOrder: string[]; // User IDs who can order from this list
  };
  settings: {
    autoReorder: boolean;
    reorderThreshold: number;
    reorderQuantity: number;
    preferredSuppliers: string[];
    deliveryInstructions: string;
  };
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  nextOrderDate?: Date;
  supplierId?: string;
  alternativeProducts: string[]; // Alternative product IDs
  addedAt: Date;
  updatedAt: Date;
}

export interface QuickOrderItem {
  sku: string;
  quantity: number;
  notes?: string;
}

export interface QuickOrderResult {
  success: boolean;
  orderId?: string;
  items: Array<{
    sku: string;
    quantity: number;
    productId?: string;
    productName?: string;
    price?: number;
    status: 'found' | 'not_found' | 'out_of_stock' | 'error';
    message: string;
  }>;
  totalItems: number;
  totalValue: number;
  errors: string[];
}

@Injectable()
export class B2BShoppingListsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async createShoppingList(listData: {
    name: string;
    description?: string;
    customerId: string;
    type?: 'personal' | 'shared' | 'template' | 'recurring';
    isDefault?: boolean;
    tags?: string[];
    sharedWith?: string[];
    permissions?: any;
    settings?: any;
  }, tenantId: string, userId: string): Promise<ShoppingList> {

    const listId = `sl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Get customer name
    const customer = await this.getCustomerDetails(listData.customerId, tenantId);

    // If creating default list, deactivate existing default
    if (listData.isDefault) {
      await this.databaseService.drizzleClient
        .update(this.getShoppingListsTable())
        .set({
          isDefault: false,
          updatedAt: new Date()
        })
        .where(and(
          this.getShoppingListsTable().customerId.eq(listData.customerId),
          this.getShoppingListsTable().tenantId.eq(tenantId),
          this.getShoppingListsTable().isDefault.eq(true)
        ));
    }

    const [list] = await this.databaseService.drizzleClient
      .insert(this.getShoppingListsTable())
      .values({
        id: listId,
        ...listData,
        customerName: customer?.name || '',
        type: listData.type || 'personal',
        status: 'active',
        isDefault: listData.isDefault || false,
        totalItems: 0,
        estimatedValue: 0,
        sharedWith: listData.sharedWith || [],
        permissions: listData.permissions || {
          canEdit: [userId],
          canView: [userId],
          canOrder: [userId]
        },
        settings: listData.settings || {
          autoReorder: false,
          reorderThreshold: 10,
          reorderQuantity: 1,
          preferredSuppliers: [],
          deliveryInstructions: ''
        },
        tenantId,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Clear customer shopping lists cache
    await this.cacheService.del(`customer_shopping_lists:${tenantId}:${listData.customerId}`);

    this.loggerService.log(`Shopping list created: ${list.name} for customer ${listData.customerId}`, 'B2BShoppingListsService');
    return await this.getShoppingList(listId);
  }

  async addItemToList(listId: string, itemData: {
    productId: string;
    quantity: number;
    notes?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    isRecurring?: boolean;
    recurringFrequency?: string;
    nextOrderDate?: Date;
    supplierId?: string;
    alternativeProducts?: string[];
  }, tenantId: string, userId: string): Promise<ShoppingListItem> {

    const list = await this.getShoppingList(listId);
    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    // Check permissions
    if (!this.canEditList(list, userId)) {
      throw new BadRequestException('Insufficient permissions to edit this list');
    }

    const itemId = `sli-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Get product details
    const product = await this.getProductDetails(itemData.productId);

    const [item] = await this.databaseService.drizzleClient
      .insert(this.getShoppingListItemsTable())
      .values({
        id: itemId,
        shoppingListId: listId,
        productId: itemData.productId,
        sku: product?.sku || '',
        productName: product?.name || '',
        quantity: itemData.quantity,
        unitPrice: product?.price || 0,
        totalPrice: (product?.price || 0) * itemData.quantity,
        notes: itemData.notes,
        priority: itemData.priority || 'medium',
        isRecurring: itemData.isRecurring || false,
        recurringFrequency: itemData.recurringFrequency,
        nextOrderDate: itemData.nextOrderDate,
        supplierId: itemData.supplierId,
        alternativeProducts: itemData.alternativeProducts || [],
        addedAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Update list totals
    await this.updateListTotals(listId);

    // Clear cache
    await this.cacheService.del(`shopping_list:${tenantId}:${listId}`);
    await this.cacheService.del(`customer_shopping_lists:${tenantId}:${list.customerId}`);

    this.loggerService.log(`Item added to shopping list: ${list.name} - ${product?.name}`, 'B2BShoppingListsService');
    return item;
  }

  async removeItemFromList(listId: string, itemId: string, tenantId: string, userId: string): Promise<void> {
    const list = await this.getShoppingList(listId);
    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    // Check permissions
    if (!this.canEditList(list, userId)) {
      throw new BadRequestException('Insufficient permissions to edit this list');
    }

    await this.databaseService.drizzleClient
      .delete(this.getShoppingListItemsTable())
      .where(and(
        this.getShoppingListItemsTable().id.eq(itemId),
        this.getShoppingListItemsTable().shoppingListId.eq(listId)
      ));

    // Update list totals
    await this.updateListTotals(listId);

    // Clear cache
    await this.cacheService.del(`shopping_list:${tenantId}:${listId}`);
    await this.cacheService.del(`customer_shopping_lists:${tenantId}:${list.customerId}`);

    this.loggerService.log(`Item removed from shopping list: ${list.name} - ${itemId}`, 'B2BShoppingListsService');
  }

  async updateItemQuantity(listId: string, itemId: string, quantity: number, tenantId: string, userId: string): Promise<ShoppingListItem> {
    const list = await this.getShoppingList(listId);
    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    // Check permissions
    if (!this.canEditList(list, userId)) {
      throw new BadRequestException('Insufficient permissions to edit this list');
    }

    const [updatedItem] = await this.databaseService.drizzleClient
      .update(this.getShoppingListItemsTable())
      .set({
        quantity,
        totalPrice: sql`${this.getShoppingListItemsTable().unitPrice} * ${quantity}`,
        updatedAt: new Date()
      })
      .where(and(
        this.getShoppingListItemsTable().id.eq(itemId),
        this.getShoppingListItemsTable().shoppingListId.eq(listId)
      ))
      .returning();

    // Update list totals
    await this.updateListTotals(listId);

    // Clear cache
    await this.cacheService.del(`shopping_list:${tenantId}:${listId}`);

    this.loggerService.log(`Item quantity updated in shopping list: ${list.name} - ${itemId} to ${quantity}`, 'B2BShoppingListsService');
    return updatedItem;
  }

  async processQuickOrder(items: QuickOrderItem[], customerId: string, tenantId: string, userId: string): Promise<QuickOrderResult> {
    try {
      this.loggerService.log(`Processing quick order for customer ${customerId} - ${items.length} items`, 'B2BShoppingListsService');

      const result: QuickOrderResult = {
        success: false,
        items: [],
        totalItems: 0,
        totalValue: 0,
        errors: []
      };

      const validItems = [];

      // Process each SKU
      for (const item of items) {
        try {
          // Find product by SKU
          const product = await this.findProductBySKU(item.sku, tenantId);
          if (!product) {
            result.items.push({
              sku: item.sku,
              quantity: item.quantity,
              status: 'not_found',
              message: `Product with SKU ${item.sku} not found`
            });
            continue;
          }

          // Check inventory availability
          const inventoryAvailable = await this.checkInventoryAvailability(product.id, item.quantity, tenantId);
          if (!inventoryAvailable.available) {
            result.items.push({
              sku: item.sku,
              quantity: item.quantity,
              productId: product.id,
              productName: product.name,
              status: 'out_of_stock',
              message: `Insufficient stock: ${inventoryAvailable.availableQuantity} available`
            });
            continue;
          }

          // Calculate price with customer discounts
          const calculatedPrice = await this.calculateCustomerPrice(product.id, item.quantity, customerId, tenantId);

          result.items.push({
            sku: item.sku,
            quantity: item.quantity,
            productId: product.id,
            productName: product.name,
            price: calculatedPrice.finalPrice,
            status: 'found',
            message: 'Product found and available'
          });

          validItems.push({
            productId: product.id,
            quantity: item.quantity,
            price: calculatedPrice.finalPrice,
            notes: item.notes
          });

        } catch (error) {
          result.items.push({
            sku: item.sku,
            quantity: item.quantity,
            status: 'error',
            message: `Error processing SKU: ${error.message}`
          });
          result.errors.push(`Error processing ${item.sku}: ${error.message}`);
        }
      }

      if (validItems.length === 0) {
        result.success = false;
        return result;
      }

      // Create order from valid items
      const order = await this.createOrderFromItems(validItems, customerId, tenantId, userId);

      result.success = true;
      result.orderId = order.id;
      result.totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
      result.totalValue = validItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      this.loggerService.log(`Quick order processed successfully: ${result.orderId} - ${result.totalItems} items, ${result.totalValue} value`, 'B2BShoppingListsService');

      return result;

    } catch (error) {
      this.loggerService.error(`Error processing quick order`, error, 'B2BShoppingListsService');
      throw error;
    }
  }

  async importBulkOrder(fileData: any, customerId: string, tenantId: string, userId: string): Promise<QuickOrderResult> {
    try {
      this.loggerService.log(`Processing bulk order import for customer ${customerId}`, 'B2BShoppingListsService');

      // Parse CSV/Excel data
      const items = this.parseImportData(fileData);

      return await this.processQuickOrder(items, customerId, tenantId, userId);

    } catch (error) {
      this.loggerService.error(`Error importing bulk order`, error, 'B2BShoppingListsService');
      throw error;
    }
  }

  async getCustomerShoppingLists(customerId: string, tenantId: string): Promise<ShoppingList[]> {
    const cacheKey = `customer_shopping_lists:${tenantId}:${customerId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const lists = await this.databaseService.drizzleClient
      .select()
      .from(this.getShoppingListsTable())
      .where(and(
        this.getShoppingListsTable().customerId.eq(customerId),
        this.getShoppingListsTable().tenantId.eq(tenantId),
        this.getShoppingListsTable().status.neq('deleted')
      ))
      .orderBy(this.getShoppingListsTable().isDefault, this.getShoppingListsTable().updatedAt);

    const shoppingLists = await Promise.all(
      lists.map(list => this.getShoppingList(list.id))
    );

    await this.cacheService.set(cacheKey, shoppingLists, 1800); // Cache for 30 minutes
    return shoppingLists;
  }

  async getShoppingList(listId: string): Promise<ShoppingList> {
    const cacheKey = `shopping_list:${listId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const results = await this.databaseService.drizzleClient
      .select({
        list: this.getShoppingListsTable(),
        item: this.getShoppingListItemsTable(),
        product: this.getProductsTable()
      })
      .from(this.getShoppingListsTable())
      .leftJoin(this.getShoppingListItemsTable(), this.getShoppingListItemsTable().shoppingListId.eq(this.getShoppingListsTable().id))
      .leftJoin(this.getProductsTable(), this.getProductsTable().id.eq(this.getShoppingListItemsTable().productId))
      .where(this.getShoppingListsTable().id.eq(listId));

    if (results.length === 0) return null;

    const listData = results[0];
    const items = results.map(result => ({
      id: result.item.id,
      shoppingListId: result.item.shoppingListId,
      productId: result.item.productId,
      sku: result.product?.sku,
      productName: result.product?.name,
      quantity: result.item.quantity,
      unitPrice: result.item.unitPrice,
      totalPrice: result.item.totalPrice,
      notes: result.item.notes,
      priority: result.item.priority,
      isRecurring: result.item.isRecurring,
      recurringFrequency: result.item.recurringFrequency,
      nextOrderDate: result.item.nextOrderDate,
      supplierId: result.item.supplierId,
      alternativeProducts: result.item.alternativeProducts,
      addedAt: result.item.addedAt,
      updatedAt: result.item.updatedAt
    }));

    const list: ShoppingList = {
      id: listData.list.id,
      name: listData.list.name,
      description: listData.list.description,
      customerId: listData.list.customerId,
      customerName: listData.list.customerName,
      type: listData.list.type,
      status: listData.list.status,
      isDefault: listData.list.isDefault,
      items,
      totalItems: items.length,
      estimatedValue: items.reduce((sum, item) => sum + item.totalPrice, 0),
      tags: listData.list.tags || [],
      sharedWith: listData.list.sharedWith || [],
      permissions: listData.list.permissions || {},
      settings: listData.list.settings || {},
      tenantId: listData.list.tenantId,
      createdBy: listData.list.createdBy,
      updatedBy: listData.list.updatedBy,
      createdAt: listData.list.createdAt,
      updatedAt: listData.list.updatedAt
    };

    await this.cacheService.set(cacheKey, list, 900); // Cache for 15 minutes
    return list;
  }

  async duplicateShoppingList(listId: string, newName: string, customerId: string, tenantId: string, userId: string): Promise<ShoppingList> {
    const originalList = await this.getShoppingList(listId);
    if (!originalList) {
      throw new NotFoundException('Shopping list not found');
    }

    const duplicatedList = await this.createShoppingList({
      name: newName,
      description: `Copy of ${originalList.name}`,
      customerId,
      type: originalList.type,
      isDefault: false,
      tags: originalList.tags,
      sharedWith: originalList.sharedWith,
      permissions: originalList.permissions,
      settings: originalList.settings
    }, tenantId, userId);

    // Copy all items
    for (const item of originalList.items) {
      await this.addItemToList(duplicatedList.id, {
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
        priority: item.priority,
        isRecurring: item.isRecurring,
        recurringFrequency: item.recurringFrequency,
        nextOrderDate: item.nextOrderDate,
        supplierId: item.supplierId,
        alternativeProducts: item.alternativeProducts
      }, tenantId, userId);
    }

    this.loggerService.log(`Shopping list duplicated: ${originalList.name} -> ${newName}`, 'B2BShoppingListsService');
    return duplicatedList;
  }

  async shareShoppingList(listId: string, shareData: {
    userIds: string[];
    permissions: {
      canEdit: boolean;
      canView: boolean;
      canOrder: boolean;
    };
  }, tenantId: string, userId: string): Promise<void> {

    const list = await this.getShoppingList(listId);
    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    // Check if user can share this list
    if (!this.canEditList(list, userId)) {
      throw new BadRequestException('Insufficient permissions to share this list');
    }

    // Update list sharing
    const updatedPermissions = { ...list.permissions };

    for (const shareUserId of shareData.userIds) {
      if (shareData.permissions.canEdit) {
        if (!updatedPermissions.canEdit.includes(shareUserId)) {
          updatedPermissions.canEdit.push(shareUserId);
        }
      }

      if (shareData.permissions.canView) {
        if (!updatedPermissions.canView.includes(shareUserId)) {
          updatedPermissions.canView.push(shareUserId);
        }
      }

      if (shareData.permissions.canOrder) {
        if (!updatedPermissions.canOrder.includes(shareUserId)) {
          updatedPermissions.canOrder.push(shareUserId);
        }
      }

      if (!list.sharedWith.includes(shareUserId)) {
        list.sharedWith.push(shareUserId);
      }
    }

    await this.databaseService.drizzleClient
      .update(this.getShoppingListsTable())
      .set({
        sharedWith: list.sharedWith,
        permissions: updatedPermissions,
        updatedAt: new Date()
      })
      .where(this.getShoppingListsTable().id.eq(listId));

    // Clear cache
    await this.cacheService.del(`shopping_list:${tenantId}:${listId}`);

    this.loggerService.log(`Shopping list shared: ${list.name} with ${shareData.userIds.length} users`, 'B2BShoppingListsService');
  }

  async createOrderFromList(listId: string, customerId: string, tenantId: string, userId: string): Promise<any> {
    const list = await this.getShoppingList(listId);
    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    // Check permissions
    if (!this.canOrderFromList(list, userId)) {
      throw new BadRequestException('Insufficient permissions to order from this list');
    }

    // Create order from list items
    const orderItems = list.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.unitPrice,
      notes: item.notes
    }));

    return await this.createOrderFromItems(orderItems, customerId, tenantId, userId);
  }

  // Private helper methods
  private async getCustomerDetails(customerId: string, tenantId: string): Promise<any> {
    const customers = await this.databaseService.drizzleClient
      .select()
      .from(this.getCustomersTable())
      .where(and(
        this.getCustomersTable().id.eq(customerId),
        this.getCustomersTable().tenantId.eq(tenantId)
      ))
      .limit(1);

    return customers[0] || null;
  }

  private async getProductDetails(productId: string): Promise<any> {
    const products = await this.databaseService.drizzleClient
      .select()
      .from(this.getProductsTable())
      .where(this.getProductsTable().id.eq(productId))
      .limit(1);

    return products[0] || null;
  }

  private async findProductBySKU(sku: string, tenantId: string): Promise<any> {
    const products = await this.databaseService.drizzleClient
      .select()
      .from(this.getProductsTable())
      .where(and(
        this.getProductsTable().sku.eq(sku),
        this.getProductsTable().tenantId.eq(tenantId)
      ))
      .limit(1);

    return products[0] || null;
  }

  private async checkInventoryAvailability(productId: string, quantity: number, tenantId: string): Promise<any> {
    // Check inventory availability in WMS
    // For now, return mock data
    return {
      available: true,
      availableQuantity: 100
    };
  }

  private async calculateCustomerPrice(productId: string, quantity: number, customerId: string, tenantId: string): Promise<any> {
    // Calculate price with customer discounts
    // This would integrate with B2BTieredPricingService
    const basePrice = 100; // Mock price
    return {
      basePrice: basePrice * quantity,
      finalPrice: basePrice * quantity * 0.9, // 10% discount
      discountAmount: basePrice * quantity * 0.1,
      discountPercentage: 10
    };
  }

  private async createOrderFromItems(items: any[], customerId: string, tenantId: string, userId: string): Promise<any> {
    // Create order from items
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const order = {
      id: orderId,
      customerId,
      items,
      status: 'pending',
      totalAmount: items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
      tenantId,
      createdBy: userId,
      createdAt: new Date()
    };

    // In real implementation, this would save to orders table
    this.loggerService.log(`Order created from items: ${orderId}`, 'B2BShoppingListsService');

    return order;
  }

  private async updateListTotals(listId: string): Promise<void> {
    const items = await this.databaseService.drizzleClient
      .select({
        quantity: this.getShoppingListItemsTable().quantity,
        unitPrice: this.getShoppingListItemsTable().unitPrice
      })
      .from(this.getShoppingListItemsTable())
      .where(this.getShoppingListItemsTable().shoppingListId.eq(listId));

    const totalItems = items.length;
    const estimatedValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    await this.databaseService.drizzleClient
      .update(this.getShoppingListsTable())
      .set({
        totalItems,
        estimatedValue,
        updatedAt: new Date()
      })
      .where(this.getShoppingListsTable().id.eq(listId));
  }

  private async parseImportData(fileData: any): Promise<QuickOrderItem[]> {
    // Parse CSV/Excel data
    // For now, return mock data
    return [
      { sku: 'SKU-001', quantity: 10, notes: 'Urgent' },
      { sku: 'SKU-002', quantity: 5 },
      { sku: 'SKU-003', quantity: 20, notes: 'Monthly order' }
    ];
  }

  private canEditList(list: ShoppingList, userId: string): boolean {
    return list.permissions.canEdit.includes(userId) ||
           list.createdBy === userId ||
           list.customerId === userId; // Customer can edit their own lists
  }

  private canOrderFromList(list: ShoppingList, userId: string): boolean {
    return list.permissions.canOrder.includes(userId) ||
           list.createdBy === userId ||
           list.customerId === userId; // Customer can order from their own lists
  }

  private getShoppingListsTable() {
    return sql`b2b_shopping_lists`;
  }

  private getShoppingListItemsTable() {
    return sql`b2b_shopping_list_items`;
  }

  private getCustomersTable() {
    return sql`customers`;
  }

  private getProductsTable() {
    return sql`products`;
  }
}
