import { Injectable, Logger } from '@nestjs/common';

interface FavoriteProduct {
  id: string;
  customerId: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  lastPrice?: number;
  defaultQuantity: number;
  notes?: string;
  categoryName?: string;
  addedAt: Date;
}

interface FavoriteCollection {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  productIds: string[];
  isDefault: boolean;
  createdAt: Date;
}

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);
  private favorites: Map<string, FavoriteProduct[]> = new Map();
  private collections: Map<string, FavoriteCollection[]> = new Map();

  async addFavorite(customerId: string, productData: {
    productId: string;
    sku: string;
    name: string;
    price: number;
    defaultQuantity?: number;
    notes?: string;
  }): Promise<FavoriteProduct> {
    const favorite: FavoriteProduct = {
      id: `fav_${Date.now()}`,
      customerId,
      productId: productData.productId,
      sku: productData.sku,
      name: productData.name,
      price: productData.price,
      defaultQuantity: productData.defaultQuantity || 1,
      notes: productData.notes,
      addedAt: new Date(),
    };

    let customerFavorites = this.favorites.get(customerId) || [];
    
    const existing = customerFavorites.find(f => f.productId === productData.productId);
    if (existing) {
      existing.defaultQuantity = productData.defaultQuantity || existing.defaultQuantity;
      existing.notes = productData.notes || existing.notes;
      return existing;
    }

    customerFavorites.push(favorite);
    this.favorites.set(customerId, customerFavorites);

    this.logger.log(`Product added to favorites: ${productData.sku} for customer ${customerId}`);
    return favorite;
  }

  async removeFavorite(customerId: string, productId: string): Promise<void> {
    const customerFavorites = this.favorites.get(customerId) || [];
    const filtered = customerFavorites.filter(f => f.productId !== productId);
    this.favorites.set(customerId, filtered);
    this.logger.log(`Product removed from favorites: ${productId}`);
  }

  async getFavorites(customerId: string): Promise<FavoriteProduct[]> {
    return this.favorites.get(customerId) || [];
  }

  async updateFavorite(customerId: string, productId: string, updates: {
    defaultQuantity?: number;
    notes?: string;
  }): Promise<FavoriteProduct> {
    const customerFavorites = this.favorites.get(customerId) || [];
    const favorite = customerFavorites.find(f => f.productId === productId);
    
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    if (updates.defaultQuantity !== undefined) {
      favorite.defaultQuantity = updates.defaultQuantity;
    }
    if (updates.notes !== undefined) {
      favorite.notes = updates.notes;
    }

    this.favorites.set(customerId, customerFavorites);
    return favorite;
  }

  async addAllToCart(customerId: string): Promise<any> {
    const favorites = await this.getFavorites(customerId);

    return {
      success: true,
      itemsAdded: favorites.length,
      cartId: `cart_${Date.now()}`,
      items: favorites.map(f => ({
        productId: f.productId,
        sku: f.sku,
        quantity: f.defaultQuantity,
      })),
    };
  }

  async checkPriceChanges(customerId: string): Promise<FavoriteProduct[]> {
    const favorites = await this.getFavorites(customerId);
    const priceChanged: FavoriteProduct[] = [];

    for (const favorite of favorites) {
      if (favorite.lastPrice && favorite.lastPrice !== favorite.price) {
        priceChanged.push(favorite);
      }
    }

    return priceChanged;
  }

  async createCollection(customerId: string, name: string, productIds: string[]): Promise<FavoriteCollection> {
    const collection: FavoriteCollection = {
      id: `collection_${Date.now()}`,
      customerId,
      name,
      productIds,
      isDefault: false,
      createdAt: new Date(),
    };

    let customerCollections = this.collections.get(customerId) || [];
    customerCollections.push(collection);
    this.collections.set(customerId, customerCollections);

    return collection;
  }

  async getCollections(customerId: string): Promise<FavoriteCollection[]> {
    return this.collections.get(customerId) || [];
  }
}

