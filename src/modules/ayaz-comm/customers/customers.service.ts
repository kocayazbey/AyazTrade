import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, or, like, desc, sql, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../../core/database/database.service';
import { customers, customerAddresses, customerWishlists } from '../../../database/schema/customers.schema';
import { products } from '../../../database/schema/products.schema';

@Injectable()
export class CustomersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createCustomerDto: any): Promise<any> {
    // Check if email already exists
    const existing = await this.findByEmail(createCustomerDto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createCustomerDto.password, 10);

    const [newCustomer] = await this.databaseService.drizzleClient
      .insert(customers)
      .values({
        ...createCustomerDto,
        password: hashedPassword,
        status: 'active',
        emailVerified: false,
      })
      .returning();

    // Remove sensitive data
    const { password, ...customerWithoutPassword } = newCustomer;
    return customerWithoutPassword;
  }

  async findAll(filters?: any): Promise<any> {
    const page = parseInt(filters?.page) || 1;
    const limit = Math.min(parseInt(filters?.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [isNull(customers.deletedAt)];

    if (filters?.status) {
      conditions.push(eq(customers.status, filters.status));
    }

    if (filters?.customerType) {
      conditions.push(eq(customers.customerType, filters.customerType));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(customers.firstName, searchTerm),
          like(customers.lastName, searchTerm),
          like(customers.email, searchTerm),
          like(customers.phone, searchTerm)
        )
      );
    }

    const whereClause = and(...conditions);

    const [totalResult] = await this.databaseService.drizzleClient
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(whereClause);

    const total = Number(totalResult.count);

    const items = await this.databaseService.drizzleClient
      .select({
        id: customers.id,
        email: customers.email,
        phone: customers.phone,
        firstName: customers.firstName,
        lastName: customers.lastName,
        customerType: customers.customerType,
        companyName: customers.companyName,
        status: customers.status,
        emailVerified: customers.emailVerified,
        totalOrders: customers.totalOrders,
        totalSpent: customers.totalSpent,
        averageOrderValue: customers.averageOrderValue,
        lastOrderAt: customers.lastOrderAt,
        lastLoginAt: customers.lastLoginAt,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const [customer] = await this.databaseService.drizzleClient
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), isNull(customers.deletedAt)))
      .limit(1);
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Remove sensitive data
    const { password, ...customerWithoutPassword } = customer;
    return customerWithoutPassword;
  }

  async findByEmail(email: string): Promise<any> {
    const [customer] = await this.databaseService.drizzleClient
      .select()
      .from(customers)
      .where(and(eq(customers.email, email), isNull(customers.deletedAt)))
      .limit(1);
    
    if (!customer) {
      return null;
    }

    // Remove sensitive data
    const { password, ...customerWithoutPassword } = customer;
    return customerWithoutPassword;
  }

  async update(id: string, updateCustomerDto: any): Promise<any> {
    const updateData: any = { ...updateCustomerDto, updatedAt: new Date() };

    // Handle password update
    if (updateCustomerDto.password) {
      updateData.password = await bcrypt.hash(updateCustomerDto.password, 10);
    }

    const [updated] = await this.databaseService.drizzleClient
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { password, ...customerWithoutPassword } = updated;
    return customerWithoutPassword;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.drizzleClient
      .update(customers)
      .set({
        status: 'inactive',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));
  }

  async verifyEmail(id: string): Promise<void> {
    await this.databaseService.drizzleClient
      .update(customers)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(customers.id, id));
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.databaseService.drizzleClient
      .update(customers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(customers.id, id));
  }

  async incrementOrderStats(id: string, orderTotal: number): Promise<void> {
    const customer = await this.findOne(id);
    const totalOrders = (customer.totalOrders || 0) + 1;
    const totalSpent = parseFloat(customer.totalSpent?.toString() || '0') + orderTotal;
    const averageOrderValue = totalSpent / totalOrders;

    await this.databaseService.drizzleClient
      .update(customers)
      .set({
        totalOrders,
        totalSpent: totalSpent.toString(),
        averageOrderValue: averageOrderValue.toString(),
        lastOrderAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));
  }

  async getTopCustomers(limit: number = 10): Promise<any[]> {
    const topCustomers = await this.databaseService.drizzleClient
      .select({
        id: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        totalOrders: customers.totalOrders,
        totalSpent: customers.totalSpent,
        averageOrderValue: customers.averageOrderValue,
      })
      .from(customers)
      .where(isNull(customers.deletedAt))
      .orderBy(desc(customers.totalSpent))
      .limit(limit);

    return topCustomers;
  }

  async searchCustomers(query: string): Promise<any[]> {
    const searchTerm = `%${query}%`;
    const results = await this.databaseService.drizzleClient
      .select({
        id: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        companyName: customers.companyName,
      })
      .from(customers)
      .where(
        and(
          isNull(customers.deletedAt),
          or(
            like(customers.firstName, searchTerm),
            like(customers.lastName, searchTerm),
            like(customers.email, searchTerm),
            like(customers.phone, searchTerm),
            like(customers.companyName, searchTerm)
          )
        )
      )
      .limit(50);

    return results;
  }

  // Wishlist methods for mobile app
  async getWishlist(userId: string): Promise<any> {
    const wishlistItems = await this.databaseService.drizzleClient
      .select({
        id: customerWishlists.id,
        productId: customerWishlists.productId,
        variantId: customerWishlists.variantId,
        createdAt: customerWishlists.createdAt,
      })
      .from(customerWishlists)
      .where(eq(customerWishlists.customerId, userId));

    // Get product details for each wishlist item
    const itemsWithProducts = await Promise.all(
      wishlistItems.map(async (item) => {
        const [product] = await this.databaseService.drizzleClient
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            price: products.price,
            featuredImage: products.featuredImage,
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        return {
          ...item,
          product: product || null,
        };
      })
    );

    return {
      items: itemsWithProducts,
      count: itemsWithProducts.length,
    };
  }

  async addToWishlist(userId: string, productId: string): Promise<any> {
    // Check if already in wishlist
    const existing = await this.databaseService.drizzleClient
      .select()
      .from(customerWishlists)
      .where(
        and(
          eq(customerWishlists.customerId, userId),
          eq(customerWishlists.productId, productId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: true,
        message: 'Product already in wishlist',
        productId,
      };
    }

    const [newItem] = await this.databaseService.drizzleClient
      .insert(customerWishlists)
      .values({
        customerId: userId,
        productId,
      })
      .returning();

    return {
      success: true,
      message: 'Product added to wishlist',
      productId,
      item: newItem,
    };
  }

  async removeFromWishlist(userId: string, productId: string): Promise<any> {
    await this.databaseService.drizzleClient
      .delete(customerWishlists)
      .where(
        and(
          eq(customerWishlists.customerId, userId),
          eq(customerWishlists.productId, productId)
        )
      );

    return {
      success: true,
      message: 'Product removed from wishlist',
      productId,
    };
  }

  // Address methods for mobile app
  async getAddresses(userId: string): Promise<any> {
    const addresses = await this.databaseService.drizzleClient
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, userId))
      .orderBy(desc(customerAddresses.isDefault));

    return {
      addresses,
      count: addresses.length,
    };
  }

  async addAddress(userId: string, addressData: any): Promise<any> {
    // If this is the first address or marked as default, set it as default
    const existingAddresses = await this.getAddresses(userId);
    const isDefault = addressData.isDefault || existingAddresses.count === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.databaseService.drizzleClient
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, userId));
    }

    const [newAddress] = await this.databaseService.drizzleClient
      .insert(customerAddresses)
      .values({
        customerId: userId,
        ...addressData,
        isDefault,
      })
      .returning();

    return {
      success: true,
      message: 'Address added successfully',
      address: newAddress,
    };
  }

  async updateAddress(userId: string, addressId: string, addressData: any): Promise<any> {
    // If setting as default, unset other defaults
    if (addressData.isDefault) {
      await this.databaseService.drizzleClient
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, userId));
    }

    const [updated] = await this.databaseService.drizzleClient
      .update(customerAddresses)
      .set({
        ...addressData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Address not found');
    }

    return {
      success: true,
      message: 'Address updated successfully',
      address: updated,
    };
  }

  async deleteAddress(userId: string, addressId: string): Promise<any> {
    await this.databaseService.drizzleClient
      .delete(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, userId)
        )
      );

    return {
      success: true,
      message: 'Address deleted successfully',
    };
  }
}

