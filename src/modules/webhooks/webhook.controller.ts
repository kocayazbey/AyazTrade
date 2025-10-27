import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  createdAt: Date;
}

@ApiTags('Webhooks')
@Controller({ path: 'webhooks', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
  @Get()
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async getWebhooks(@CurrentUser('tenantId') tenantId: string) {
    // Mock data
    return [
      {
        id: 'webhook_1',
        url: 'https://example.com/webhook',
        events: ['shipment.created', 'shipment.updated'],
        active: true,
        createdAt: new Date(),
      },
    ];
  }

  @Post()
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async createWebhook(
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: { url: string; events: string[] },
  ) {
    const secret = this.generateSecret();
    
    return {
      id: `webhook_${Date.now()}`,
      url: data.url,
      events: data.events,
      active: true,
      secret,
      createdAt: new Date(),
    };
  }

  @Delete(':id')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async deleteWebhook(@Param('id') webhookId: string) {
    return { success: true, webhookId };
  }

  @Post(':id/test')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Test webhook' })
  @ApiResponse({ status: 200, description: 'Test webhook sent' })
  async testWebhook(@Param('id') webhookId: string) {
    return {
      success: true,
      webhookId,
      testPayload: {
        event: 'webhook.test',
        timestamp: new Date(),
        data: { message: 'Test webhook' },
      },
    };
  }

  @Get('events')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get available webhook events' })
  @ApiResponse({ status: 200, description: 'List of available events' })
  async getAvailableEvents() {
    return {
      events: [
        { name: 'shipment.created', description: 'Triggered when a shipment is created' },
        { name: 'shipment.updated', description: 'Triggered when a shipment is updated' },
        { name: 'shipment.delivered', description: 'Triggered when a shipment is delivered' },
        { name: 'invoice.created', description: 'Triggered when an invoice is generated' },
        { name: 'invoice.paid', description: 'Triggered when an invoice is paid' },
        { name: 'order.created', description: 'Triggered when an order is created' },
        { name: 'order.completed', description: 'Triggered when an order is completed' },
        { name: 'customer.created', description: 'Triggered when a customer is created' },
      ],
    };
  }

  private generateSecret(): string {
    return `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
}

