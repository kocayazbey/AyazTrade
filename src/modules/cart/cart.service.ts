import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { carts, cartItems } from '../../database/schema/carts.schema';
import { products } from '../../database/schema/products.schema';

@Injectable()
export class CartService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCart(userId: string) {
    // Get or create cart
    let [cart] = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(and(
        eq(carts.userId, userId),
        eq(carts.isActive, true)
      ))
      .limit(1);

    if (!cart) {
      // Create new cart
      [cart] = await this.databaseService.drizzleClient
        .insert(carts)
        .values({
          userId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    // Get cart items with product details
    const items = await this.databaseService.drizzleClient
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        price: cartItems.price,
        compareAtPrice: cartItems.compareAtPrice,
        options: cartItems.options,
        attributes: cartItems.attributes,
        isActive: cartItems.isActive,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
        // Product details
        productName: products.name,
        productSku: products.sku,
        productImage: products.featuredImage,
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.isActive, true)
      ));

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price.toString());
      const quantity = item.quantity;
      return sum + (price * quantity);
    }, 0);

    const taxAmount = subtotal * 0.18; // 18% tax
    const discountAmount = parseFloat(cart.discountAmount?.toString() || '0');
    const shippingCost = parseFloat(cart.shipping?.toString() || '0');
    const totalAmount = subtotal + taxAmount + shippingCost - discountAmount;

    return {
      id: cart.id,
      userId: cart.userId,
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        sku: item.productSku,
        price: parseFloat(item.price.toString()),
        salePrice: item.compareAtPrice ? parseFloat(item.compareAtPrice.toString()) : null,
        quantity: item.quantity,
        totalPrice: parseFloat(item.price.toString()) * item.quantity,
        addedAt: item.createdAt?.toISOString(),
      })),
      subtotal,
      shippingCost,
      taxAmount,
      discountAmount,
      totalAmount,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      couponCode: cart.couponCode,
      createdAt: cart.createdAt?.toISOString(),
      updatedAt: cart.updatedAt?.toISOString(),
    };
  }

  async addToCart(userId: string, data: any) {
    // Get or create cart
    let [cart] = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(and(
        eq(carts.userId, userId),
        eq(carts.isActive, true)
      ))
      .limit(1);

    if (!cart) {
      [cart] = await this.databaseService.drizzleClient
        .insert(carts)
        .values({
          userId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    // Get product details
    const [product] = await this.databaseService.drizzleClient
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if item already exists in cart
    const [existingItem] = await this.databaseService.drizzleClient
      .select()
      .from(cartItems)
      .where(and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, data.productId),
        eq(cartItems.isActive, true)
      ))
      .limit(1);

    let cartItem;
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + (data.quantity || 1);
      [cartItem] = await this.databaseService.drizzleClient
        .update(cartItems)
        .set({
          quantity: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
    } else {
      // Create new cart item
      [cartItem] = await this.databaseService.drizzleClient
        .insert(cartItems)
        .values({
          cartId: cart.id,
          productId: data.productId,
          variantId: data.variantId,
          quantity: data.quantity || 1,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          options: data.options || {},
          attributes: data.attributes || {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    // Update cart totals
    await this.updateCartTotals(cart.id);

    return {
      id: cartItem.id,
      userId,
      productId: data.productId,
      quantity: cartItem.quantity,
      addedAt: cartItem.createdAt?.toISOString(),
    };
  }

  async updateCartItem(itemId: string, userId: string, data: any) {
    // Verify cart ownership
    const [cartItem] = await this.databaseService.drizzleClient
      .select({
        cartItem: cartItems,
        cart: carts,
      })
      .from(cartItems)
      .innerJoin(carts, eq(cartItems.cartId, carts.id))
      .where(and(
        eq(cartItems.id, itemId),
        eq(carts.userId, userId)
      ))
      .limit(1);

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Update cart item
    const [updatedItem] = await this.databaseService.drizzleClient
      .update(cartItems)
      .set({
        quantity: data.quantity,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId))
      .returning();

    // Update cart totals
    await this.updateCartTotals(cartItem.cart.id);

    return {
      id: updatedItem.id,
      userId,
      quantity: updatedItem.quantity,
      updatedAt: updatedItem.updatedAt?.toISOString(),
    };
  }

  async removeFromCart(itemId: string, userId: string) {
    // Verify cart ownership
    const [cartItem] = await this.databaseService.drizzleClient
      .select({
        cartItem: cartItems,
        cart: carts,
      })
      .from(cartItems)
      .innerJoin(carts, eq(cartItems.cartId, carts.id))
      .where(and(
        eq(cartItems.id, itemId),
        eq(carts.userId, userId)
      ))
      .limit(1);

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Soft delete cart item
    await this.databaseService.drizzleClient
      .update(cartItems)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId));

    // Update cart totals
    await this.updateCartTotals(cartItem.cart.id);

    return {
      id: itemId,
      userId,
      removed: true,
      removedAt: new Date().toISOString(),
    };
  }

  async clearCart(userId: string) {
    // Get user's active cart
    const [cart] = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(and(
        eq(carts.userId, userId),
        eq(carts.isActive, true)
      ))
      .limit(1);

    if (cart) {
      // Deactivate all cart items
      await this.databaseService.drizzleClient
        .update(cartItems)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.cartId, cart.id));

      // Reset cart totals
      await this.databaseService.drizzleClient
        .update(carts)
        .set({
          subtotal: '0',
          tax: '0',
          shipping: '0',
          total: '0',
          discountAmount: '0',
          updatedAt: new Date(),
        })
        .where(eq(carts.id, cart.id));
    }

    return {
      userId,
      cleared: true,
      clearedAt: new Date().toISOString(),
    };
  }

  async getCartCount(userId: string) {
    const cart = await this.getCart(userId);
    return {
      count: cart.itemCount,
      totalAmount: cart.totalAmount,
    };
  }

  private async updateCartTotals(cartId: string) {
    // Calculate totals from cart items
    const items = await this.databaseService.drizzleClient
      .select({
        price: cartItems.price,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .where(and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.isActive, true)
      ));

    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price.toString()) * item.quantity);
    }, 0);

    const tax = subtotal * 0.18; // 18% tax
    const [cart] = await this.databaseService.drizzleClient
      .select()
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);

    const discountAmount = parseFloat(cart?.discountAmount?.toString() || '0');
    const shipping = parseFloat(cart?.shipping?.toString() || '0');
    const total = subtotal + tax + shipping - discountAmount;

    // Update cart
    await this.databaseService.drizzleClient
      .update(carts)
      .set({
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        total: total.toString(),
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId));
  }
}
