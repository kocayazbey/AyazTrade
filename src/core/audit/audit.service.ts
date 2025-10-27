import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { auditLogs } from '../../database/schema/core/audit.schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      const auditEntry = {
        id: this.generateId(),
        userId: data.userId || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        sessionId: data.sessionId || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        severity: data.severity || 'medium',
        timestamp: new Date(),
        createdAt: new Date(),
      };

      await this.db.insert(auditLogs).values(auditEntry);

      // Also log to console for immediate visibility
      this.logger.log(
        `AUDIT: ${data.severity?.toUpperCase()} - User ${data.userId || 'SYSTEM'} ${data.action} on ${data.resource}${data.resourceId ? ` (${data.resourceId})` : ''}`,
        {
          ...data,
          timestamp: auditEntry.timestamp,
        },
      );

      // Log critical events to error level
      if (data.severity === 'critical') {
        this.logger.error(
          `CRITICAL AUDIT EVENT: ${data.action} on ${data.resource}`,
          data,
        );
      }
    } catch (error) {
      this.logger.error('Failed to create audit log', error, {
        auditData: data,
      });
    }
  }

  async logUserAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      metadata,
      severity: this.getActionSeverity(action),
    });
  }

  async logSystemAction(
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      action,
      resource,
      resourceId,
      metadata,
      severity: 'high',
    });
  }

  async logSecurityEvent(
    type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'permission_change' | 'suspicious_activity',
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const severity = type === 'suspicious_activity' ? 'critical' : 'medium';

    await this.log({
      userId,
      action: `security_${type}`,
      resource: 'authentication',
      metadata: {
        eventType: type,
        ...metadata,
      },
      severity,
    });
  }

  async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    accessType: 'read' | 'write' | 'delete',
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      userId,
      action: `data_${accessType}`,
      resource,
      resourceId,
      metadata,
      severity: accessType === 'delete' ? 'high' : 'low',
    });
  }

  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      let query = this.db.select().from(auditLogs);

      if (filters) {
        const conditions = [];
        if (filters.userId) {
          conditions.push(eq(auditLogs.userId, filters.userId));
        }
        if (filters.action) {
          conditions.push(eq(auditLogs.action, filters.action));
        }
        if (filters.resource) {
          conditions.push(eq(auditLogs.resource, filters.resource));
        }
        if (filters.resourceId) {
          conditions.push(eq(auditLogs.resourceId, filters.resourceId));
        }
        if (filters.severity) {
          conditions.push(eq(auditLogs.severity, filters.severity as 'low' | 'medium' | 'high' | 'critical'));
        }
        if (filters.startDate) {
          conditions.push(gte(auditLogs.timestamp, filters.startDate));
        }
        if (filters.endDate) {
          conditions.push(lte(auditLogs.timestamp, filters.endDate));
        }
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }
      }

      query = query.orderBy(desc(auditLogs.timestamp));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      const results = await query;

      return results.map(log => ({
        ...log,
        oldValues: log.oldValues ? JSON.parse(log.oldValues as string) : null,
        newValues: log.newValues ? JSON.parse(log.newValues as string) : null,
        metadata: log.metadata ? JSON.parse(log.metadata as string) : null,
      }));
    } catch (error) {
      this.logger.error('Failed to retrieve audit logs', error, filters);
      return [];
    }
  }

  async getUserActivity(userId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getAuditLogs({
      userId,
      startDate,
      limit: 100,
    });
  }

  async getSecurityEvents(hours: number = 24): Promise<any[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return this.getAuditLogs({
      action: 'security_%',
      startDate,
      severity: 'medium',
    });
  }

  async getResourceHistory(resource: string, resourceId: string): Promise<any[]> {
    return this.getAuditLogs({
      resource,
      resourceId,
      limit: 50,
    });
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActionSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalActions = [
      'user_delete',
      'permission_change',
      'system_config_change',
      'data_export',
      'security_policy_change',
    ];

    const highActions = [
      'user_create',
      'password_change',
      'login',
      'logout',
      'data_delete',
    ];

    const mediumActions = [
      'user_update',
      'data_create',
      'data_update',
    ];

    if (criticalActions.some(a => action.includes(a))) return 'critical';
    if (highActions.some(a => action.includes(a))) return 'high';
    if (mediumActions.some(a => action.includes(a))) return 'medium';
    return 'low';
  }

  // Cleanup old logs (should be run periodically)
  async cleanupOldLogs(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.db
        .delete(auditLogs)
        .where(gte(auditLogs.timestamp, cutoffDate))
        .returning();

      this.logger.log(`Cleaned up ${result.length} audit logs older than ${olderThanDays} days`);
      return result.length;
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', error);
      return 0;
    }
  }
}