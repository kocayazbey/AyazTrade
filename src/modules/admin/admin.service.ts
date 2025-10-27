import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { users, permissions, rolePermissions } from '../../database/schema/core';
import { eq, and, or, like, ilike, desc, sql } from 'drizzle-orm';

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ==================== DASHBOARD ====================

  async getDashboardData(tenantId: string) {
    try {
      // Get basic statistics
      const stats = await this.getSystemStats(tenantId);
      
      // Get recent activities
      const recentActivities = await this.getRecentActivities(tenantId);
      
      // Get system health
      const systemHealth = await this.getSystemHealth(tenantId);

      return {
        success: true,
        data: {
          stats,
          recentActivities,
          systemHealth,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Dashboard data fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSystemStats(tenantId: string) {
    try {
      // Get user statistics
      const userStats = await this.getUserStats();

      // Get order statistics
      const orderStats = await this.getOrderStats();

      // Get product statistics
      const productStats = await this.getProductStats();

      // Get revenue statistics
      const revenueStats = await this.getRevenueStats();

      const stats = {
        users: userStats,
        orders: orderStats,
        products: productStats,
        revenue: revenueStats
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      throw new Error(`System stats fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getUserStats() {
    try {
      // Get total users
      const totalUsers = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.deletedAt, null));

      // Get active users (users with recent login)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.deletedAt, null),
            sql`${users.lastLogin} >= ${thirtyDaysAgo}`
          )
        );

      // Get new users this month
      const firstDayThisMonth = new Date();
      firstDayThisMonth.setDate(1);
      firstDayThisMonth.setHours(0, 0, 0, 0);

      const newUsersThisMonth = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.deletedAt, null),
            sql`${users.createdAt} >= ${firstDayThisMonth}`
          )
        );

      return {
        total: Number(totalUsers[0].count),
        active: Number(activeUsers[0].count),
        newThisMonth: Number(newUsersThisMonth[0].count)
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return { total: 0, active: 0, newThisMonth: 0 };
    }
  }

  private async getOrderStats() {
    try {
      // Import orders schema
      const { orders } = await import('../../database/schema/orders.schema');

      // Get total orders
      const totalOrders = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.deletedAt, null));

      // Get pending orders
      const pendingOrders = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.deletedAt, null),
            eq(orders.status, 'pending')
          )
        );

      // Get completed orders
      const completedOrders = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.deletedAt, null),
            eq(orders.status, 'completed')
          )
        );

      // Get total revenue
      const revenueResult = await this.databaseService.drizzleClient
        .select({ sum: sql<number>`sum(${orders.totalAmount})` })
        .from(orders)
        .where(eq(orders.deletedAt, null));

      return {
        total: Number(totalOrders[0].count),
        pending: Number(pendingOrders[0].count),
        completed: Number(completedOrders[0].count),
        revenue: Number(revenueResult[0].sum) || 0
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return { total: 0, pending: 0, completed: 0, revenue: 0 };
    }
  }

  private async getProductStats() {
    try {
      // Import products schema
      const { products } = await import('../../database/schema/products.schema');

      // Get total products
      const totalProducts = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.deletedAt, null));

      // Get active products
      const activeProducts = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
          and(
            eq(products.deletedAt, null),
            eq(products.status, 'active')
          )
        );

      // Get out of stock products
      const outOfStockProducts = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
          and(
            eq(products.deletedAt, null),
            eq(products.status, 'active'),
            sql`${products.stockQuantity} <= 0`
          )
        );

      return {
        total: Number(totalProducts[0].count),
        active: Number(activeProducts[0].count),
        outOfStock: Number(outOfStockProducts[0].count)
      };
    } catch (error) {
      console.error('Error fetching product stats:', error);
      return { total: 0, active: 0, outOfStock: 0 };
    }
  }

  private async getRevenueStats() {
    try {
      // Import orders schema
      const { orders } = await import('../../database/schema/orders.schema');

      // Get today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayRevenue = await this.databaseService.drizzleClient
        .select({ sum: sql<number>`sum(${orders.totalAmount})` })
        .from(orders)
        .where(
          and(
            eq(orders.deletedAt, null),
            eq(orders.status, 'completed'),
            sql`${orders.createdAt} >= ${today}`,
            sql`${orders.createdAt} < ${tomorrow}`
          )
        );

      // Get this month's revenue
      const firstDayThisMonth = new Date();
      firstDayThisMonth.setDate(1);
      firstDayThisMonth.setHours(0, 0, 0, 0);
      const firstDayNextMonth = new Date(firstDayThisMonth);
      firstDayNextMonth.setMonth(firstDayNextMonth.getMonth() + 1);

      const monthRevenue = await this.databaseService.drizzleClient
        .select({ sum: sql<number>`sum(${orders.totalAmount})` })
        .from(orders)
        .where(
          and(
            eq(orders.deletedAt, null),
            eq(orders.status, 'completed'),
            sql`${orders.createdAt} >= ${firstDayThisMonth}`,
            sql`${orders.createdAt} < ${firstDayNextMonth}`
          )
        );

      // Get this year's revenue
      const firstDayThisYear = new Date();
      firstDayThisYear.setMonth(0, 1);
      firstDayThisYear.setHours(0, 0, 0, 0);
      const firstDayNextYear = new Date(firstDayThisYear);
      firstDayNextYear.setFullYear(firstDayNextYear.getFullYear() + 1);

      const yearRevenue = await this.databaseService.drizzleClient
        .select({ sum: sql<number>`sum(${orders.totalAmount})` })
        .from(orders)
        .where(
          and(
            eq(orders.deletedAt, null),
            eq(orders.status, 'completed'),
            sql`${orders.createdAt} >= ${firstDayThisYear}`,
            sql`${orders.createdAt} < ${firstDayNextYear}`
          )
        );

      // Calculate growth (mock for now - would need previous period comparison)
      const growth = 15.2; // TODO: Calculate real growth percentage

      return {
        today: Number(todayRevenue[0].sum) || 0,
        thisMonth: Number(monthRevenue[0].sum) || 0,
        thisYear: Number(yearRevenue[0].sum) || 0,
        growth
      };
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      return { today: 0, thisMonth: 0, thisYear: 0, growth: 0 };
    }
  }

  // ==================== USER MANAGEMENT ====================

  async getUsers(filters: any, tenantId: string) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = Math.min(parseInt(filters.limit) || 20, 100);
      const offset = (page - 1) * limit;

      // Build conditions for filtering
      const conditions = [];

      // Filter by role
      if (filters.role) {
        conditions.push(eq(users.role, filters.role));
      }

      // Filter by status
      if (filters.status) {
        conditions.push(eq(users.isActive, filters.status === 'active'));
      }

      // Search filter (name, email)
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(users.firstName, searchTerm),
            ilike(users.lastName, searchTerm),
            ilike(users.email, searchTerm)
          )
        );
      }

      // Exclude deleted users
      conditions.push(eq(users.deletedAt, null));

      const whereClause = conditions.length > 0 ? and(...conditions) : eq(users.deletedAt, null);

      // Get total count for pagination
      const totalResult = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);

      const total = Number(totalResult[0].count);

      // Get paginated results
      const usersList = await this.databaseService.drizzleClient
        .select()
        .from(users)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(users.createdAt));

      return {
        success: true,
        data: {
          users: usersList.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            // TODO: Add order count and total spent calculations
            orderCount: 0,
            totalSpent: 0
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error(`Users fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  async getUser(userId: string, tenantId: string) {
    try {
      const [user] = await this.databaseService.drizzleClient
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.deletedAt, null)))
        .limit(1);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          permissions: this.getPermissionsByRole(user.role),
          // TODO: Add order count and total spent for this user
          orderCount: 0,
          totalSpent: 0
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user:', error);
      throw new Error(`User fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createUser(userData: any, tenantId: string) {
    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      const userId = `USER-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const [newUser] = await this.databaseService.drizzleClient
        .insert(users)
        .values({
          id: userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'customer',
          isActive: userData.isActive !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
          orderCount: 0,
          totalSpent: 0
        },
        message: 'User created successfully'
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating user:', error);
      throw new Error(`User creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateUser(userId: string, userData: any, tenantId: string) {
    try {
      // Check if user exists
      const [existingUser] = await this.databaseService.drizzleClient
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.deletedAt, null)))
        .limit(1);

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const [updatedUser] = await this.databaseService.drizzleClient
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
          orderCount: 0, // TODO: Calculate real order count
          totalSpent: 0  // TODO: Calculate real total spent
        },
        message: 'User updated successfully'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating user:', error);
      throw new Error(`User update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteUser(userId: string, tenantId: string) {
    try {
      // Soft delete - set deletedAt timestamp
      const [deletedUser] = await this.databaseService.drizzleClient
        .update(users)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!deletedUser) {
        throw new NotFoundException('User not found');
      }

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting user:', error);
      throw new Error(`User deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== ROLE MANAGEMENT ====================

  async getRoles(tenantId: string) {
    try {
      const roles = [
        {
          id: 'super_admin',
          name: 'super_admin',
          displayName: 'SÃ¼per YÃ¶netici',
          description: 'TÃ¼m yetkilere sahip',
          permissions: ['all'],
          userCount: 1
        },
        {
          id: 'admin',
          name: 'admin',
          displayName: 'YÃ¶netici',
          description: 'YÃ¶netim yetkileri',
          permissions: ['view_dashboard', 'view_users', 'edit_users', 'view_orders', 'edit_orders'],
          userCount: 3
        },
        {
          id: 'product_manager',
          name: 'product_manager',
          displayName: 'ÃœrÃ¼n YÃ¶neticisi',
          description: 'ÃœrÃ¼n yÃ¶netimi yetkileri',
          permissions: ['view_products', 'add_edit_products', 'manage_categories'],
          userCount: 5
        },
        {
          id: 'order_manager',
          name: 'order_manager',
          displayName: 'SipariÅŸ YÃ¶neticisi',
          description: 'SipariÅŸ yÃ¶netimi yetkileri',
          permissions: ['view_orders', 'update_order_status', 'refunds'],
          userCount: 4
        },
        {
          id: 'finance',
          name: 'finance',
          displayName: 'Mali Ä°ÅŸler',
          description: 'Mali iÅŸler yetkileri',
          permissions: ['view_payments', 'invoices', 'reports', 'view_finance_reports'],
          userCount: 2
        }
      ];

      return {
        success: true,
        data: roles
      };
    } catch (error) {
      throw new Error(`Roles fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPermissions(tenantId: string) {
    try {
      const permissions = [
        { id: 'all', name: 'TÃ¼m Yetkiler', description: 'Sistemdeki tÃ¼m yetkilere sahip' },
        { id: 'view_dashboard', name: 'Dashboard GÃ¶rÃ¼ntÃ¼le', description: 'Dashboard gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'view_users', name: 'KullanÄ±cÄ±larÄ± GÃ¶rÃ¼ntÃ¼le', description: 'KullanÄ±cÄ±larÄ± gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'create_users', name: 'KullanÄ±cÄ± OluÅŸtur', description: 'KullanÄ±cÄ± oluÅŸturma yetkisi' },
        { id: 'edit_users', name: 'KullanÄ±cÄ± DÃ¼zenle', description: 'KullanÄ±cÄ± dÃ¼zenleme yetkisi' },
        { id: 'delete_users', name: 'KullanÄ±cÄ± Sil', description: 'KullanÄ±cÄ± silme yetkisi' },
        { id: 'view_roles', name: 'Rolleri GÃ¶rÃ¼ntÃ¼le', description: 'Rolleri gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'create_roles', name: 'Rol OluÅŸtur', description: 'Rol oluÅŸturma yetkisi' },
        { id: 'edit_roles', name: 'Rol DÃ¼zenle', description: 'Rol dÃ¼zenleme yetkisi' },
        { id: 'delete_roles', name: 'Rol Sil', description: 'Rol silme yetkisi' },
        { id: 'view_permissions', name: 'Ä°zinleri GÃ¶rÃ¼ntÃ¼le', description: 'Ä°zinleri gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'view_products', name: 'ÃœrÃ¼nleri GÃ¶rÃ¼ntÃ¼le', description: 'ÃœrÃ¼nleri gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'add_edit_products', name: 'ÃœrÃ¼n Ekle/DÃ¼zenle', description: 'ÃœrÃ¼n ekleme ve dÃ¼zenleme yetkisi' },
        { id: 'manage_categories', name: 'Kategori YÃ¶netimi', description: 'Kategori yÃ¶netimi yetkisi' },
        { id: 'view_orders', name: 'SipariÅŸleri GÃ¶rÃ¼ntÃ¼le', description: 'SipariÅŸleri gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'update_order_status', name: 'SipariÅŸ Durumu GÃ¼ncelle', description: 'SipariÅŸ durumu gÃ¼ncelleme yetkisi' },
        { id: 'refunds', name: 'Ä°ade Ä°ÅŸlemleri', description: 'Ä°ade iÅŸlemleri yetkisi' },
        { id: 'view_payments', name: 'Ã–demeleri GÃ¶rÃ¼ntÃ¼le', description: 'Ã–demeleri gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'invoices', name: 'Fatura YÃ¶netimi', description: 'Fatura yÃ¶netimi yetkisi' },
        { id: 'reports', name: 'Raporlar', description: 'Rapor gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'view_finance_reports', name: 'Mali Raporlar', description: 'Mali raporlarÄ± gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'view_settings', name: 'AyarlarÄ± GÃ¶rÃ¼ntÃ¼le', description: 'Sistem ayarlarÄ±nÄ± gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'edit_settings', name: 'AyarlarÄ± DÃ¼zenle', description: 'Sistem ayarlarÄ±nÄ± dÃ¼zenleme yetkisi' },
        { id: 'view_audit_logs', name: 'Denetim KayÄ±tlarÄ±', description: 'Denetim kayÄ±tlarÄ±nÄ± gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'view_system_health', name: 'Sistem SaÄŸlÄ±ÄŸÄ±', description: 'Sistem saÄŸlÄ±ÄŸÄ±nÄ± gÃ¶rÃ¼ntÃ¼leme yetkisi' },
        { id: 'manage_backups', name: 'Yedekleme YÃ¶netimi', description: 'Yedekleme yÃ¶netimi yetkisi' },
        { id: 'view_backups', name: 'Yedekleri GÃ¶rÃ¼ntÃ¼le', description: 'Yedekleri gÃ¶rÃ¼ntÃ¼leme yetkisi' }
      ];

      return {
        success: true,
        data: permissions
      };
    } catch (error) {
      throw new Error(`Permissions fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createRole(roleData: any, tenantId: string) {
    try {
      const newRole = {
        id: Date.now().toString(),
        ...roleData,
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        data: newRole,
        message: 'Role created successfully'
      };
    } catch (error) {
      throw new Error(`Role creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateRole(roleId: string, roleData: any, tenantId: string) {
    try {
      const updatedRole = {
        id: roleId,
        ...roleData,
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        data: updatedRole,
        message: 'Role updated successfully'
      };
    } catch (error) {
      throw new Error(`Role update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteRole(roleId: string, tenantId: string) {
    try {
      return {
        success: true,
        message: 'Role deleted successfully'
      };
    } catch (error) {
      throw new Error(`Role deletion failed: ${error.message}`);
    }
  }
}
