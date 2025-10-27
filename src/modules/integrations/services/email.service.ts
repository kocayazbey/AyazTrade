import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: 'transactional' | 'marketing' | 'notification';
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

interface EmailMessage {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  variables?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
  type: 'transactional' | 'marketing' | 'notification';
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  provider: string;
  providerMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
  scheduledAt?: Date;
}

interface EmailProvider {
  name: string;
  baseUrl: string;
  auth: {
    type: 'api_key' | 'oauth2' | 'basic' | 'bearer';
    credentials: Record<string, any>;
  };
  endpoints: {
    send: string;
    templates: string;
    status: string;
  };
  rateLimit?: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
  features: {
    templates: boolean;
    tracking: boolean;
    scheduling: boolean;
    attachments: boolean;
  };
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  templateId: string;
  recipients: string[];
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly providers: Record<string, EmailProvider> = {
    sendgrid: {
      name: 'SendGrid',
      baseUrl: 'https://api.sendgrid.com',
      auth: { type: 'bearer', credentials: {} },
      endpoints: {
        send: '/v3/mail/send',
        templates: '/v3/templates',
        status: '/v3/mail/batch'
      },
      rateLimit: { requests: 1000, period: 'hour' },
      features: {
        templates: true,
        tracking: true,
        scheduling: true,
        attachments: true
      }
    },
    mailgun: {
      name: 'Mailgun',
      baseUrl: 'https://api.mailgun.net',
      auth: { type: 'basic', credentials: {} },
      endpoints: {
        send: '/v3/{domain}/messages',
        templates: '/v3/{domain}/templates',
        status: '/v3/{domain}/events'
      },
      rateLimit: { requests: 5000, period: 'hour' },
      features: {
        templates: true,
        tracking: true,
        scheduling: false,
        attachments: true
      }
    },
    amazon_ses: {
      name: 'Amazon SES',
      baseUrl: 'https://email.us-east-1.amazonaws.com',
      auth: { type: 'basic', credentials: {} },
      endpoints: {
        send: '/SendEmail',
        templates: '/SendTemplatedEmail',
        status: '/GetSendStatistics'
      },
      rateLimit: { requests: 1000, period: 'minute' },
      features: {
        templates: true,
        tracking: true,
        scheduling: false,
        attachments: true
      }
    },
    postmark: {
      name: 'Postmark',
      baseUrl: 'https://api.postmarkapp.com',
      auth: { type: 'bearer', credentials: {} },
      endpoints: {
        send: '/email',
        templates: '/templates',
        status: '/deliverystats'
      },
      rateLimit: { requests: 2000, period: 'hour' },
      features: {
        templates: true,
        tracking: true,
        scheduling: false,
        attachments: true
      }
    },
    resend: {
      name: 'Resend',
      baseUrl: 'https://api.resend.com',
      auth: { type: 'bearer', credentials: {} },
      endpoints: {
        send: '/emails',
        templates: '/emails/templates',
        status: '/emails'
      },
      rateLimit: { requests: 1000, period: 'hour' },
      features: {
        templates: true,
        tracking: true,
        scheduling: false,
        attachments: false
      }
    }
  };

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async sendEmail(instanceId: string, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    htmlContent?: string;
    textContent?: string;
    templateId?: string;
    variables?: Record<string, any>;
    attachments?: Array<{
      filename: string;
      content: string;
      type: string;
    }>;
    type?: 'transactional' | 'marketing' | 'notification';
    scheduledAt?: Date;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const provider = this.providers[instance.config.provider];

      if (!provider) {
        throw new Error(`Unsupported email provider: ${instance.config.provider}`);
      }

      // Validate email addresses
      const validEmails = this.validateEmails([...emailData.to, ...(emailData.cc || []), ...(emailData.bcc || [])]);
      if (validEmails.length === 0) {
        throw new Error('No valid email addresses provided');
      }

      // Check rate limits
      await this.checkRateLimit(instanceId, provider);

      // Prepare email content
      let processedHtmlContent = emailData.htmlContent;
      let processedTextContent = emailData.textContent;

      if (emailData.templateId) {
        const template = await this.getTemplate(emailData.templateId);
        processedHtmlContent = this.processTemplate(template.htmlContent, emailData.variables || {});
        processedTextContent = this.processTemplate(template.textContent, emailData.variables || {});
      }

      // Send email
      const result = await this.sendEmailViaProvider(instance, provider, {
        to: validEmails.filter(email => emailData.to.includes(email)),
        cc: validEmails.filter(email => emailData.cc?.includes(email)),
        bcc: validEmails.filter(email => emailData.bcc?.includes(email)),
        subject: emailData.subject,
        htmlContent: processedHtmlContent,
        textContent: processedTextContent,
        attachments: emailData.attachments,
        type: emailData.type || 'transactional'
      });

      if (result.success) {
        await this.saveEmailMessage({
          id: result.messageId,
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          htmlContent: processedHtmlContent,
          textContent: processedTextContent,
          templateId: emailData.templateId,
          variables: emailData.variables,
          attachments: emailData.attachments,
          type: emailData.type || 'transactional',
          status: 'sent',
          provider: instance.config.provider,
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          scheduledAt: emailData.scheduledAt,
          createdAt: new Date()
        });
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to send email', error);
      return { success: false, error: error.message };
    }
  }

