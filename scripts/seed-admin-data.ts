import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, permissions, rolePermissions } from '../src/database/schema/core';

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ayaztrade';
const client = postgres(connectionString);
const db = drizzle(client);

async function seedAdminData() {
  console.log('🌱 Seeding admin data...');

  try {
    // Insert permissions
    const permissionData = [
      { module: 'admin', resource: 'dashboard', action: 'view', description: 'View admin dashboard' },
      { module: 'admin', resource: 'users', action: 'view', description: 'View users' },
      { module: 'admin', resource: 'users', action: 'create', description: 'Create users' },
      { module: 'admin', resource: 'users', action: 'edit', description: 'Edit users' },
      { module: 'admin', resource: 'users', action: 'delete', description: 'Delete users' },
      { module: 'admin', resource: 'roles', action: 'view', description: 'View roles' },
      { module: 'admin', resource: 'roles', action: 'create', description: 'Create roles' },
      { module: 'admin', resource: 'roles', action: 'edit', description: 'Edit roles' },
      { module: 'admin', resource: 'roles', action: 'delete', description: 'Delete roles' },
      { module: 'admin', resource: 'settings', action: 'view', description: 'View settings' },
      { module: 'admin', resource: 'settings', action: 'edit', description: 'Edit settings' },
      { module: 'finance', resource: 'reports', action: 'view', description: 'View financial reports' },
      { module: 'products', resource: 'products', action: 'view', description: 'View products' },
      { module: 'products', resource: 'products', action: 'create', description: 'Create products' },
      { module: 'products', resource: 'products', action: 'edit', description: 'Edit products' },
      { module: 'orders', resource: 'orders', action: 'view', description: 'View orders' },
      { module: 'orders', resource: 'orders', action: 'edit', description: 'Edit orders' }
    ];

    const insertedPermissions = await db.insert(permissions).values(permissionData).returning();
    console.log(`✅ Inserted ${insertedPermissions.length} permissions`);

    // Insert role permissions
    const rolePermissionData = [
      // Super Admin - all permissions
      { role: 'super_admin', permissionId: insertedPermissions[0].id },
      { role: 'super_admin', permissionId: insertedPermissions[1].id },
      { role: 'super_admin', permissionId: insertedPermissions[2].id },
      { role: 'super_admin', permissionId: insertedPermissions[3].id },
      { role: 'super_admin', permissionId: insertedPermissions[4].id },
      { role: 'super_admin', permissionId: insertedPermissions[5].id },
      { role: 'super_admin', permissionId: insertedPermissions[6].id },
      { role: 'super_admin', permissionId: insertedPermissions[7].id },
      { role: 'super_admin', permissionId: insertedPermissions[8].id },
      { role: 'super_admin', permissionId: insertedPermissions[9].id },
      { role: 'super_admin', permissionId: insertedPermissions[10].id },
      { role: 'super_admin', permissionId: insertedPermissions[11].id },
      { role: 'super_admin', permissionId: insertedPermissions[12].id },
      { role: 'super_admin', permissionId: insertedPermissions[13].id },
      { role: 'super_admin', permissionId: insertedPermissions[14].id },
      { role: 'super_admin', permissionId: insertedPermissions[15].id },
      { role: 'super_admin', permissionId: insertedPermissions[16].id },

      // Admin - most permissions
      { role: 'admin', permissionId: insertedPermissions[0].id },
      { role: 'admin', permissionId: insertedPermissions[1].id },
      { role: 'admin', permissionId: insertedPermissions[2].id },
      { role: 'admin', permissionId: insertedPermissions[3].id },
      { role: 'admin', permissionId: insertedPermissions[5].id },
      { role: 'admin', permissionId: insertedPermissions[9].id },
      { role: 'admin', permissionId: insertedPermissions[10].id },
      { role: 'admin', permissionId: insertedPermissions[11].id },
      { role: 'admin', permissionId: insertedPermissions[12].id },
      { role: 'admin', permissionId: insertedPermissions[13].id },
      { role: 'admin', permissionId: insertedPermissions[14].id },
      { role: 'admin', permissionId: insertedPermissions[15].id },
      { role: 'admin', permissionId: insertedPermissions[16].id },

      // Finance - financial permissions
      { role: 'finance', permissionId: insertedPermissions[0].id },
      { role: 'finance', permissionId: insertedPermissions[11].id },
      { role: 'finance', permissionId: insertedPermissions[9].id },

      // Product Manager - product permissions
      { role: 'product_manager', permissionId: insertedPermissions[0].id },
      { role: 'product_manager', permissionId: insertedPermissions[12].id },
      { role: 'product_manager', permissionId: insertedPermissions[13].id },
      { role: 'product_manager', permissionId: insertedPermissions[14].id },

      // Order Manager - order permissions
      { role: 'order_manager', permissionId: insertedPermissions[0].id },
      { role: 'order_manager', permissionId: insertedPermissions[15].id },
      { role: 'order_manager', permissionId: insertedPermissions[16].id }
    ];

    await db.insert(rolePermissions).values(rolePermissionData);
    console.log(`✅ Inserted ${rolePermissionData.length} role permissions`);

    // Insert sample users
    const userData = [
      {
        email: 'admin@ayaztrade.com',
        password: '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', // password
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      },
      {
        email: 'finance@ayaztrade.com',
        password: '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', // password
        firstName: 'Finance',
        lastName: 'Manager',
        role: 'finance',
        isActive: true
      },
      {
        email: 'product@ayaztrade.com',
        password: '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', // password
        firstName: 'Product',
        lastName: 'Manager',
        role: 'product_manager',
        isActive: true
      },
      {
        email: 'order@ayaztrade.com',
        password: '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', // password
        firstName: 'Order',
        lastName: 'Manager',
        role: 'order_manager',
        isActive: true
      }
    ];

    await db.insert(users).values(userData);
    console.log(`✅ Inserted ${userData.length} sample users`);

    console.log('🎉 Admin data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding admin data:', error);
  } finally {
    await client.end();
  }
}

seedAdminData();
