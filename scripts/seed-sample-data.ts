#!/usr/bin/env ts-node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/database/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const { products, categories, orders, orderItems, customers, users, brands } = schema;

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedDatabase() {
  console.log('🌱 Starting sample data seeding...');
  
  // Database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ayaztrade';
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    // Seed Users
    console.log('👥 Seeding users...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const sampleUsers = [
      {
        email: 'admin@ayaztrade.com',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'manager@ayaztrade.com',
        firstName: 'Product',
        lastName: 'Manager',
        password: hashedPassword,
        role: 'product_manager',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'customer@ayaztrade.com',
        firstName: 'Test',
        lastName: 'Customer',
        password: hashedPassword,
        role: 'customer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const user of sampleUsers) {
      await db.insert(users)
        .values(user)
        .onConflictDoNothing();
  }

    // Seed Categories
    console.log('📂 Seeding categories...');
    const sampleCategories = [
      {
        name: 'Elektronik',
        slug: generateSlug('Elektronik'),
        description: 'Elektronik ürünler',
        parentId: null,
        isActive: true,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Bilgisayar',
        slug: generateSlug('Bilgisayar'),
        description: 'Bilgisayar ve aksesuarları',
        parentId: null, // We'll update this after getting the parent ID
        isActive: true,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Telefon',
        slug: generateSlug('Telefon'),
        description: 'Telefon ve aksesuarları',
        parentId: null,
        isActive: true,
        position: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Giyim',
        slug: generateSlug('Giyim'),
        description: 'Giyim ve aksesuarları',
        parentId: null,
        isActive: true,
        position: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedCategories = [];
    for (const category of sampleCategories) {
      const [inserted] = await db.insert(categories)
        .values(category)
        .onConflictDoNothing()
        .returning();
      if (inserted) {
        insertedCategories.push(inserted);
      }
    }

    // Update parent IDs for subcategories
    const elektronikCategory = insertedCategories.find(c => c.slug === 'elektronik');
    if (elektronikCategory) {
      const bilgisayarCat = insertedCategories.find(c => c.slug === 'bilgisayar');
      const telefonCat = insertedCategories.find(c => c.slug === 'telefon');
      
      if (bilgisayarCat) {
        await db.update(categories)
          .set({ parentId: elektronikCategory.id })
          .where(eq(categories.id, bilgisayarCat.id));
      }
      if (telefonCat) {
        await db.update(categories)
          .set({ parentId: elektronikCategory.id })
          .where(eq(categories.id, telefonCat.id));
      }
    }

    // Seed Brands
    console.log('🏷️ Seeding brands...');
    const sampleBrands = [
      {
        name: 'Dell',
        slug: generateSlug('Dell'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Apple',
        slug: generateSlug('Apple'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Samsung',
        slug: generateSlug('Samsung'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Nike',
        slug: generateSlug('Nike'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedBrands = [];
    for (const brand of sampleBrands) {
      const [inserted] = await db.insert(brands)
        .values(brand)
        .onConflictDoNothing()
        .returning();
      if (inserted) {
        insertedBrands.push(inserted);
      }
    }

    // Seed Products
    console.log('📦 Seeding products...');
    const bilgisayarCat = insertedCategories.find(c => c.slug === 'bilgisayar');
    const telefonCat = insertedCategories.find(c => c.slug === 'telefon');
    const giyimCat = insertedCategories.find(c => c.slug === 'giyim');
    
    const dellBrand = insertedBrands.find(b => b.slug === 'dell');
    const appleBrand = insertedBrands.find(b => b.slug === 'apple');
    const samsungBrand = insertedBrands.find(b => b.slug === 'samsung');
    const nikeBrand = insertedBrands.find(b => b.slug === 'nike');
    
    const sampleProducts = [
      {
        sku: 'LAP-001',
        name: 'Laptop Dell Inspiron 15',
        slug: generateSlug('Laptop Dell Inspiron 15'),
        description: 'Yüksek performanslı laptop',
        shortDescription: 'Dell Inspiron 15 laptop',
        price: '15000.00',
        compareAtPrice: '18000.00',
        costPrice: '12000.00',
        stockQuantity: 50,
        lowStockThreshold: 10,
        trackInventory: true,
        allowBackorders: false,
        weight: '2.5',
        weightUnit: 'kg',
        length: '35',
        width: '25',
        height: '2',
        dimensionUnit: 'cm',
        categoryId: bilgisayarCat?.id,
        brandId: dellBrand?.id,
        status: 'active',
        visibility: 'visible',
        isDigital: false,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        sku: 'PHN-002',
        name: 'iPhone 15 Pro',
        slug: generateSlug('iPhone 15 Pro'),
        description: 'Apple iPhone 15 Pro 256GB',
        shortDescription: 'iPhone 15 Pro',
        price: '45000.00',
        compareAtPrice: '50000.00',
        costPrice: '40000.00',
        stockQuantity: 25,
        lowStockThreshold: 5,
        trackInventory: true,
        allowBackorders: false,
        weight: '0.2',
        weightUnit: 'kg',
        length: '15',
        width: '7',
        height: '1',
        dimensionUnit: 'cm',
        categoryId: telefonCat?.id,
        brandId: appleBrand?.id,
        status: 'active',
        visibility: 'visible',
        isDigital: false,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        sku: 'PHN-003',
        name: 'Samsung Galaxy S24',
        slug: generateSlug('Samsung Galaxy S24'),
        description: 'Samsung Galaxy S24 128GB',
        shortDescription: 'Galaxy S24',
        price: '35000.00',
        compareAtPrice: '40000.00',
        costPrice: '30000.00',
        stockQuantity: 30,
        lowStockThreshold: 5,
        trackInventory: true,
        allowBackorders: false,
        weight: '0.18',
        weightUnit: 'kg',
        length: '14',
        width: '6',
        height: '1',
        dimensionUnit: 'cm',
        categoryId: telefonCat?.id,
        brandId: samsungBrand?.id,
        status: 'active',
        visibility: 'visible',
        isDigital: false,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        sku: 'SHO-001',
        name: 'Nike Air Max 270',
        slug: generateSlug('Nike Air Max 270'),
        description: 'Nike Air Max 270 Erkek Spor Ayakkabı',
        shortDescription: 'Nike Air Max 270',
        price: '2500.00',
        compareAtPrice: '3000.00',
        costPrice: '2000.00',
        stockQuantity: 100,
        lowStockThreshold: 20,
        trackInventory: true,
        allowBackorders: false,
        weight: '0.8',
        weightUnit: 'kg',
        length: '30',
        width: '20',
        height: '10',
        dimensionUnit: 'cm',
        categoryId: giyimCat?.id,
        brandId: nikeBrand?.id,
        status: 'active',
        visibility: 'visible',
        isDigital: false,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const product of sampleProducts) {
      await db.insert(products)
        .values(product)
        .onConflictDoNothing();
  }

    // Seed Customers
    console.log('👤 Seeding customers...');
    const sampleCustomers = [
      {
        email: 'ali@example.com',
        firstName: 'Ali',
        lastName: 'Veli',
        password: hashedPassword,
        phone: '+905321234567',
        customerType: 'retail',
        status: 'active',
        emailVerified: true,
        totalOrders: 5,
        totalSpent: '85000.00',
        averageOrderValue: '17000.00',
        lastOrderAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'ayse@example.com',
        firstName: 'Ayşe',
        lastName: 'Demir',
        password: hashedPassword,
        phone: '+905339876543',
        customerType: 'retail',
        status: 'active',
        emailVerified: true,
        totalOrders: 3,
        totalSpent: '45000.00',
        averageOrderValue: '15000.00',
        lastOrderAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'mehmet@example.com',
        firstName: 'Mehmet',
        lastName: 'Kaya',
        password: hashedPassword,
        phone: '+905345551234',
        customerType: 'b2b',
        companyName: 'Kaya Ltd.',
        taxId: '1234567890',
        status: 'active',
        emailVerified: true,
        totalOrders: 8,
        totalSpent: '120000.00',
        averageOrderValue: '15000.00',
        lastOrderAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedCustomers = [];
    for (const customer of sampleCustomers) {
      const [inserted] = await db.insert(customers)
        .values(customer)
        .onConflictDoNothing()
        .returning();
      if (inserted) {
        insertedCustomers.push(inserted);
    }
  }

    // Seed Orders
    console.log('🛒 Seeding orders...');
    const insertedProducts = await db.select().from(products).limit(4);
    
    if (insertedCustomers.length > 0 && insertedProducts.length > 0) {
    const sampleOrders = [
      {
          userId: insertedCustomers[0].id,
          orderNumber: `ORD-${new Date().getFullYear()}-001`,
          status: 'delivered',
        paymentStatus: 'paid',
          subtotal: '15000.00',
          tax: '2700.00',
          shipping: '500.00',
          discount: '0.00',
          totalAmount: '18200.00',
          paymentMethod: 'credit_card' as const,
          shippingAddress: {
            firstName: 'Ali',
            lastName: 'Veli',
            address1: 'Örnek Mahalle, Örnek Sokak No:1',
            city: 'İstanbul',
            state: 'İstanbul',
            zipCode: '34000',
            country: 'Türkiye',
            phone: '+905321234567'
          },
          billingAddress: {
            firstName: 'Ali',
            lastName: 'Veli',
            address1: 'Örnek Mahalle, Örnek Sokak No:1',
            city: 'İstanbul',
            state: 'İstanbul',
            zipCode: '34000',
            country: 'Türkiye',
            phone: '+905321234567'
          },
        shippingMethod: 'standard',
          orderDate: new Date('2024-01-14'),
        shippedAt: new Date('2024-01-15'),
        deliveredAt: new Date('2024-01-16'),
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-16')
      },
      {
          userId: insertedCustomers[1].id,
          orderNumber: `ORD-${new Date().getFullYear()}-002`,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
          subtotal: '2500.00',
          tax: '450.00',
          shipping: '200.00',
          discount: '100.00',
          totalAmount: '3050.00',
          paymentMethod: 'bank_transfer' as const,
          shippingAddress: {
            firstName: 'Ayşe',
            lastName: 'Demir',
            address1: 'Test Mahalle, Test Sokak No:2',
            city: 'Ankara',
            state: 'Ankara',
            zipCode: '06000',
            country: 'Türkiye',
            phone: '+905339876543'
          },
          billingAddress: {
            firstName: 'Ayşe',
            lastName: 'Demir',
            address1: 'Test Mahalle, Test Sokak No:2',
            city: 'Ankara',
            state: 'Ankara',
            zipCode: '06000',
            country: 'Türkiye',
            phone: '+905339876543'
          },
        shippingMethod: 'standard',
          orderDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
      }
    ];

    for (const order of sampleOrders) {
        const [insertedOrder] = await db.insert(orders)
        .values(order)
          .onConflictDoNothing()
          .returning();

        if (insertedOrder && insertedProducts.length > 0) {
          // Add order items
          await db.insert(orderItems)
            .values({
              orderId: insertedOrder.id,
              productId: insertedProducts[0].id,
              quantity: 1,
              price: insertedProducts[0].price,
              productName: insertedProducts[0].name,
              productSku: insertedProducts[0].sku,
              subtotal: insertedProducts[0].price,
              createdAt: new Date(),
              updatedAt: new Date()
            })
        .onConflictDoNothing();
    }
  }
}

    console.log('✅ Sample data seeding completed successfully!');
    await client.end();
      process.exit(0);
    } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    await client.end();
      process.exit(1);
    }
  }
  
// Run seeder
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
