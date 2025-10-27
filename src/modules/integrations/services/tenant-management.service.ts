import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain?: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
  features: string[];
  limits: {
    users: number;
    orders: number;
    products: number;
    storage: number; // MB
    apiCalls: number; // per month
    integrations: number;
  };
  settings: {
    timezone: string;
    currency: string;
    language: string;
    theme: string;
    notifications: {
      email: boolean;
      sms: boolean;
      webhook: boolean;
    };
    security: {
      twoFactorRequired: boolean;
      passwordExpiry: number; // days
      sessionTimeout: number; // minutes
    };
  };
  subscription: {
    startDate: Date;
    endDate?: Date;
    trialEndsAt?: Date;
    billingCycle: 'monthly' | 'yearly';
    autoRenew: boolean;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
  permissions: string[];
  departments: string[];
  status: 'active' | 'inactive' | 'suspended';
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantConfiguration {
  id: string;
  tenantId: string;
  category: 'general' | 'integrations' | 'analytics' | 'security' | 'billing' | 'custom';
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  sensitive: boolean; // if true, value is encrypted
  description?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantDatabase {
  id: string;
  tenantId: string;
  databaseName: string;
  schemaName: string;
  connectionString: string;
  status: 'active' | 'migrating' | 'archived' | 'deleted';
  size: number; // MB
  lastBackupAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantFeature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'integration' | 'analytics' | 'automation' | 'security' | 'custom';
  dependencies: string[];
  limits: {
    maxInstances: number;
    maxConcurrent: number;
    maxStorage: number;
  };
  pricing: {
    monthly: number;
    yearly: number;
    setup?: number;
  };
  availablePlans: string[];
  status: 'active' | 'beta' | 'deprecated' | 'maintenance';
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TenantManagementService {
  private readonly logger = new Logger(TenantManagementService.name);

  private tenants: Map<string, Tenant> = new Map();
  private tenantUsers: Map<string, TenantUser> = new Map();
  private tenantConfigurations: Map<string, TenantConfiguration> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createTenant(tenantData: {
    name: string;
    domain: string;
    subdomain?: string;
    plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
    features?: string[];
    createdBy: string;
    settings?: Partial<Tenant['settings']>;
    subscription?: Partial<Tenant['subscription']>;
  }): Promise<{
    success: boolean;
    tenantId?: string;
    error?: string;
  }> {
    try {
      // Check if domain/subdomain is available
      const domainAvailable = await this.isDomainAvailable(tenantData.domain, tenantData.subdomain);
      if (!domainAvailable) {
        throw new Error('Domain or subdomain is already taken');
      }

      const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get plan limits
      const planLimits = this.getPlanLimits(tenantData.plan);

      // Create tenant
      const tenant: Tenant = {
        id: tenantId,
        name: tenantData.name,
        domain: tenantData.domain,
        subdomain: tenantData.subdomain,
        status: 'trial',
        plan: tenantData.plan,
        features: tenantData.features || this.getDefaultFeatures(tenantData.plan),
        limits: planLimits,
        settings: {
          timezone: 'Europe/Istanbul',
          currency: 'TRY',
          language: 'tr',
          theme: 'light',
          notifications: {
            email: true,
            sms: false,
            webhook: false
          },
          security: {
            twoFactorRequired: false,
            passwordExpiry: 90,
            sessionTimeout: 480
          },
          ...tenantData.settings
        },
        subscription: {
          startDate: new Date(),
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          billingCycle: 'monthly',
          autoRenew: true,
          ...tenantData.subscription
        },
        createdBy: tenantData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save tenant to database
      await this.saveTenantToDB(tenant);

      // Create tenant database
      await this.createTenantDatabase(tenant);

      // Create default configurations
      await this.createDefaultConfigurations(tenantId);

      // Add creator as owner
      await this.addUserToTenant(tenantId, tenantData.createdBy, 'owner');

      this.tenants.set(tenantId, tenant);

      this.logger.log(`Tenant created: ${tenantId} - ${tenantData.name}`);
      return { success: true, tenantId };

    } catch (error) {
      this.logger.error('Failed to create tenant', error);
      return { success: false, error: error.message };
    }
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const updatedTenant = { ...tenant, ...updates, updatedAt: new Date() };

      await this.updateTenantInDB(updatedTenant);
      this.tenants.set(tenantId, updatedTenant);

      this.logger.log(`Tenant updated: ${tenantId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to update tenant', error);
      return { success: false, error: error.message };
    }
  }

  async suspendTenant(tenantId: string, reason: string, suspendedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      tenant.status = 'suspended';

      await this.updateTenantInDB(tenant);
      await this.logTenantActivity(tenantId, 'suspended', reason, suspendedBy);

      this.logger.log(`Tenant suspended: ${tenantId} - ${reason}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to suspend tenant', error);
      return { success: false, error: error.message };
    }
  }

  async reactivateTenant(tenantId: string, reactivatedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      tenant.status = 'active';

      await this.updateTenantInDB(tenant);
      await this.logTenantActivity(tenantId, 'reactivated', 'Tenant reactivated', reactivatedBy);

      this.logger.log(`Tenant reactivated: ${tenantId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to reactivate tenant', error);
      return { success: false, error: error.message };
    }
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const cached = this.tenants.get(tenantId);
      if (cached) return cached;

      const result = await this.db.execute(
        'SELECT * FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const tenant: Tenant = {
        ...row,
        features: JSON.parse(row.features || '[]'),
        limits: JSON.parse(row.limits || '{}'),
        settings: JSON.parse(row.settings || '{}'),
        subscription: JSON.parse(row.subscription || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      this.tenants.set(tenantId, tenant);
      return tenant;

    } catch (error) {
      this.logger.error('Failed to get tenant', error);
      return null;
    }
  }

  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    try {
      const result = await this.db.execute(
        'SELECT * FROM tenants WHERE domain = $1 OR subdomain = $2',
        [domain, domain]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        features: JSON.parse(row.features || '[]'),
        limits: JSON.parse(row.limits || '{}'),
        settings: JSON.parse(row.settings || '{}'),
        subscription: JSON.parse(row.subscription || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      this.logger.error('Failed to get tenant by domain', error);
      return null;
    }
  }

  async getTenants(filters?: {
    status?: string;
    plan?: string;
    createdBy?: string;
  }): Promise<Tenant[]> {
    try {
      let query = 'SELECT * FROM tenants WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.plan) {
        query += ` AND plan = $${paramIndex}`;
        params.push(filters.plan);
        paramIndex++;
      }

      if (filters?.createdBy) {
        query += ` AND created_by = $${paramIndex}`;
        params.push(filters.createdBy);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        features: JSON.parse(row.features || '[]'),
        limits: JSON.parse(row.limits || '{}'),
        settings: JSON.parse(row.settings || '{}'),
        subscription: JSON.parse(row.subscription || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get tenants', error);
      return [];
    }
  }

  async addUserToTenant(tenantId: string, userId: string, role: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer', invitedBy?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const tenantUser: TenantUser = {
        id: `tu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        userId,
        role,
        permissions: this.getRolePermissions(role),
        departments: [],
        status: 'active',
        invitedBy,
        invitedAt: new Date(),
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveTenantUserToDB(tenantUser);
      this.tenantUsers.set(tenantUser.id, tenantUser);

      this.logger.log(`User ${userId} added to tenant ${tenantId} as ${role}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to add user to tenant', error);
      return { success: false, error: error.message };
    }
  }

  async removeUserFromTenant(tenantId: string, userId: string, removedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        DELETE FROM tenant_users
        WHERE tenant_id = $1 AND user_id = $2
      `, [tenantId, userId]);

      await this.logTenantActivity(tenantId, 'user_removed', `User ${userId} removed`, removedBy);

      this.logger.log(`User ${userId} removed from tenant ${tenantId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to remove user from tenant', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserRole(tenantId: string, userId: string, newRole: string, updatedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        UPDATE tenant_users SET
          role = $1,
          permissions = $2,
          updated_at = $3
        WHERE tenant_id = $4 AND user_id = $5
      `, [newRole, JSON.stringify(this.getRolePermissions(newRole)), new Date(), tenantId, userId]);

      await this.logTenantActivity(tenantId, 'role_updated', `User ${userId} role changed to ${newRole}`, updatedBy);

      this.logger.log(`User ${userId} role updated to ${newRole} in tenant ${tenantId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to update user role', error);
      return { success: false, error: error.message };
    }
  }

  async setTenantConfiguration(tenantId: string, configuration: {
    category: 'general' | 'integrations' | 'analytics' | 'security' | 'billing' | 'custom';
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'json' | 'array';
    sensitive?: boolean;
    description?: string;
    validation?: any;
  }, setBy: string): Promise<{
    success: boolean;
    configId?: string;
    error?: string;
  }> {
    try {
      const configId = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const tenantConfig: TenantConfiguration = {
        id: configId,
        tenantId,
        category: configuration.category,
        key: configuration.key,
        value: configuration.sensitive ? this.encryptValue(configuration.value) : configuration.value,
        type: configuration.type,
        sensitive: configuration.sensitive || false,
        description: configuration.description,
        validation: configuration.validation,
        createdBy: setBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveTenantConfigurationToDB(tenantConfig);
      this.tenantConfigurations.set(configId, tenantConfig);

      await this.logTenantActivity(tenantId, 'configuration_updated', `Configuration ${configuration.key} set`, setBy);

      this.logger.log(`Tenant configuration set: ${tenantId} - ${configuration.key}`);
      return { success: true, configId };

    } catch (error) {
      this.logger.error('Failed to set tenant configuration', error);
      return { success: false, error: error.message };
    }
  }

  async getTenantConfiguration(tenantId: string, category?: string): Promise<TenantConfiguration[]> {
    try {
      let query = 'SELECT * FROM tenant_configurations WHERE tenant_id = $1';
      const params = [tenantId];

      if (category) {
        query += ' AND category = $2';
        params.push(category);
      }

      query += ' ORDER BY category, key';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        value: row.sensitive ? this.decryptValue(row.value) : row.value,
        validation: JSON.parse(row.validation || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get tenant configuration', error);
      return [];
    }
  }

  async getTenantUsers(tenantId: string, role?: string): Promise<TenantUser[]> {
    try {
      let query = 'SELECT * FROM tenant_users WHERE tenant_id = $1';
      const params = [tenantId];

      if (role) {
        query += ' AND role = $2';
        params.push(role);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        permissions: JSON.parse(row.permissions || '[]'),
        departments: JSON.parse(row.departments || '[]'),
        invitedAt: row.invited_at,
        joinedAt: row.joined_at,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get tenant users', error);
      return [];
    }
  }

  async getTenantActivity(tenantId: string, limit: number = 50): Promise<Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    performedAt: Date;
    metadata: Record<string, any>;
  }>> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM tenant_activity_log
        WHERE tenant_id = $1
        ORDER BY performed_at DESC
        LIMIT $2
      `, [tenantId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        action: row.action,
        description: row.description,
        performedBy: row.performed_by,
        performedAt: row.performed_at,
        metadata: JSON.parse(row.metadata || '{}')
      }));

    } catch (error) {
      this.logger.error('Failed to get tenant activity', error);
      return [];
    }
  }

  async checkTenantLimits(tenantId: string): Promise<{
    withinLimits: boolean;
    exceeded: Array<{
      resource: string;
      current: number;
      limit: number;
      percentage: number;
    }>;
  }> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const exceeded: Array<{
        resource: string;
        current: number;
        limit: number;
        percentage: number;
      }> = [];

      // Check user limit
      const userCount = await this.getTenantUsers(tenantId);
      if (userCount.length > tenant.limits.users) {
        exceeded.push({
          resource: 'users',
          current: userCount.length,
          limit: tenant.limits.users,
          percentage: (userCount.length / tenant.limits.users) * 100
        });
      }

      // Check product limit
      const productResult = await this.db.execute(
        'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1',
        [tenantId]
      );
      const productCount = parseInt(productResult.rows[0]?.count) || 0;

      if (productCount > tenant.limits.products) {
        exceeded.push({
          resource: 'products',
          current: productCount,
          limit: tenant.limits.products,
          percentage: (productCount / tenant.limits.products) * 100
        });
      }

      // Check storage limit
      const storageResult = await this.db.execute(
        'SELECT COALESCE(SUM(size), 0) as total_size FROM tenant_databases WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'active']
      );
      const storageUsed = parseFloat(storageResult.rows[0]?.total_size) || 0;

      if (storageUsed > tenant.limits.storage) {
        exceeded.push({
          resource: 'storage',
          current: storageUsed,
          limit: tenant.limits.storage,
          percentage: (storageUsed / tenant.limits.storage) * 100
        });
      }

      return {
        withinLimits: exceeded.length === 0,
        exceeded
      };

    } catch (error) {
      this.logger.error('Failed to check tenant limits', error);
      return {
        withinLimits: false,
        exceeded: []
      };
    }
  }

  private async isDomainAvailable(domain: string, subdomain?: string): Promise<boolean> {
    const result = await this.db.execute(`
      SELECT COUNT(*) as count FROM tenants
      WHERE domain = $1 OR subdomain = $2 OR subdomain = $3
    `, [domain, subdomain, domain]);

    return parseInt(result.rows[0]?.count) === 0;
  }

  private getPlanLimits(plan: string): Tenant['limits'] {
    switch (plan) {
      case 'free':
        return {
          users: 5,
          orders: 100,
          products: 50,
          storage: 100,
          apiCalls: 1000,
          integrations: 2
        };
      case 'starter':
        return {
          users: 20,
          orders: 1000,
          products: 500,
          storage: 1000,
          apiCalls: 10000,
          integrations: 5
        };
      case 'professional':
        return {
          users: 100,
          orders: 10000,
          products: 5000,
          storage: 10000,
          apiCalls: 100000,
          integrations: 20
        };
      case 'enterprise':
        return {
          users: 500,
          orders: 100000,
          products: 50000,
          storage: 100000,
          apiCalls: 1000000,
          integrations: 100
        };
      default:
        return {
          users: 5,
          orders: 100,
          products: 50,
          storage: 100,
          apiCalls: 1000,
          integrations: 2
        };
    }
  }

  private getDefaultFeatures(plan: string): string[] {
    const baseFeatures = ['basic_dashboard', 'user_management', 'product_management', 'order_management'];

    switch (plan) {
      case 'starter':
        return [...baseFeatures, 'inventory_management', 'basic_analytics', 'email_notifications'];
      case 'professional':
        return [...baseFeatures, 'advanced_analytics', 'custom_reports', 'api_access', 'webhooks', 'multi_warehouse'];
      case 'enterprise':
        return [...baseFeatures, 'advanced_analytics', 'custom_reports', 'api_access', 'webhooks', 'multi_warehouse', 'advanced_security', 'custom_integrations', 'priority_support'];
      default:
        return baseFeatures;
    }
  }

  private getRolePermissions(role: string): string[] {
    switch (role) {
      case 'owner':
        return ['*']; // All permissions
      case 'admin':
        return [
          'tenant.manage_users', 'tenant.manage_settings', 'tenant.view_analytics',
          'products.manage', 'orders.manage', 'inventory.manage', 'integrations.manage'
        ];
      case 'manager':
        return [
          'tenant.view_users', 'tenant.view_settings', 'tenant.view_analytics',
          'products.view', 'orders.manage', 'inventory.view'
        ];
      case 'employee':
        return [
          'products.view', 'orders.view', 'inventory.view', 'customers.view'
        ];
      case 'viewer':
        return [
          'tenant.view_analytics', 'products.view', 'orders.view', 'inventory.view'
        ];
      default:
        return [];
    }
  }

  private async createTenantDatabase(tenant: Tenant): Promise<void> {
    const databaseName = `tenant_${tenant.id}`;
    const schemaName = `tenant_${tenant.id}`;

    // In a real implementation, this would create a separate database/schema
    // For this demo, we'll just log the action
    this.logger.log(`Creating tenant database: ${databaseName}`);

    const tenantDatabase: TenantDatabase = {
      id: `db-${tenant.id}`,
      tenantId: tenant.id,
      databaseName,
      schemaName,
      connectionString: `postgresql://localhost:5432/${databaseName}`,
      status: 'active',
      size: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveTenantDatabaseToDB(tenantDatabase);
  }

  private async createDefaultConfigurations(tenantId: string): Promise<void> {
    const defaultConfigs: Array<{
      category: 'general' | 'integrations' | 'analytics' | 'security' | 'billing' | 'custom';
      key: string;
      value: any;
      type: 'string' | 'number' | 'boolean' | 'json' | 'array';
      description: string;
    }> = [
      {
        category: 'general',
        key: 'default_currency',
        value: 'TRY',
        type: 'string',
        description: 'Default currency for the tenant'
      },
      {
        category: 'general',
        key: 'default_language',
        value: 'tr',
        type: 'string',
        description: 'Default language for the tenant'
      },
      {
        category: 'integrations',
        key: 'auto_sync',
        value: true,
        type: 'boolean',
        description: 'Enable automatic data synchronization'
      },
      {
        category: 'analytics',
        key: 'tracking_enabled',
        value: true,
        type: 'boolean',
        description: 'Enable analytics tracking'
      }
    ];

    for (const config of defaultConfigs) {
      await this.setTenantConfiguration(tenantId, config, 'system');
    }
  }

  private async saveTenantToDB(tenant: Tenant): Promise<void> {
    await this.db.execute(`
      INSERT INTO tenants (
        id, name, domain, subdomain, status, plan, features, limits,
        settings, subscription, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      tenant.id,
      tenant.name,
      tenant.domain,
      tenant.subdomain,
      tenant.status,
      tenant.plan,
      JSON.stringify(tenant.features),
      JSON.stringify(tenant.limits),
      JSON.stringify(tenant.settings),
      JSON.stringify(tenant.subscription),
      tenant.createdBy,
      tenant.createdAt,
      tenant.updatedAt
    ]);
  }

  private async updateTenantInDB(tenant: Tenant): Promise<void> {
    await this.db.execute(`
      UPDATE tenants SET
        name = $1, subdomain = $2, status = $3, plan = $4,
        features = $5, limits = $6, settings = $7, subscription = $8, updated_at = $9
      WHERE id = $10
    `, [
      tenant.name,
      tenant.subdomain,
      tenant.status,
      tenant.plan,
      JSON.stringify(tenant.features),
      JSON.stringify(tenant.limits),
      JSON.stringify(tenant.settings),
      JSON.stringify(tenant.subscription),
      tenant.updatedAt,
      tenant.id
    ]);
  }

  private async saveTenantUserToDB(tenantUser: TenantUser): Promise<void> {
    await this.db.execute(`
      INSERT INTO tenant_users (
        id, tenant_id, user_id, role, permissions, departments,
        status, invited_by, invited_at, joined_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      tenantUser.id,
      tenantUser.tenantId,
      tenantUser.userId,
      tenantUser.role,
      JSON.stringify(tenantUser.permissions),
      JSON.stringify(tenantUser.departments),
      tenantUser.status,
      tenantUser.invitedBy,
      tenantUser.invitedAt,
      tenantUser.joinedAt,
      tenantUser.createdAt,
      tenantUser.updatedAt
    ]);
  }

  private async saveTenantConfigurationToDB(config: TenantConfiguration): Promise<void> {
    await this.db.execute(`
      INSERT INTO tenant_configurations (
        id, tenant_id, category, key, value, type, sensitive,
        description, validation, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      config.id,
      config.tenantId,
      config.category,
      config.key,
      config.value,
      config.type,
      config.sensitive,
      config.description,
      JSON.stringify(config.validation || {}),
      config.createdBy,
      config.createdAt,
      config.updatedAt
    ]);
  }

  private async saveTenantDatabaseToDB(database: TenantDatabase): Promise<void> {
    await this.db.execute(`
      INSERT INTO tenant_databases (
        id, tenant_id, database_name, schema_name, connection_string,
        status, size, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      database.id,
      database.tenantId,
      database.databaseName,
      database.schemaName,
      database.connectionString,
      database.status,
      database.size,
      database.createdAt,
      database.updatedAt
    ]);
  }

  private async logTenantActivity(tenantId: string, action: string, description: string, performedBy: string, metadata?: Record<string, any>): Promise<void> {
    await this.db.execute(`
      INSERT INTO tenant_activity_log (tenant_id, action, description, performed_by, metadata, performed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      tenantId,
      action,
      description,
      performedBy,
      JSON.stringify(metadata || {}),
      new Date()
    ]);
  }

  private encryptValue(value: any): string {
    // Simple encryption for demo - in production use proper encryption
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  private decryptValue(encryptedValue: string): any {
    // Simple decryption for demo
    try {
      return JSON.parse(Buffer.from(encryptedValue, 'base64').toString());
    } catch {
      return encryptedValue;
    }
  }
}