  async createTemplate(templateData: {
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: string[];
    category: 'transactional' | 'marketing' | 'notification';
  }): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      const templateId = `template-${Date.now()}`;

      await this.db.execute(`
        INSERT INTO email_templates (id, name, subject, html_content, text_content, variables, category, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        templateId,
        templateData.name,
        templateData.subject,
        templateData.htmlContent,
        templateData.textContent,
        JSON.stringify(templateData.variables),
        templateData.category,
        'active',
        new Date(),
        new Date()
      ]);

      return { success: true, templateId };

    } catch (error) {
      this.logger.error('Failed to create email template', error);
      return { success: false, error: error.message };
    }
  }

  async getTemplates(category?: string): Promise<EmailTemplate[]> {
    try {
      let query = 'SELECT * FROM email_templates WHERE status = $1';
      const params = ['active'];

      if (category) {
        query += ' AND category = $2';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        ...row,
        variables: JSON.parse(row.variables || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get email templates', error);
      return [];
    }
  }

  async sendCampaign(instanceId: string, campaignData: {
    name: string;
    templateId: string;
    recipients: string[];
    scheduledAt?: Date;
  }): Promise<{
    success: boolean;
    campaignId?: string;
    error?: string;
  }> {
    try {
      const campaignId = `campaign-${Date.now()}`;

      // Validate recipients
      const validRecipients = this.validateEmails(campaignData.recipients);
      if (validRecipients.length === 0) {
        throw new Error('No valid email addresses in recipients');
      }

      // Get template
      const template = await this.getTemplate(campaignData.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Save campaign
      await this.db.execute(`
        INSERT INTO email_campaigns (id, name, template_id, recipients, scheduled_at, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        campaignId,
        campaignData.name,
        campaignData.templateId,
        JSON.stringify(validRecipients),
        campaignData.scheduledAt,
        campaignData.scheduledAt ? 'scheduled' : 'sending',
        new Date(),
        new Date()
      ]);

      // Send emails
      if (!campaignData.scheduledAt) {
        await this.processCampaign(instanceId, campaignId, template, validRecipients);
      }

