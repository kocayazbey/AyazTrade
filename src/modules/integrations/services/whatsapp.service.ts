import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  message: {
    type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
    content: any;
  };
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  provider: string;
  providerMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  createdAt: Date;
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTON';
    sub_type?: string;
    text?: string;
    example?: any;
  }>;
}

interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
  verified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface WhatsAppConversation {
  id: string;
  customerPhone: string;
  customerName?: string;
  status: 'active' | 'resolved' | 'closed';
  messages: number;
  lastMessageAt: Date;
  assignedTo?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async sendMessage(instanceId: string, message: {
    to: string;
    message: {
      type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
      content: any;
    };
  }): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      // Validate phone number (WhatsApp format)
      const phoneNumber = this.formatWhatsAppPhone(message.to);
      if (!phoneNumber) {
        throw new Error('Invalid WhatsApp phone number format');
      }

      // Check if contact exists
      await this.ensureContactExists(phoneNumber);

      // Send message
      const result = await this.sendMessageViaWhatsApp(instance, {
        to: phoneNumber,
        message: message.message
      });

      if (result.success) {
        await this.saveWhatsAppMessage({
          id: result.messageId,
          from: instance.config.phoneNumberId,
          to: phoneNumber,
          message: message.message,
          status: 'sent',
          provider: 'whatsapp',
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          createdAt: new Date()
        });
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to send WhatsApp message', error);
      return { success: false, error: error.message };
    }
  }

  async sendTemplateMessage(instanceId: string, templateData: {
    to: string;
    template: {
      name: string;
      language: string;
      components?: Array<{
        type: string;
        sub_type?: string;
        parameters?: Array<{
          type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
          text?: string;
          currency?: any;
          date_time?: any;
          image?: any;
          document?: any;
          video?: any;
        }>;
      }>;
    };
  }): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      const phoneNumber = this.formatWhatsAppPhone(templateData.to);
      if (!phoneNumber) {
        throw new Error('Invalid WhatsApp phone number format');
      }

      const result = await this.sendTemplateViaWhatsApp(instance, {
        to: phoneNumber,
        template: templateData.template
      });

      if (result.success) {
        await this.saveWhatsAppMessage({
          id: result.messageId,
          from: instance.config.phoneNumberId,
          to: phoneNumber,
          message: {
            type: 'template',
            content: templateData.template
          },
          status: 'sent',
          provider: 'whatsapp',
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          createdAt: new Date()
        });
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to send WhatsApp template', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkMessages(instanceId: string, messages: Array<{
    to: string;
    message: {
      type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'template';
      content: any;
    };
  }>): Promise<{
    success: boolean;
    results: Array<{
      phone: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const results = [];

      for (const message of messages) {
        try {
          const result = await this.sendMessage(instanceId, message);
          results.push({
            phone: message.to,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });

          // Add delay between messages to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          results.push({
            phone: message.to,
            success: false,
            error: error.message
          });
        }
      }

      return { success: true, results };

    } catch (error) {
      this.logger.error('Failed to send bulk WhatsApp messages', error);
      return { success: false, results: [], error: error.message };
    }
  }

  async createTemplate(instanceId: string, template: WhatsAppTemplate): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      const result = await this.createTemplateOnWhatsApp(instance, template);

      if (result.success) {
        await this.saveTemplateToLocal({
          ...template,
          id: result.templateId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to create WhatsApp template', error);
      return { success: false, error: error.message };
    }
  }

  async getTemplates(instanceId: string): Promise<Array<{
    name: string;
    language: string;
    category: string;
    status: string;
    components: any[];
  }>> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.getTemplatesFromWhatsApp(instance);
    } catch (error) {
      this.logger.error('Failed to get WhatsApp templates', error);
      return [];
    }
  }

  async getMessageHistory(instanceId: string, filters?: {
    phone?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<WhatsAppMessage[]> {
    try {
      let query = 'SELECT * FROM whatsapp_messages WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.phone) {
        query += ` AND "to" = $${paramIndex}`;
        params.push(filters.phone);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        message: JSON.parse(row.message || '{}'),
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        readAt: row.read_at,
        createdAt: row.created_at
      }));

    } catch (error) {
      this.logger.error('Failed to get WhatsApp message history', error);
      return [];
    }
  }

  async getConversations(filters?: {
    status?: string;
    assignedTo?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<WhatsAppConversation[]> {
    try {
      let query = 'SELECT * FROM whatsapp_conversations WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.assignedTo) {
        query += ` AND assigned_to = $${paramIndex}`;
        params.push(filters.assignedTo);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      query += ' ORDER BY last_message_at DESC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get WhatsApp conversations', error);
      return [];
    }
  }

  async updateConversation(instanceId: string, conversationId: string, updateData: {
    status?: string;
    assignedTo?: string;
    tags?: string[];
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.execute(`
        UPDATE whatsapp_conversations SET
          ${updateData.status ? 'status = $1,' : ''}
          ${updateData.assignedTo ? 'assigned_to = $2,' : ''}
          ${updateData.tags ? 'tags = $3,' : ''}
          updated_at = $4
        WHERE id = $5
      `, [
        updateData.status,
        updateData.assignedTo,
        updateData.tags ? JSON.stringify(updateData.tags) : undefined,
        new Date(),
        conversationId
      ]);

      return { success: true };

    } catch (error) {
      this.logger.error('Failed to update conversation', error);
      return { success: false, error: error.message };
    }
  }

  async getWhatsAppAnalytics(instanceId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalMessages: number;
    totalDelivered: number;
    totalRead: number;
    responseRate: number;
    averageResponseTime: number;
    activeConversations: number;
    byMessageType: Record<string, number>;
  }> {
    try {
      const result = await this.db.execute(`
        SELECT
          COUNT(*) as total_messages,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as total_read,
          message_type,
          COUNT(DISTINCT customer_phone) as active_conversations
        FROM whatsapp_messages
        WHERE created_at >= $1
        GROUP BY message_type
      `, [this.getPeriodStartDate(period)]);

      const stats = {
        totalMessages: 0,
        totalDelivered: 0,
        totalRead: 0,
        responseRate: 0,
        averageResponseTime: 0,
        activeConversations: 0,
        byMessageType: {} as Record<string, number>
      };

      for (const row of result.rows) {
        stats.totalMessages += parseInt(row.total_messages);
        stats.totalDelivered += parseInt(row.total_delivered);
        stats.totalRead += parseInt(row.total_read);
        stats.activeConversations = parseInt(row.active_conversations);

        if (row.message_type) {
          stats.byMessageType[row.message_type] = (stats.byMessageType[row.message_type] || 0) + parseInt(row.total_messages);
        }
      }

      stats.responseRate = stats.totalDelivered > 0 ? (stats.totalRead / stats.totalDelivered) * 100 : 0;

      // Calculate average response time (mock for demo)
      stats.averageResponseTime = Math.floor(Math.random() * 300) + 60; // 1-5 minutes

      return stats;

    } catch (error) {
      this.logger.error('Failed to get WhatsApp analytics', error);
      return {
        totalMessages: 0,
        totalDelivered: 0,
        totalRead: 0,
        responseRate: 0,
        averageResponseTime: 0,
        activeConversations: 0,
        byMessageType: {}
      };
    }
  }

  async processWebhook(instanceId: string, webhookData: any): Promise<void> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      switch (webhookData.entry?.[0]?.changes?.[0]?.field) {
        case 'messages':
          await this.processIncomingMessage(instance, webhookData);
          break;
        case 'message_template_status_update':
          await this.processTemplateStatusUpdate(instance, webhookData);
          break;
        case 'message_reactions':
          await this.processMessageReaction(instance, webhookData);
          break;
      }

    } catch (error) {
      this.logger.error('Failed to process WhatsApp webhook', error);
    }
  }

  async updateMessageStatus(providerMessageId: string, status: string): Promise<void> {
    try {
      await this.db.execute(`
        UPDATE whatsapp_messages SET
          status = $1,
          ${status === 'delivered' ? 'delivered_at = $2,' : ''}
          ${status === 'read' ? 'read_at = $2,' : ''}
          updated_at = $2
        WHERE provider_message_id = $3
      `, [status, new Date(), providerMessageId]);

    } catch (error) {
      this.logger.error('Failed to update message status', error);
    }
  }

  private async getIntegrationInstance(instanceId: string): Promise<any> {
    const result = await this.db.execute(
      'SELECT * FROM integration_instances WHERE id = $1',
      [instanceId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Integration instance not found: ${instanceId}`);
    }

    return {
      ...result.rows[0],
      config: JSON.parse(result.rows[0].config || '{}'),
      credentials: JSON.parse(result.rows[0].credentials || '{}')
    };
  }

  private async sendMessageViaWhatsApp(instance: any, message: any): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    error?: string;
  }> {
    const messageId = `wa-${Date.now()}`;

    try {
      const response = await this.makeApiCall(
        instance,
        'POST',
        `/${instance.config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.to,
          type: message.message.type,
          [message.message.type]: this.formatMessageContent(message.message)
        }
      );

      return {
        success: true,
        messageId,
        providerMessageId: response.data?.messages?.[0]?.id
      };

    } catch (error) {
      return { success: false, messageId, error: error.message };
    }
  }

  private async sendTemplateViaWhatsApp(instance: any, templateData: any): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    error?: string;
  }> {
    const messageId = `wa-template-${Date.now()}`;

    try {
      const response = await this.makeApiCall(
        instance,
        'POST',
        `/${instance.config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: templateData.to,
          type: 'template',
          template: {
            name: templateData.template.name,
            language: {
              code: templateData.template.language
            },
            components: templateData.template.components
          }
        }
      );

      return {
        success: true,
        messageId,
        providerMessageId: response.data?.messages?.[0]?.id
      };

    } catch (error) {
      return { success: false, messageId, error: error.message };
    }
  }

  private async createTemplateOnWhatsApp(instance: any, template: WhatsAppTemplate): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      `/${instance.config.businessAccountId}/message_templates`,
      {
        name: template.name,
        language: template.language,
        category: template.category,
        components: template.components
      }
    );

    return {
      success: true,
      templateId: response.data?.id
    };
  }

  private async getTemplatesFromWhatsApp(instance: any): Promise<Array<{
    name: string;
    language: string;
    category: string;
    status: string;
    components: any[];
  }>> {
    const response = await this.makeApiCall(
      instance,
      'GET',
      `/${instance.config.businessAccountId}/message_templates`
    );

    return response.data?.data || [];
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    let url = `${this.baseUrl}${path}`;

    // Replace path variables
    if (path.includes('{phoneNumberId}')) {
      url = url.replace('{phoneNumberId}', instance.config.phoneNumberId);
    }
    if (path.includes('{businessAccountId}')) {
      url = url.replace('{businessAccountId}', instance.config.businessAccountId);
    }

    const headers = {
      'Authorization': `Bearer ${instance.credentials.accessToken}`,
      'Content-Type': 'application/json'
    };

    this.logger.log(`Making WhatsApp API call: ${method} ${url}`);

    // Mock API response
    return {
      success: true,
      data: {
        messages: [{ id: `wa-${Date.now()}` }],
        id: `template-${Date.now()}`,
        data: []
      }
    };
  }

  private formatWhatsAppPhone(phone: string): string | null {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // WhatsApp format: country code + number (no leading zero)
    if (cleaned.length === 10) {
      return `90${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `90${cleaned.substring(1)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('90')) {
      return cleaned;
    }

    return null;
  }

  private formatMessageContent(message: any): any {
    switch (message.type) {
      case 'text':
        return { body: message.content.text };
      case 'image':
        return {
          image: {
            link: message.content.url,
            caption: message.content.caption
          }
        };
      case 'document':
        return {
          document: {
            link: message.content.url,
            caption: message.content.caption,
            filename: message.content.filename
          }
        };
      case 'template':
        return {
          name: message.content.name,
          language: { code: message.content.language },
          components: message.content.components
        };
      default:
        return { body: JSON.stringify(message.content) };
    }
  }

  private async ensureContactExists(phone: string): Promise<void> {
    const result = await this.db.execute(
      'SELECT * FROM whatsapp_contacts WHERE wa_id = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      await this.db.execute(`
        INSERT INTO whatsapp_contacts (wa_id, verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4)
      `, [phone, false, new Date(), new Date()]);
    }
  }

  private async saveWhatsAppMessage(message: WhatsAppMessage): Promise<void> {
    await this.db.execute(`
      INSERT INTO whatsapp_messages (id, from, to, message, status, provider, provider_message_id, sent_at, delivered_at, read_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      message.id,
      message.from,
      message.to,
      JSON.stringify(message.message),
      message.status,
      message.provider,
      message.providerMessageId,
      message.sentAt,
      message.deliveredAt,
      message.readAt,
      message.createdAt
    ]);

    // Update or create conversation
    await this.upsertConversation(message.to);
  }

  private async saveTemplateToLocal(template: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO whatsapp_templates (id, name, language, category, components, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      template.id,
      template.name,
      template.language,
      template.category,
      JSON.stringify(template.components),
      template.status,
      template.createdAt,
      template.updatedAt
    ]);
  }

  private async upsertConversation(customerPhone: string): Promise<void> {
    const result = await this.db.execute(`
      SELECT * FROM whatsapp_conversations WHERE customer_phone = $1
    `, [customerPhone]);

    if (result.rows.length === 0) {
      // Create new conversation
      await this.db.execute(`
        INSERT INTO whatsapp_conversations (id, customer_phone, status, messages, last_message_at, tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        `conv-${Date.now()}`,
        customerPhone,
        'active',
        1,
        new Date(),
        JSON.stringify([]),
        new Date(),
        new Date()
      ]);
    } else {
      // Update existing conversation
      await this.db.execute(`
        UPDATE whatsapp_conversations SET
          messages = messages + 1,
          last_message_at = $1,
          updated_at = $2
        WHERE customer_phone = $3
      `, [new Date(), new Date(), customerPhone]);
    }
  }

  private async processIncomingMessage(instance: any, webhookData: any): Promise<void> {
    const change = webhookData.entry[0].changes[0];
    const message = change.value.messages?.[0];

    if (message) {
      await this.saveWhatsAppMessage({
        id: `incoming-${Date.now()}`,
        from: message.from,
        to: instance.config.phoneNumberId,
        message: {
          type: message.type || 'text',
          content: message.text?.body || message
        },
        status: 'delivered',
        provider: 'whatsapp',
        providerMessageId: message.id,
        deliveredAt: new Date(),
        createdAt: new Date()
      });

      // Update conversation
      await this.upsertConversation(message.from);
    }
  }

  private async processTemplateStatusUpdate(instance: any, webhookData: any): Promise<void> {
    const change = webhookData.entry[0].changes[0];
    const statusUpdate = change.value.message_template_status_update;

    if (statusUpdate) {
      await this.db.execute(`
        UPDATE whatsapp_templates SET
          status = $1,
          updated_at = $2
        WHERE id = $3
      `, [statusUpdate.status, new Date(), statusUpdate.id]);
    }
  }

  private async processMessageReaction(instance: any, webhookData: any): Promise<void> {
    // Handle message reactions (like emoji responses)
    const change = webhookData.entry[0].changes[0];
    const reaction = change.value.messages?.[0]?.reaction;

    if (reaction) {
      this.logger.log(`WhatsApp reaction received: ${reaction.emoji} for message ${reaction.message_id}`);
    }
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        now.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        now.setDate(now.getDate() - dayOfWeek);
        now.setHours(0, 0, 0, 0);
        break;
      case 'month':
        now.setDate(1);
        now.setHours(0, 0, 0, 0);
        break;
    }
    return now;
  }
}
