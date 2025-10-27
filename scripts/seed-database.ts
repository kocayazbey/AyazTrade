#!/usr/bin/env ts-node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/database/schema';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ayaztrade';
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// Configuration
const SEED_CONFIG = {
  users: 100,
  products: 500,
  categories: 20,
  orders: 200,
  reviews: 1000,
  warehouses: 5,
  inventoryItems: 1000,
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing data...');
      await clearDatabase();
    }

    // Seed in order of dependencies
    await seedUsers();
    await seedCategories();
    await seedProducts();
    await seedWarehouses();
    await seedInventory();
    await seedOrders();
    await seedReviews();
    await seedAuditLogs();

    console.log('✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function clearDatabase() {
  // Clear in reverse dependency order
  await db.delete(schema.reviews);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.inventoryMovements);
  await db.delete(schema.inventoryItems);
  await db.delete(schema.products);
  await db.delete(schema.categories);
  await db.delete(schema.warehouses);
  await db.delete(schema.users).where(schema.users.role.ne('admin'));
}

async function seedUsers() {
  console.log(`👥 Creating ${SEED_CONFIG.users} users...`);

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  await db.insert(schema.users).values({
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@ayaztrade.com',
    password: adminPassword,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  });

  // Create regular users
  const users = [];
  for (let i = 0; i < SEED_CONFIG.users - 1; i++) {
    users.push({
      email: faker.internet.email(),
      password: userPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      role: faker.helpers.arrayElement(['user', 'vendor', 'customer']),
      isActive: faker.datatype.boolean(0.9), // 90% active
    });
  }

  await db.insert(schema.users).values(users);
  console.log(`✅ Created ${SEED_CONFIG.users} users`);
}

