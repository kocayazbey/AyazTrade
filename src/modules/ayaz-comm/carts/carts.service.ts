import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartsService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getOrCreate(customerId?: string, sessionId?: string): Promise<any> {
    let cart = await this.findCart(customerId, sessionId);

    if (!cart) {
      cart = await this.create(customerId, sessionId);
    }

    return cart;
  }

  async create(customerId?: string, sessionId?: string): Promise<any> {
    const cart = {
      customerId,
      sessionId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    return cart;
  }

  async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<any> {
    const cart = await this.findOne(cartId);

    const product = await this.productsService.findOne(productId);
    const price = product.price;

    const existingItemIndex = cart.items.findIndex(
      (item: any) =>
        item.productId === productId &&
        (variantId ? item.variantId === variantId : !item.variantId),
    );

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].subtotal =
        cart.items[existingItemIndex].quantity * parseFloat(price.toString());
    } else {
      cart.items.push({
        productId,
        variantId,
        name: product.name,
        sku: product.sku,
        price,
        quantity,
        subtotal: parseFloat(price.toString()) * quantity,
        image: product.featuredImage,
      });
    }

    await this.recalculate(cart);

    this.eventEmitter.emit('cart.item.added', {
      cartId,
      productId,
      variantId,
      quantity,
    });

    return cart;
  }

  async updateItem(
    cartId: string,
    itemIndex: number,
    quantity: number,
  ): Promise<any> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const cart = await this.findOne(cartId);

    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Cart item not found');
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].subtotal = 
      cart.items[itemIndex].price * quantity;

    await this.recalculate(cart);

    this.eventEmitter.emit('cart.item.updated', {
      cartId,
      itemIndex,
      quantity,
    });

    return cart;
  }

  async removeItem(cartId: string, itemIndex: number): Promise<any> {
    const cart = await this.findOne(cartId);

    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Cart item not found');
    }

    const removed = cart.items.splice(itemIndex, 1)[0];

    await this.recalculate(cart);

    this.eventEmitter.emit('cart.item.removed', {
      cartId,
      productId: removed.productId,
    });

    return cart;
  }

  async clear(cartId: string): Promise<any> {
    const cart = await this.findOne(cartId);

    cart.items = [];
    cart.subtotal = 0;
    cart.tax = 0;
    cart.discount = 0;
    cart.total = 0;
    cart.couponCode = null;
    cart.updatedAt = new Date();

    this.eventEmitter.emit('cart.cleared', { cartId });

    return cart;
  }

  async applyCoupon(cartId: string, couponCode: string): Promise<any> {
    const cart = await this.findOne(cartId);

    const discount = await this.calculateCouponDiscount(couponCode, cart);

    cart.couponCode = couponCode;
    cart.discount = discount;

    await this.recalculate(cart);

    return cart;
  }

  async removeCoupon(cartId: string): Promise<any> {
    const cart = await this.findOne(cartId);

    cart.couponCode = null;
    cart.discount = 0;

    await this.recalculate(cart);

    return cart;
  }

  async findOne(id: string): Promise<any> {
    const cart = null;
    
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    return cart;
  }

  async findCart(customerId?: string, sessionId?: string): Promise<any> {
    return null;
  }

  async mergeGuestCart(customerId: string, sessionId: string): Promise<any> {
    const guestCart = await this.findCart(undefined, sessionId);
    const customerCart = await this.getOrCreate(customerId);

    if (!guestCart || guestCart.items.length === 0) {
      return customerCart;
    }

    for (const item of guestCart.items) {
      await this.addItem(
        customerCart.id,
        item.productId,
        item.quantity,
        item.variantId,
      );
    }

    return customerCart;
  }

  private async recalculate(cart: any): Promise<void> {
    cart.subtotal = cart.items.reduce(
      (sum: number, item: any) => sum + item.subtotal,
      0,
    );

    const taxRate = 18;
    cart.tax = ((cart.subtotal - (cart.discount || 0)) * taxRate) / 100;

    cart.total = cart.subtotal - (cart.discount || 0) + cart.tax;

    cart.updatedAt = new Date();
  }

  private async calculateCouponDiscount(
    couponCode: string,
    cart: any,
  ): Promise<number> {
    return 0;
  }
}

