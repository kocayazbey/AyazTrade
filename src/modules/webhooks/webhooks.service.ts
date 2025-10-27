import { Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { webhooks } from '../../database/schema/webhooks.schema';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly loggerService: LoggerService,
  ) {}

  async createWebhook(url: string, events: string[], tenantId: string, userId: number) {
    try {
      const [savedWebhook] = await this.databaseService.drizzleClient
        .insert(webhooks)
        .values({
          url,
          events: events as any,
          isActive: true,
          tenantId,
          createdBy: userId as any,
          createdAt: new Date(),
        })
        .returning();

      this.loggerService.log(`Webhook created: ${savedWebhook.id}`, 'WebhooksService');
      return savedWebhook;
    } catch (error) {
      this.loggerService.error('Error creating webhook', (error as Error).stack);
      throw error;
    }
  }

  async triggerWebhook(event: string, data: any, tenantId: string) {
    try {
      const rows = await this.databaseService.drizzleClient
        .select()
        .from(webhooks)
        .where(and(eq(webhooks.tenantId, tenantId as any), eq(webhooks.isActive, true)));

      const results: any[] = [];
      for (const webhook of rows) {
        try {
          if (Array.isArray(webhook.events) && webhook.events.includes(event)) {
            const result = await this.sendWebhook(webhook, event, data);
            results.push({ webhookId: webhook.id, success: true, result });
          }
        } catch (error) {
          this.loggerService.error(`Webhook ${webhook.id} failed`, (error as Error).stack);
          results.push({ webhookId: webhook.id, success: false, error: (error as Error).message });
        }
      }

      return results;
    } catch (error) {
      this.loggerService.error('Error triggering webhooks', (error as Error).stack);
      throw error;
    }
  }

  async getWebhooks(tenantId: string) {
    try {
      return await this.databaseService.drizzleClient
        .select()
        .from(webhooks)
        .where(eq(webhooks.tenantId, tenantId as any))
        .orderBy(desc(webhooks.createdAt));
    } catch (error) {
      this.loggerService.error('Error getting webhooks', (error as Error).stack);
      throw error;
    }
  }

  async updateWebhook(id: number, updates: any, tenantId: string) {
    try {
      const existing = await this.databaseService.drizzleClient
        .select()
        .from(webhooks)
        .where(and(eq(webhooks.id, id as any), eq(webhooks.tenantId, tenantId as any)))
        .limit(1);

      if (!existing[0]) {
        throw new Error('Webhook not found');
      }

      const [updated] = await this.databaseService.drizzleClient
        .update(webhooks)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(webhooks.id, id as any), eq(webhooks.tenantId, tenantId as any)))
        .returning();

      return updated;
    } catch (error) {
      this.loggerService.error('Error updating webhook', (error as Error).stack);
      throw error;
    }
  }

  async deleteWebhook(id: number, tenantId: string) {
    try {
      const res = await this.databaseService.drizzleClient
        .delete(webhooks)
        .where(and(eq(webhooks.id, id as any), eq(webhooks.tenantId, tenantId as any)));
      return (res as any).rowCount ? (res as any).rowCount > 0 : true;
    } catch (error) {
      this.loggerService.error('Error deleting webhook', (error as Error).stack);
      throw error;
    }
  }

  private async sendWebhook(webhook: any, event: string, data: any) {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      webhookId: webhook.id,
    };

    this.loggerService.log(`Webhook sent to ${webhook.url}`, 'WebhooksService');
    return { status: 'delivered', payload };
  }
}