async function seedCategories() {
  console.log(`📂 Creating ${SEED_CONFIG.categories} categories...`);

  const categories = [
    'Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books',
    'Health & Beauty', 'Automotive', 'Toys', 'Food & Beverages', 'Office Supplies'
  ];

  const categoryData = categories.map((name, index) => ({
    id: `cat_${index + 1}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: faker.lorem.sentence(),
    image: faker.image.url(),
    isActive: true,
    parentId: null,
    sortOrder: index,
  }));

  await db.insert(schema.categories).values(categoryData);
  console.log(`✅ Created ${SEED_CONFIG.categories} categories`);
}

async function seedProducts() {
  console.log(`📦 Creating ${SEED_CONFIG.products} products...`);

  const categories = await db.select().from(schema.categories).limit(10);
  const products = [];

  for (let i = 0; i < SEED_CONFIG.products; i++) {
    const category = faker.helpers.arrayElement(categories);

    products.push({
      name: faker.commerce.productName(),
      slug: faker.helpers.slugify(faker.commerce.productName()),
      description: faker.lorem.paragraph(),
      shortDescription: faker.lorem.sentence(),
      sku: faker.string.alphanumeric(10).toUpperCase(),
      price: parseFloat(faker.commerce.price()),
      comparePrice: parseFloat(faker.commerce.price()) * 1.2,
      costPrice: parseFloat(faker.commerce.price()) * 0.7,
      trackQuantity: faker.datatype.boolean(0.8),
      quantity: faker.number.int({ min: 0, max: 1000 }),
      lowStockThreshold: faker.number.int({ min: 5, max: 50 }),
      weight: parseFloat(faker.commerce.price()) / 10,
      dimensions: JSON.stringify({
        length: faker.number.int({ min: 10, max: 100 }),
        width: faker.number.int({ min: 10, max: 100 }),
        height: faker.number.int({ min: 5, max: 50 }),
      }),
      images: JSON.stringify([faker.image.url(), faker.image.url(), faker.image.url()]),
      categoryId: category.id,
      brand: faker.company.name(),
      tags: faker.lorem.words(3).split(' '),
      isActive: faker.datatype.boolean(0.9),
      isFeatured: faker.datatype.boolean(0.2),
      isDigital: faker.datatype.boolean(0.1),
      seoTitle: faker.lorem.sentence(),
      seoDescription: faker.lorem.sentence(),
      seoKeywords: faker.lorem.words(5),
    });
  }

  await db.insert(schema.products).values(products);
  console.log(`✅ Created ${SEED_CONFIG.products} products`);
}

async function seedWarehouses() {
  console.log(`🏭 Creating ${SEED_CONFIG.warehouses} warehouses...`);

  const warehouses = [];
  for (let i = 0; i < SEED_CONFIG.warehouses; i++) {
    warehouses.push({
      name: faker.company.name() + ' Warehouse',
      code: faker.string.alphanumeric(5).toUpperCase(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      postalCode: faker.location.zipCode(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      manager: faker.person.fullName(),
      capacity: faker.number.int({ min: 10000, max: 100000 }),
      usedCapacity: 0,
      isActive: true,
      isDefault: i === 0,
    });
  }

  await db.insert(schema.warehouses).values(warehouses);
  console.log(`✅ Created ${SEED_CONFIG.warehouses} warehouses`);
}

async function seedInventory() {
  console.log(`📋 Creating ${SEED_CONFIG.inventoryItems} inventory items...`);

  const [warehouses, products] = await Promise.all([
    db.select().from(schema.warehouses),
    db.select().from(schema.products).limit(100), // Limit for performance
  ]);

  const inventoryItems = [];
  for (let i = 0; i < SEED_CONFIG.inventoryItems; i++) {
    const product = faker.helpers.arrayElement(products);
    const warehouse = faker.helpers.arrayElement(warehouses);

    inventoryItems.push({
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: faker.number.int({ min: 0, max: 500 }),
      reservedQuantity: faker.number.int({ min: 0, max: 50 }),
      availableQuantity: 0, // Will be calculated
      reorderPoint: faker.number.int({ min: 10, max: 100 }),
      maxStockLevel: faker.number.int({ min: 100, max: 1000 }),
      location: faker.string.alphanumeric(10).toUpperCase(),
      batchNumber: faker.string.alphanumeric(8).toUpperCase(),
      expiryDate: faker.date.future(),
      lastUpdated: new Date(),
    });
  }

  await db.insert(schema.inventoryItems).values(inventoryItems);
  console.log(`✅ Created ${SEED_CONFIG.inventoryItems} inventory items`);
}

async function seedOrders() {
  console.log(`🛒 Creating ${SEED_CONFIG.orders} orders...`);

  const [users, products] = await Promise.all([
    db.select().from(schema.users).limit(50),
    db.select().from(schema.products).limit(100),
  ]);

  const orders = [];
  for (let i = 0; i < SEED_CONFIG.orders; i++) {
    const user = faker.helpers.arrayElement(users);
    const orderProducts = faker.helpers.arrayElements(products, { min: 1, max: 5 });

    const orderItems = orderProducts.map(product => ({
      productId: product.id,
      quantity: faker.number.int({ min: 1, max: 10 }),
      price: product.price,
      total: product.price * faker.number.int({ min: 1, max: 10 }),
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const shipping = faker.number.int({ min: 0, max: 50 });
    const tax = subtotal * 0.18; // 18% tax
    const total = subtotal + shipping + tax;

    orders.push({
      orderNumber: `ORD-${String(i + 1).padStart(6, '0')}`,
      userId: user.id,
      status: faker.helpers.arrayElement(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
      paymentStatus: faker.helpers.arrayElement(['pending', 'paid', 'failed', 'refunded']),
      paymentMethod: faker.helpers.arrayElement(['credit_card', 'bank_transfer', 'cash_on_delivery']),
      subtotal,
      shipping,
      tax,
      discount: faker.number.int({ min: 0, max: 100 }),
      total,
      currency: 'TRY',
      shippingAddress: JSON.stringify({
        name: user.firstName + ' ' + user.lastName,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: 'Turkey',
      }),
      billingAddress: JSON.stringify({
        name: user.firstName + ' ' + user.lastName,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: 'Turkey',
      }),
      notes: faker.lorem.sentence(),
      createdAt: faker.date.past(),
      updatedAt: new Date(),
    });
  }

  // Insert orders
  for (const order of orders) {
    const [insertedOrder] = await db.insert(schema.orders).values(order).returning();
    await seedOrderItems(insertedOrder.id, orderItems);
  }

  console.log(`✅ Created ${SEED_CONFIG.orders} orders`);
}

async function seedOrderItems(orderId: string, items: any[]) {
  const orderItems = items.map(item => ({
    orderId,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    total: item.total,
  }));

  await db.insert(schema.orderItems).values(orderItems);
}

async function seedReviews() {
  console.log(`⭐ Creating ${SEED_CONFIG.reviews} reviews...`);

  const [users, products] = await Promise.all([
    db.select().from(schema.users).limit(30),
    db.select().from(schema.products).limit(100),
  ]);

  const reviews = [];
  for (let i = 0; i < SEED_CONFIG.reviews; i++) {
    const user = faker.helpers.arrayElement(users);
    const product = faker.helpers.arrayElement(products);

    reviews.push({
      productId: product.id,
      userId: user.id,
      orderId: null, // Will be linked later
      rating: faker.number.int({ min: 1, max: 5 }),
      title: faker.lorem.sentence(),
      comment: faker.lorem.paragraph(),
      isVerified: faker.datatype.boolean(0.7),
      isHelpful: faker.number.int({ min: 0, max: 20 }),
      images: faker.datatype.boolean(0.3) ? JSON.stringify([faker.image.url()]) : null,
      createdAt: faker.date.past(),
    });
  }

  await db.insert(schema.reviews).values(reviews);
  console.log(`✅ Created ${SEED_CONFIG.reviews} reviews`);
}

async function seedAuditLogs() {
  console.log(`📋 Creating audit logs...`);

  const users = await db.select().from(schema.users).limit(20);
  const actions = ['login', 'logout', 'create', 'update', 'delete', 'view'];
  const resources = ['user', 'product', 'order', 'category'];

  const auditLogs = [];
  for (let i = 0; i < 200; i++) {
    const user = faker.helpers.arrayElement(users);

    auditLogs.push({
      id: `audit_${Date.now()}_${i}`,
      userId: user.id,
      action: faker.helpers.arrayElement(actions),
      resource: faker.helpers.arrayElement(resources),
      resourceId: faker.string.uuid(),
      oldValues: faker.datatype.boolean(0.3) ? JSON.stringify({ old: 'value' }) : null,
      newValues: faker.datatype.boolean(0.3) ? JSON.stringify({ new: 'value' }) : null,
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      metadata: JSON.stringify({ source: 'seeder' }),
      severity: faker.helpers.arrayElement(['low', 'medium', 'high']),
      timestamp: faker.date.past(),
    });
  }

  await db.insert(schema.auditLogs).values(auditLogs);
  console.log(`✅ Created 200 audit logs`);
}

// Helper functions
async function getRandomProduct(): Promise<any> {
  const products = await db.select().from(schema.products).limit(1);
  return products[0];
}

async function getRandomUser(): Promise<any> {
  const users = await db.select().from(schema.users).limit(1);
  return users[0];
}

// Run seeder
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
