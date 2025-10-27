import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface SeedData {
  id: string;
  name: string;
  description: string;
  data: any[];
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  executedAt?: Date;
  executionTime?: number;
  error?: string;
  createdAt: Date;
}

interface SeedResult {
  success: boolean;
  executed: number;
  skipped: number;
  failed: number;
  errors?: string[];
  warnings?: string[];
}

@Injectable()
export class DatabaseSeedService {
  private readonly logger = new Logger(DatabaseSeedService.name);

  private readonly seedData: SeedData[] = [
    {
      id: 'users_seed',
      name: 'Sample Users',
      description: 'Create sample user accounts for testing',
      data: [
        {
          id: 'user-admin',
          email: 'admin@ayaztrade.com',
          name: 'Admin User',
          role: 'admin',
          tenant_id: null,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'user-manager',
          email: 'manager@ayaztrade.com',
          name: 'Manager User',
          role: 'manager',
          tenant_id: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      dependencies: [],
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: 'tenants_seed',
      name: 'Sample Tenants',
      description: 'Create sample tenant organizations',
      data: [
        {
          id: 'tenant-demo',
          name: 'Demo Company',
          domain: 'demo.ayaztrade.com',
          subdomain: 'demo',
          status: 'active',
          plan: 'professional',
          features: JSON.stringify(['basic_dashboard', 'user_management', 'product_management', 'order_management', 'advanced_analytics']),
          limits: JSON.stringify({
            users: 100,
            orders: 10000,
            products: 5000,
            storage: 10000,
            apiCalls: 100000,
            integrations: 20
          }),
          settings: JSON.stringify({
            timezone: 'Europe/Istanbul',
            currency: 'TRY',
            language: 'tr',
            theme: 'light',
            notifications: { email: true, sms: false, webhook: false },
            security: { twoFactorRequired: false, passwordExpiry: 90, sessionTimeout: 480 }
          }),
          subscription: JSON.stringify({
            startDate: new Date(),
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            billingCycle: 'monthly',
            autoRenew: true
          }),
          created_by: 'user-admin',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'tenant-test',
          name: 'Test Company',
          domain: 'test.ayaztrade.com',
          subdomain: 'test',
          status: 'active',
          plan: 'starter',
          features: JSON.stringify(['basic_dashboard', 'user_management', 'product_management', 'order_management']),
          limits: JSON.stringify({
            users: 20,
            orders: 1000,
            products: 500,
            storage: 1000,
            apiCalls: 10000,
            integrations: 5
          }),
          settings: JSON.stringify({
            timezone: 'Europe/Istanbul',
            currency: 'TRY',
            language: 'tr',
            theme: 'light',
            notifications: { email: true, sms: false, webhook: false },
            security: { twoFactorRequired: false, passwordExpiry: 90, sessionTimeout: 480 }
          }),
          subscription: JSON.stringify({
            startDate: new Date(),
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            billingCycle: 'monthly',
            autoRenew: true
          }),
          created_by: 'user-admin',
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      dependencies: ['users_seed'],
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: 'products_seed',
      name: 'Sample Products',
      description: 'Create sample products for testing',
      data: [
        {
          id: 'product-1',
          sku: 'PROD-001',
          name: 'Wireless Bluetooth Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: 299.99,
          stock: 50,
          category: 'Electronics',
          brand: 'TechBrand',
          images: JSON.stringify(['https://example.com/headphones.jpg']),
          attributes: JSON.stringify({
            color: 'Black',
            connectivity: 'Bluetooth 5.0',
            battery_life: '30 hours',
            weight: '250g'
          }),
          status: 'active',
          tenant_id: 'tenant-demo',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'product-2',
          sku: 'PROD-002',
          name: 'Smartphone Case',
          description: 'Protective case for smartphones with card slots',
          price: 29.99,
          stock: 100,
          category: 'Accessories',
          brand: 'CaseCo',
          images: JSON.stringify(['https://example.com/case.jpg']),
          attributes: JSON.stringify({
            color: 'Black',
            material: 'PU Leather',
            compatibility: 'Universal'
          }),
          status: 'active',
          tenant_id: 'tenant-demo',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'product-3',
          sku: 'PROD-003',
          name: 'Coffee Mug',
          description: 'Ceramic coffee mug with custom design',
          price: 15.99,
          stock: 200,
          category: 'Home & Kitchen',
          brand: 'MugMaster',
          images: JSON.stringify(['https://example.com/mug.jpg']),
          attributes: JSON.stringify({
            material: 'Ceramic',
            capacity: '350ml',
            color: 'White'
          }),
          status: 'active',
          tenant_id: 'tenant-test',
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      dependencies: ['tenants_seed'],
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: 'orders_seed',
      name: 'Sample Orders',
      description: 'Create sample orders for testing',
      data: [
        {
          id: 'order-1',
          order_number: 'ORD-2024-001',
          customer_id: 'customer-1',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '+905551234567',
          items: JSON.stringify([
            {
              product_id: 'product-1',
              sku: 'PROD-001',
              name: 'Wireless Bluetooth Headphones',
              quantity: 1,
              price: 299.99,
              total_price: 299.99
            }
          ]),
          total_amount: 299.99,
          currency: 'TRY',
          status: 'completed',
          payment_status: 'paid',
          shipping_address: JSON.stringify({
            name: 'John Doe',
            address: '123 Main Street',
            city: 'Istanbul',
            district: 'Kadikoy',
            postal_code: '34700',
            country: 'Turkey'
          }),
          billing_address: JSON.stringify({
            name: 'John Doe',
            address: '123 Main Street',
            city: 'Istanbul',
            district: 'Kadikoy',
            postal_code: '34700',
            country: 'Turkey'
          }),
          tenant_id: 'tenant-demo',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'order-2',
          order_number: 'ORD-2024-002',
          customer_id: 'customer-2',
          customer_name: 'Jane Smith',
          customer_email: 'jane@example.com',
          customer_phone: '+905551234568',
          items: JSON.stringify([
            {
              product_id: 'product-2',
              sku: 'PROD-002',
              name: 'Smartphone Case',
              quantity: 2,
              price: 29.99,
              total_price: 59.98
            }
          ]),
          total_amount: 59.98,
          currency: 'TRY',
          status: 'shipped',
          payment_status: 'paid',
          shipping_address: JSON.stringify({
            name: 'Jane Smith',
            address: '456 Oak Avenue',
            city: 'Ankara',
            district: 'Cankaya',
            postal_code: '06500',
            country: 'Turkey'
          }),
          tenant_id: 'tenant-demo',
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      dependencies: ['products_seed'],
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: 'integrations_seed',
      name: 'Sample Integrations',
      description: 'Create sample integration instances',
      data: [
        {
          id: 'integration-trendyol-demo',
          integration_id: 'trendyol',
          name: 'Demo Trendyol Integration',
          config: JSON.stringify({
            supplierId: 'DEMO_SUPPLIER',
            apiKey: 'demo_api_key',
            apiSecret: 'demo_api_secret'
          }),
          credentials: JSON.stringify({
            username: 'demo_user',
            password: 'demo_pass'
          }),
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'integration-paytr-demo',
          integration_id: 'paytr',
          name: 'Demo PayTR Integration',
          config: JSON.stringify({
            merchantId: 'DEMO_MERCHANT',
            testMode: true
          }),
          credentials: JSON.stringify({
            username: 'demo_user',
            password: 'demo_pass'
          }),
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      dependencies: ['tenants_seed'],
      status: 'pending',
      createdAt: new Date()
    },
    {
      id: 'analytics_seed',
      name: 'Sample Analytics Data',
      description: 'Create sample analytics events and metrics',
      data: [
        {
          id: 'event-1',
          type: 'page_view',
          session_id: 'session-001',
          user_id: 'user-1',
          tenant_id: 'tenant-demo',
          data: JSON.stringify({
            page: '/products',
            referrer: 'https://google.com',
            duration: 45
          }),
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ip_address: '192.168.1.1',
          referrer: 'https://google.com',
          url: '/products',
          timestamp: new Date()
        },
        {
          id: 'event-2',
          type: 'purchase',
          session_id: 'session-001',
          user_id: 'user-1',
          tenant_id: 'tenant-demo',
          data: JSON.stringify({
            order_id: 'order-1',
            amount: 299.99,
            currency: 'TRY',
            items: 1
          }),
          timestamp: new Date()
        }
      ],
      dependencies: ['orders_seed'],
      status: 'pending',
      createdAt: new Date()
    }
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async seedDatabase(force: boolean = false): Promise<SeedResult> {
    try {
      const results: SeedResult = {
        success: true,
        executed: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        warnings: []
      };

      // Get existing seeds
      const existingSeeds = await this.getExistingSeeds();

      for (const seed of this.seedData) {
        try {
          // Check if seed already exists
          const existing = existingSeeds.find(s => s.name === seed.name);

          if (existing && !force) {
            results.skipped++;
            continue;
          }

          // Execute dependencies first
          await this.executeDependencies(seed.dependencies);

          // Execute seed
          await this.executeSeed(seed);

          results.executed++;

        } catch (error) {
          results.failed++;
          results.errors.push(`Seed ${seed.name}: ${error.message}`);
        }
      }

      this.logger.log(`Database seeding completed: ${results.executed} executed, ${results.skipped} skipped, ${results.failed} failed`);
      return results;

    } catch (error) {
      this.logger.error('Failed to seed database', error);
      return {
        success: false,
        executed: 0,
        skipped: 0,
        failed: this.seedData.length,
        errors: [error.message]
      };
    }
  }

  async seedSpecificTable(tableName: string, data: any[]): Promise<{
    success: boolean;
    inserted: number;
    error?: string;
  }> {
    try {
      let inserted = 0;

      for (const item of data) {
        try {
          // Insert data based on table name
          await this.insertTableData(tableName, item);
          inserted++;
        } catch (error) {
          this.logger.error(`Failed to insert data into ${tableName}`, error);
        }
      }

      this.logger.log(`Seeded ${inserted} records into ${tableName}`);
      return { success: true, inserted };

    } catch (error) {
      this.logger.error('Failed to seed specific table', error);
      return { success: false, inserted: 0, error: error.message };
    }
  }

  async clearSeedData(): Promise<{
    success: boolean;
    deleted: number;
    error?: string;
  }> {
    try {
      let deleted = 0;

      // Clear in reverse dependency order
      const reverseDependencies = [...this.seedData].reverse();

      for (const seed of reverseDependencies) {
        try {
          await this.clearSeed(seed);
          deleted++;
        } catch (error) {
          this.logger.error(`Failed to clear seed ${seed.name}`, error);
        }
      }

      this.logger.log(`Cleared ${deleted} seed datasets`);
      return { success: true, deleted };

    } catch (error) {
      this.logger.error('Failed to clear seed data', error);
      return { success: false, deleted: 0, error: error.message };
    }
  }

  async getSeedStatus(): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    seeds: SeedData[];
  }> {
    try {
      const existingSeeds = await this.getExistingSeeds();

      const stats = {
        total: this.seedData.length,
        pending: 0,
        completed: 0,
        failed: 0,
        seeds: this.seedData.map(seed => {
          const existing = existingSeeds.find(s => s.name === seed.name);
          return existing || seed;
        })
      };

      for (const seed of stats.seeds) {
        switch (seed.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'failed':
            stats.failed++;
            break;
        }
      }

      return stats;

    } catch (error) {
      this.logger.error('Failed to get seed status', error);
      return {
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        seeds: []
      };
    }
  }

  private async executeDependencies(dependencies: string[]): Promise<void> {
    for (const depName of dependencies) {
      const dependency = this.seedData.find(s => s.name === depName);
      if (dependency) {
        await this.executeSeed(dependency);
      }
    }
  }

  private async executeSeed(seed: SeedData): Promise<void> {
    try {
      seed.status = 'running';
      const startTime = Date.now();

      for (const item of seed.data) {
        // Determine table name from data structure or use seed name
        const tableName = this.inferTableName(seed.name);

        await this.insertTableData(tableName, item);
      }

      seed.status = 'completed';
      seed.executedAt = new Date();
      seed.executionTime = Date.now() - startTime;

      await this.saveSeedStatus(seed);

    } catch (error) {
      seed.status = 'failed';
      seed.error = error.message;
      await this.saveSeedStatus(seed);
      throw error;
    }
  }

  private async clearSeed(seed: SeedData): Promise<void> {
    try {
      const tableName = this.inferTableName(seed.name);

      // Delete all records from the table
      await this.db.execute(`DELETE FROM ${tableName}`);

      this.logger.log(`Cleared ${tableName} table`);

    } catch (error) {
      this.logger.error(`Failed to clear seed ${seed.name}`, error);
      throw error;
    }
  }

  private inferTableName(seedName: string): string {
    const nameMap: Record<string, string> = {
      'Sample Users': 'users',
      'Sample Tenants': 'tenants',
      'Sample Products': 'products',
      'Sample Orders': 'orders',
      'Sample Integrations': 'integration_instances',
      'Sample Analytics Data': 'analytics_events'
    };

    return nameMap[seedName] || 'unknown';
  }

  private async insertTableData(tableName: string, data: any): Promise<void> {
    // This is a simplified implementation
    // In a real scenario, you'd need proper table schema mapping
    // and handle different data types, constraints, etc.

    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET
        ${columns.filter(col => col !== 'id').map(col => `${col} = EXCLUDED.${col}`).join(', ')}
    `;

    await this.db.execute(query, values);
  }

  private async getExistingSeeds(): Promise<SeedData[]> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM seed_status ORDER BY created_at ASC
      `);

      return result.rows.map(row => ({
        ...row,
        executedAt: row.executed_at,
        createdAt: row.created_at
      }));

    } catch (error) {
      this.logger.error('Failed to get existing seeds', error);
      return [];
    }
  }

  private async saveSeedStatus(seed: SeedData): Promise<void> {
    await this.db.execute(`
      INSERT INTO seed_status (id, name, description, status, executed_at, execution_time, error, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        status = $4, executed_at = $5, execution_time = $6, error = $7
    `, [
      seed.id,
      seed.name,
      seed.description,
      seed.status,
      seed.executedAt,
      seed.executionTime,
      seed.error,
      seed.createdAt
    ]);
  }
}

