import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, sql, desc, asc } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { customers, customerAddresses, customerWishlists } from '../../database/schema/customers.schema';
import { orders } from '../../database/schema/orders.schema';
import { products } from '../../database/schema/products.schema';

@Injectable()
export class CustomersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCustomers(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter by status
    if (query.status) {
      conditions.push(eq(customers.status, query.status));
    }

    // Filter by customer type
    if (query.customerType) {
      conditions.push(eq(customers.customerType, query.customerType));
    }

    // Search by name or email
    if (query.search) {
      conditions.push(
        or(
          like(customers.firstName, `%${query.search}%`),
          like(customers.lastName, `%${query.search}%`),
          like(customers.email, `%${query.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.databaseService.drizzleClient
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResults = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(whereClause);

    return {
      data: results,
      total: Number(totalResults[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(totalResults[0].count) / limit),
      hasNext: offset + limit < Number(totalResults[0].count),
      hasPrev: page > 1,
    };
  }

  async getProfile(userId: string) {
    const [customer] = await this.databaseService.drizzleClient
      .select()
      .from(customers)
      .where(eq(customers.id, userId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async updateProfile(userId: string, data: any) {
    const [updatedCustomer] = await this.databaseService.drizzleClient
      .update(customers)
      .set({
      ...data,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, userId))
      .returning();

    if (!updatedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    return updatedCustomer;
  }

  async getAddresses(userId: string) {
    const addresses = await this.databaseService.drizzleClient
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, userId))
      .orderBy(desc(customerAddresses.isDefault), asc(customerAddresses.createdAt));

    return {
      data: addresses,
      total: addresses.length,
    };
  }

  async addAddress(userId: string, data: any) {
    // If this is the first address or marked as default, unset other defaults
    if (data.isDefault) {
      await this.databaseService.drizzleClient
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, userId));
    }

    const [address] = await this.databaseService.drizzleClient
      .insert(customerAddresses)
      .values({
        customerId: userId,
        firstName: data.firstName || data.name,
        lastName: data.lastName || '',
        company: data.company,
        address1: data.address || data.address1,
        address2: data.address2,
        city: data.city,
        province: data.province || data.state || data.district,
        country: data.country || 'Turkey',
        zip: data.zip || data.postalCode,
        phone: data.phone,
        isDefault: data.isDefault || false,
        isBilling: data.isBilling || false,
        isShipping: data.isShipping !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return address;
  }

  async updateAddress(addressId: string, userId: string, data: any) {
    // Verify ownership
    const [address] = await this.databaseService.drizzleClient
      .select()
      .from(customerAddresses)
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, userId)
      ))
      .limit(1);

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.databaseService.drizzleClient
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, userId));
    }

    const [updatedAddress] = await this.databaseService.drizzleClient
      .update(customerAddresses)
      .set({
      ...data,
        updatedAt: new Date(),
      })
      .where(eq(customerAddresses.id, addressId))
      .returning();

    return updatedAddress;
  }

  async deleteAddress(addressId: string, userId: string) {
    const [address] = await this.databaseService.drizzleClient
      .select()
      .from(customerAddresses)
      .where(and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, userId)
      ))
      .limit(1);

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.databaseService.drizzleClient
      .delete(customerAddresses)
      .where(eq(customerAddresses.id, addressId));

    return {
      id: addressId,
      deleted: true,
      deletedAt: new Date().toISOString(),
    };
  }

  async getUserOrders(userId: string, query: any) {
    // Delegate to orders service - for now return empty or call orders service
    return {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
  }

  async getWishlist(userId: string) {
    const wishlistItems = await this.databaseService.drizzleClient
      .select({
        id: customerWishlists.id,
        customerId: customerWishlists.customerId,
        productId: customerWishlists.productId,
        variantId: customerWishlists.variantId,
        createdAt: customerWishlists.createdAt,
        // Product details
        productName: products.name,
        productSku: products.sku,
        productImage: products.featuredImage,
        productPrice: products.price,
      })
      .from(customerWishlists)
      .leftJoin(products, eq(customerWishlists.productId, products.id))
      .where(eq(customerWishlists.customerId, userId))
      .orderBy(desc(customerWishlists.createdAt));

    return {
      data: wishlistItems.map(item => ({
        id: item.id,
        userId: item.customerId,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        price: item.productPrice ? parseFloat(item.productPrice.toString()) : null,
        addedAt: item.createdAt?.toISOString(),
      })),
      total: wishlistItems.length,
    };
  }

  async addToWishlist(userId: string, productId: string) {
    // Check if already in wishlist
    const [existing] = await this.databaseService.drizzleClient
      .select()
      .from(customerWishlists)
      .where(and(
        eq(customerWishlists.customerId, userId),
        eq(customerWishlists.productId, productId)
      ))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [wishlistItem] = await this.databaseService.drizzleClient
      .insert(customerWishlists)
      .values({
        customerId: userId,
        productId,
        createdAt: new Date(),
      })
      .returning();

    return {
      id: wishlistItem.id,
      userId,
      productId,
      addedAt: wishlistItem.createdAt?.toISOString(),
    };
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.databaseService.drizzleClient
      .delete(customerWishlists)
      .where(and(
        eq(customerWishlists.customerId, userId),
        eq(customerWishlists.productId, productId)
      ));

    return {
      userId,
      productId,
      removed: true,
      removedAt: new Date().toISOString(),
    };
  }

  async getCustomerById(customerId: string) {
    const [customer] = await this.databaseService.drizzleClient
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async updateCustomer(customerId: string, data: any) {
    const [updatedCustomer] = await this.databaseService.drizzleClient
      .update(customers)
      .set({
      ...data,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning();

    if (!updatedCustomer) {
      throw new NotFoundException('Customer not found');
    }

    return updatedCustomer;
  }

  async deleteCustomer(customerId: string) {
    const [customer] = await this.databaseService.drizzleClient
      .update(customers)
      .set({
        status: 'inactive',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      id: customerId,
      deleted: true,
      deletedAt: customer.deletedAt?.toISOString(),
    };
  }
}