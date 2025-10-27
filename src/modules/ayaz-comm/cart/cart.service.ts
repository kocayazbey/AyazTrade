import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { eq, and, or, gte, lte, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../core/database/database.service';
import { carts, cartItems } from '../../../database/schema/carts.schema';
import { products } from '../../../database/schema/products.schema';
import { coupons } from '../../../database/schema/promotions.schema';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import type { Cart, CartItem } from '../../../database/schema/carts.schema';

@Injectable()
export class CartService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCart(userId: string) {
    const cart = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    let userCart = cart[0];

    if (!userCart) {
      // Create new cart
      [userCart] = await this.databaseService.drizzleClient
        .insert(carts)
        .values({ userId })
        .returning();
    }

    // Fetch cart items with product info
    const items = await this.databaseService.drizzleClient
      .select({
        cartItem: cartItems,
        product: products,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, userCart.id));

    return this.calculateCartTotals({ ...userCart, items: items.map(i => ({ ...i.cartItem, product: i.product })) });
  }

  async addItem(userId: string, addItemDto: AddItemDto) {
    const { productId, quantity, variantId } = addItemDto;

    // Get or create cart
    let cart = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    let userCart = cart[0];

    if (!userCart) {
      [userCart] = await this.databaseService.drizzleClient
        .insert(carts)
        .values({ userId })
        .returning();
    }

    // Check if product exists and is available
    const product = await this.databaseService.drizzleClient
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    const productData = product[0];

    if (!productData) {
      throw new NotFoundException('Product not found or not available');
    }

    if (productData.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Check if item already exists in cart
    const existingItem = await this.databaseService.drizzleClient
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, userCart.id),
          eq(cartItems.productId, productId),
          variantId ? eq(cartItems.variantId, variantId) : eq(cartItems.variantId, null)
        )
      )
      .limit(1);

    if (existingItem[0]) {
      // Update quantity
      await this.databaseService.drizzleClient
        .update(cartItems)
        .set({ quantity: existingItem[0].quantity + quantity })
        .where(eq(cartItems.id, existingItem[0].id));
    } else {
      // Create new cart item
      await this.databaseService.drizzleClient
        .insert(cartItems)
        .values({
          cartId: userCart.id,
          productId,
          quantity,
          variantId: variantId || null,
          price: productData.price.toString(),
        });
    }

    return this.getCart(userId);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    const cart = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    const userCart = cart[0];

    if (!userCart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.databaseService.drizzleClient
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, userCart.id)))
      .limit(1);

    if (!cartItem[0]) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity === 0) {
      await this.databaseService.drizzleClient
        .delete(cartItems)
        .where(eq(cartItems.id, itemId));
    } else {
      await this.databaseService.drizzleClient
        .update(cartItems)
        .set({ quantity })
        .where(eq(cartItems.id, itemId));
    }

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    const userCart = cart[0];

    if (!userCart) {
      throw new NotFoundException('Cart not found');
    }

    await this.databaseService.drizzleClient
      .delete(cartItems)
      .where(eq(cartItems.cartId, userCart.id));

    const updatedCart = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(eq(carts.id, userCart.id))
      .limit(1);

    return this.calculateCartTotals({ ...updatedCart[0], items: [] });
  }

  async applyCoupon(userId: string, couponCode: string) {
    const cart = await this.getCart(userId);
    
    // Validate coupon
    const [coupon] = await this.databaseService.drizzleClient
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, couponCode),
          eq(coupons.isActive, 'true'),
          sql`${coupons.startDate} <= NOW()`,
          sql`${coupons.endDate} >= NOW()`
        )
      )
      .limit(1);

    if (!coupon) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    // Check usage limits
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // Check minimum purchase
    const subtotal = cart.subtotal || 0;
    if (coupon.minimumPurchase && parseFloat(coupon.minimumPurchase.toString()) > subtotal) {
      throw new BadRequestException(`Minimum purchase of ${coupon.minimumPurchase} required`);
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = subtotal * (parseFloat(coupon.value.toString()) / 100);
      if (coupon.maximumDiscount) {
        discount = Math.min(discount, parseFloat(coupon.maximumDiscount.toString()));
      }
    } else if (coupon.type === 'fixed') {
      discount = parseFloat(coupon.value.toString());
    }

    // Update cart with coupon
    await this.databaseService.drizzleClient
      .update(carts)
      .set({
        couponCode: couponCode,
        discountAmount: discount.toString(),
        discountType: coupon.type,
      })
      .where(eq(carts.userId, userId));

    return this.getCart(userId);
  }

  async removeCoupon(userId: string) {
    await this.databaseService.drizzleClient
      .update(carts)
      .set({
        couponCode: null,
        discountAmount: '0',
        discountType: null,
      })
      .where(eq(carts.userId, userId));
    
    return this.getCart(userId);
  }

  private calculateCartTotals(cart: any) {
    const items = cart.items || [];
    const subtotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0);
    const tax = subtotal * 0.18; // 18% KDV
    const shipping = subtotal > 500 ? 0 : 25; // Free shipping over 500 TL
    const discount = parseFloat(cart.discountAmount || '0');
    const total = subtotal + tax + shipping - discount;

    return {
      ...cart,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    };
  }

  async findByUserId(userId: string) {
    return this.getCart(userId);
  }

  async updateItem(id: string, updateItemDto: any) {
    const item = await this.databaseService.drizzleClient
      .select()
      .from(cartItems)
      .where(eq(cartItems.id, id))
      .limit(1);

    if (!item[0]) {
      throw new NotFoundException('Cart item not found');
    }

    const [updatedItem] = await this.databaseService.drizzleClient
      .update(cartItems)
      .set(updateItemDto)
      .where(eq(cartItems.id, id))
      .returning();

    return updatedItem;
  }

  async removeItem(id: string, userId: string) {
    await this.databaseService.drizzleClient
      .delete(cartItems)
      .where(eq(cartItems.id, id));

    return { message: 'Item removed from cart' };
  }
}