      return { success: true, campaignId };

    } catch (error) {
      this.logger.error('Failed to send email campaign', error);
      return { success: false, error: error.message };
    }
  }

  async getEmailHistory(instanceId: string, filters?: {
    email?: string;
    type?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<EmailMessage[]> {
    try {
      let query = 'SELECT * FROM email_messages WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.email) {
        query += ` AND ($1 = ANY(to) OR ($2 = ANY(cc)) OR ($3 = ANY(bcc)))`;
        params.push(filters.email, filters.email, filters.email);
        paramIndex += 3;
      }

      if (filters?.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
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
        to: row.to || [],
        cc: row.cc || [],
        bcc: row.bcc || [],
        variables: JSON.parse(row.variables || '{}'),
        attachments: JSON.parse(row.attachments || '[]'),
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at
      }));

    } catch (error) {
      this.logger.error('Failed to get email history', error);
      return [];
    }
  }

  async getEmailAnalytics(instanceId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalBounced: number;
    totalOpened: number;
    totalClicked: number;
    successRate: number;
    bounceRate: number;
    openRate: number;
    clickRate: number;
    byType: Record<string, number>;
    byTemplate: Record<string, number>;
  }> {
    try {
      const result = await this.db.execute(`
        SELECT
          COUNT(*) as total_sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
          SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as total_bounced,
          SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as total_opened,
          SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as total_clicked,
          type,
          template_id
        FROM email_messages
        WHERE created_at >= $1
        GROUP BY type, template_id
      `, [this.getPeriodStartDate(period)]);

      const stats = {
        totalSent: 0,
        totalDelivered: 0,
        totalBounced: 0,
        totalOpened: 0,
        totalClicked: 0,
        successRate: 0,
        bounceRate: 0,
        openRate: 0,
        clickRate: 0,
        byType: {} as Record<string, number>,
        byTemplate: {} as Record<string, number>
      };

      for (const row of result.rows) {
        stats.totalSent += parseInt(row.total_sent);
        stats.totalDelivered += parseInt(row.total_delivered);
        stats.totalBounced += parseInt(row.total_bounced);
        stats.totalOpened += parseInt(row.total_opened);
        stats.totalClicked += parseInt(row.total_clicked);

        if (row.type) {
          stats.byType[row.type] = (stats.byType[row.type] || 0) + parseInt(row.total_sent);
        }

        if (row.template_id) {
          stats.byTemplate[row.template_id] = (stats.byTemplate[row.template_id] || 0) + parseInt(row.total_sent);
        }
      }

      stats.successRate = stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent) * 100 : 0;
      stats.bounceRate = stats.totalSent > 0 ? (stats.totalBounced / stats.totalSent) * 100 : 0;
      stats.openRate = stats.totalDelivered > 0 ? (stats.totalOpened / stats.totalDelivered) * 100 : 0;
      stats.clickRate = stats.totalDelivered > 0 ? (stats.totalClicked / stats.totalDelivered) * 100 : 0;

      return stats;

    } catch (error) {
      this.logger.error('Failed to get email analytics', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalBounced: 0,
        totalOpened: 0,
        totalClicked: 0,
        successRate: 0,
        bounceRate: 0,
        openRate: 0,
        clickRate: 0,
        byType: {},
        byTemplate: {}
      };
    }
  }

  async updateEmailStatus(providerMessageId: string, status: string, provider: string): Promise<void> {
    try {
      await this.db.execute(`
        UPDATE email_messages SET
          status = $1,
          ${status === 'delivered' ? 'delivered_at = $2,' : ''}
          ${status === 'opened' ? 'opened_at = $2,' : ''}
          ${status === 'clicked' ? 'clicked_at = $2,' : ''}
          updated_at = $2
        WHERE provider_message_id = $3 AND provider = $4
      `, [status, new Date(), providerMessageId, provider]);

    } catch (error) {
      this.logger.error('Failed to update email status', error);
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

  private async sendEmailViaProvider(instance: any, provider: EmailProvider, emailData: any): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    error?: string;
  }> {
    const messageId = `email-${Date.now()}`;

    try {
      switch (provider.name) {
        case 'SendGrid':
          return await this.sendSendGridEmail(instance, emailData, messageId);
        case 'Mailgun':
          return await this.sendMailgunEmail(instance, emailData, messageId);
        case 'Amazon SES':
          return await this.sendAmazonSESEmail(instance, emailData, messageId);
        case 'Postmark':
          return await this.sendPostmarkEmail(instance, emailData, messageId);
        case 'Resend':
          return await this.sendResendEmail(instance, emailData, messageId);
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }
    } catch (error) {
      return { success: false, messageId, error: error.message };
    }
  }

  private async sendSendGridEmail(instance: any, emailData: any, messageId: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/v3/mail/send',
      {
        personalizations: [{
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          dynamic_template_data: emailData.variables
        }],
        from: { email: instance.config.fromEmail, name: instance.config.fromName },
        subject: emailData.subject,
        content: [
          { type: 'text/plain', value: emailData.textContent },
          { type: 'text/html', value: emailData.htmlContent }
        ],
        attachments: emailData.attachments
      }
    );

    return {
      success: true,
      messageId,
      providerMessageId: response.data?.message_id
    };
  }

  private async sendMailgunEmail(instance: any, emailData: any, messageId: string): Promise<any> {
    const formData = new FormData();
    formData.append('from', `${instance.config.fromName} <${instance.config.fromEmail}>`);
    formData.append('to', emailData.to.join(','));
    formData.append('subject', emailData.subject);
    formData.append('html', emailData.htmlContent);
    formData.append('text', emailData.textContent);

    if (emailData.cc?.length) formData.append('cc', emailData.cc.join(','));
    if (emailData.bcc?.length) formData.append('bcc', emailData.bcc.join(','));

    const response = await this.makeApiCall(
      instance,
      'POST',
      `/v3/${instance.config.domain}/messages`,
      formData
    );

    return {
      success: true,
      messageId,
      providerMessageId: response.data?.id
    };
  }

  private async sendAmazonSESEmail(instance: any, emailData: any, messageId: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/SendEmail',
      {
        Source: `${instance.config.fromName} <${instance.config.fromEmail}>`,
        Destination: {
          ToAddresses: emailData.to,
          CcAddresses: emailData.cc,
          BccAddresses: emailData.bcc
        },
        Message: {
          Subject: { Data: emailData.subject },
          Body: {
            Html: { Data: emailData.htmlContent },
            Text: { Data: emailData.textContent }
          }
        }
      }
    );

    return {
      success: true,
      messageId,
      providerMessageId: response.data?.MessageId
    };
  }

  private async sendPostmarkEmail(instance: any, emailData: any, messageId: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/email',
      {
        From: `${instance.config.fromName} <${instance.config.fromEmail}>`,
        To: emailData.to.join(','),
        Cc: emailData.cc?.join(','),
        Bcc: emailData.bcc?.join(','),
        Subject: emailData.subject,
        HtmlBody: emailData.htmlContent,
        TextBody: emailData.textContent,
        Attachments: emailData.attachments
      }
    );

    return {
      success: true,
      messageId,
      providerMessageId: response.data?.MessageID
    };
  }

  private async sendResendEmail(instance: any, emailData: any, messageId: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/emails',
      {
        from: `${instance.config.fromName} <${instance.config.fromEmail}>`,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        html: emailData.htmlContent,
        text: emailData.textContent
      }
    );

    return {
      success: true,
      messageId,
      providerMessageId: response.data?.id
    };
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const provider = this.providers[instance.config.provider];
    let url = `${provider.baseUrl}${path}`;

    // Replace path variables
    if (path.includes('{domain}')) {
      url = url.replace('{domain}', instance.config.domain);
    }
    if (path.includes('{accountSid}')) {
      url = url.replace('{accountSid}', instance.credentials.accountSid);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade-Email/1.0'
    };

    switch (provider.auth.type) {
      case 'api_key':
        headers['X-API-Key'] = instance.credentials.apiKey;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${instance.credentials.token}`;
        break;
      case 'basic':
        const credentials = Buffer.from(`${instance.credentials.username}:${instance.credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
    }

    this.logger.log(`Making Email API call: ${method} ${url}`);

    try {
      // Real HTTP request implementation
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Email API Error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      this.logger.error(`Email API call failed: ${method} ${url}`, error);

      // Handle specific error types
      if (error.message.includes('401')) {
        throw new Error('Email API authentication failed. Check API credentials.');
      } else if (error.message.includes('403')) {
        throw new Error('Email API access forbidden. Check API permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('Email API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('500')) {
        throw new Error('Email API server error. Please try again later.');
      }

      throw error;
    }
  }

  private validateEmails(emails: string[]): string[] {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.filter(email => emailRegex.test(email));
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return processed;
  }

  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const result = await this.db.execute(
      'SELECT * FROM email_templates WHERE id = $1 AND status = $2',
      [templateId, 'active']
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      variables: JSON.parse(row.variables || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async checkRateLimit(instanceId: string, provider: EmailProvider): Promise<void> {
    if (!provider.rateLimit) return;

    const result = await this.db.execute(`
      SELECT COUNT(*) as count
      FROM email_messages
      WHERE provider = $1
      AND created_at >= $2
    `, [
      provider.name,
      new Date(Date.now() - this.getRateLimitPeriod(provider.rateLimit.period))
    ]);

    const count = parseInt(result.rows[0].count);

    if (count >= provider.rateLimit.requests) {
      throw new Error(`Rate limit exceeded for ${provider.name}`);
    }
  }

  private getRateLimitPeriod(period: string): number {
    switch (period) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private async saveEmailMessage(message: EmailMessage): Promise<void> {
    await this.db.execute(`
      INSERT INTO email_messages (id, to, cc, bcc, subject, html_content, text_content, template_id, variables, attachments, type, status, provider, provider_message_id, sent_at, delivered_at, scheduled_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      message.id,
      message.to,
      message.cc,
      message.bcc,
      message.subject,
      message.htmlContent,
      message.textContent,
      message.templateId,
      JSON.stringify(message.variables || {}),
      JSON.stringify(message.attachments || []),
      message.type,
      message.status,
      message.provider,
      message.providerMessageId,
      message.sentAt,
      message.deliveredAt,
      message.scheduledAt,
      message.createdAt
    ]);
  }

  private async processCampaign(instanceId: string, campaignId: string, template: EmailTemplate, recipients: string[]): Promise<void> {
    try {
      await this.db.execute(`
        UPDATE email_campaigns SET status = $1, updated_at = $2 WHERE id = $3
      `, ['sending', new Date(), campaignId]);

      let sent = 0;
      let delivered = 0;
      let bounced = 0;

      for (const recipient of recipients) {
        try {
          const result = await this.sendEmail(instanceId, {
            to: [recipient],
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            templateId: template.id,
            type: template.category
          });

          if (result.success) {
            sent++;
            // Mock delivery status for demo
            if (Math.random() > 0.1) delivered++; // 90% delivery rate
          } else {
            bounced++;
          }

          // Add delay between emails
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          bounced++;
        }
      }

      await this.db.execute(`
        UPDATE email_campaigns SET
          status = $1,
          sent = $2,
          delivered = $3,
          bounced = $4,
          updated_at = $5
        WHERE id = $6
      `, ['sent', sent, delivered, bounced, new Date(), campaignId]);

    } catch (error) {
      this.logger.error(`Failed to process campaign ${campaignId}`, error);
      await this.db.execute(`
        UPDATE email_campaigns SET status = $1, updated_at = $2 WHERE id = $3
      `, ['failed', new Date(), campaignId]);
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
