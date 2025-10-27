import { Injectable, Logger, NotFoundException } from '@nestjs/common';

interface ShoppingList {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  items: ShoppingListItem[];
  isDefault: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ShoppingListItem {
  id: string;
  productId: string;
  sku: string;
  quantity: number;
  notes?: string;
  position: number;
  addedAt: Date;
}

@Injectable()
export class ShoppingListsService {
  private readonly logger = new Logger(ShoppingListsService.name);
  private shoppingLists: Map<string, ShoppingList> = new Map();

  async createList(customerId: string, name: string, description?: string): Promise<ShoppingList> {
    const list: ShoppingList = {
      id: `list_${Date.now()}`,
      customerId,
      name,
      description,
      items: [],
      isDefault: false,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.shoppingLists.set(list.id, list);
    this.logger.log(`Shopping list created: ${list.id}`);
    return list;
  }

  async getList(listId: string): Promise<ShoppingList> {
    const list = this.shoppingLists.get(listId);
    if (!list) {
      throw new NotFoundException(`Shopping list ${listId} not found`);
    }
    return list;
  }

  async getCustomerLists(customerId: string): Promise<ShoppingList[]> {
    return Array.from(this.shoppingLists.values()).filter((list) => list.customerId === customerId);
  }

  async updateList(listId: string, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    const list = await this.getList(listId);
    const updated = { ...list, ...updates, updatedAt: new Date() };
    this.shoppingLists.set(listId, updated);
    return updated;
  }

  async deleteList(listId: string): Promise<void> {
    this.shoppingLists.delete(listId);
    this.logger.log(`Shopping list deleted: ${listId}`);
  }

  async addItem(listId: string, productId: string, sku: string, quantity: number, notes?: string): Promise<ShoppingListItem> {
    const list = await this.getList(listId);

    const existingItem = list.items.find((item) => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.notes = notes || existingItem.notes;
      this.shoppingLists.set(listId, { ...list, updatedAt: new Date() });
      return existingItem;
    }

    const newItem: ShoppingListItem = {
      id: `item_${Date.now()}`,
      productId,
      sku,
      quantity,
      notes,
      position: list.items.length,
      addedAt: new Date(),
    };

    list.items.push(newItem);
    list.updatedAt = new Date();
    this.shoppingLists.set(listId, list);

    this.logger.log(`Item added to shopping list ${listId}`);
    return newItem;
  }

  async removeItem(listId: string, itemId: string): Promise<void> {
    const list = await this.getList(listId);
    list.items = list.items.filter((item) => item.id !== itemId);
    list.updatedAt = new Date();
    this.shoppingLists.set(listId, list);
  }

  async updateItem(listId: string, itemId: string, updates: { quantity?: number; notes?: string }): Promise<ShoppingListItem> {
    const list = await this.getList(listId);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    if (updates.quantity !== undefined) item.quantity = updates.quantity;
    if (updates.notes !== undefined) item.notes = updates.notes;

    list.updatedAt = new Date();
    this.shoppingLists.set(listId, list);

    return item;
  }

  async addToCart(listId: string): Promise<any> {
    const list = await this.getList(listId);
    
    return {
      success: true,
      itemsAdded: list.items.length,
      cartId: `cart_${Date.now()}`,
      items: list.items,
    };
  }

  async duplicateList(listId: string, newName: string): Promise<ShoppingList> {
    const original = await this.getList(listId);
    
    const duplicated: ShoppingList = {
      ...original,
      id: `list_${Date.now()}`,
      name: newName,
      items: original.items.map((item) => ({ ...item, id: `item_${Date.now()}_${item.id}` })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.shoppingLists.set(duplicated.id, duplicated);
    this.logger.log(`Shopping list duplicated: ${listId} -> ${duplicated.id}`);
    return duplicated;
  }

  async shareList(listId: string, shareWith: string[]): Promise<void> {
    const list = await this.getList(listId);
    list.isShared = true;
    list.updatedAt = new Date();
    this.shoppingLists.set(listId, list);
    this.logger.log(`Shopping list shared: ${listId}`);
  }
}

