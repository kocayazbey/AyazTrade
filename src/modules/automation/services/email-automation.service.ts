import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';
import { EventBusService } from '../../../core/events/event-bus.service';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  type: 'transactional' | 'marketing' | 'notification';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

interface EmailTrigger {
  id: string;
  name: string;
  event: string;
  conditions: Record<string, any>;
  templateId: string;
  delay: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  recipientList: string[];
  scheduledAt: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sentCount: number;
  failedCount: number;
  createdAt: Date;
}

interface EmailPersonalization {
  recipientId: string;
  variables: Record<string, any>;
  preferences: {
    language: string;
    timezone: string;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

@Injectable()
export class EmailAutomationService {
  private readonly logger = new Logger(EmailAutomationService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
    private readonly eventBus: EventBusService,
  ) {}

  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const templateId = `template-${Date.now()}`;
    
    const newTemplate: EmailTemplate = {
      id: templateId,
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveEmailTemplate(newTemplate);
    
    this.logger.log(`Created email template: ${templateId}`);
    return newTemplate;
  }

  async getEmailTemplates(type?: string): Promise<EmailTemplate[]> {
    const result = await this.db.execute(`
      SELECT * FROM email_templates
      ${type ? 'WHERE type = $1' : ''}
      ORDER BY created_at DESC
    `, type ? [type] : []);
    
    return result.rows;
  }

  async updateEmailTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const existing = await this.getEmailTemplate(templateId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveEmailTemplate(updated);
    
    this.logger.log(`Updated email template: ${templateId}`);
    return updated;
  }

  async deleteEmailTemplate(templateId: string): Promise<void> {
    await this.db.execute(`
      DELETE FROM email_templates WHERE id = $1
    `, [templateId]);
    
    this.logger.log(`Deleted email template: ${templateId}`);
  }

  async createEmailTrigger(trigger: Omit<EmailTrigger, 'id' | 'createdAt'>): Promise<EmailTrigger> {
    const triggerId = `trigger-${Date.now()}`;
    
    const newTrigger: EmailTrigger = {
      id: triggerId,
      ...trigger,
      createdAt: new Date()
    };

    await this.saveEmailTrigger(newTrigger);
    
    this.logger.log(`Created email trigger: ${triggerId}`);
    return newTrigger;
  }

  async getEmailTriggers(): Promise<EmailTrigger[]> {
    const result = await this.db.execute(`
      SELECT * FROM email_triggers
      ORDER BY created_at DESC
    `);
    
    return result.rows;
  }

  async executeEmailTrigger(event: string, data: any): Promise<void> {
    const triggers = await this.getActiveTriggersByEvent(event);
    
    for (const trigger of triggers) {
      if (this.evaluateConditions(trigger.conditions, data)) {
        await this.processEmailTrigger(trigger, data);
      }
    }
  }

  async createEmailCampaign(campaign: Omit<EmailCampaign, 'id' | 'createdAt' | 'sentCount' | 'failedCount'>): Promise<EmailCampaign> {
    const campaignId = `campaign-${Date.now()}`;
    
    const newCampaign: EmailCampaign = {
      id: campaignId,
      ...campaign,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date()
    };

    await this.saveEmailCampaign(newCampaign);
    
    this.logger.log(`Created email campaign: ${campaignId}`);
    return newCampaign;
  }

  async sendEmailCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getEmailCampaign(campaignId);
    const template = await this.getEmailTemplate(campaign.templateId);
    
    campaign.status = 'sending';
    await this.updateEmailCampaign(campaign);
    
    try {
      for (const recipient of campaign.recipientList) {
        await this.sendPersonalizedEmail(recipient, template, {});
        campaign.sentCount++;
      }
      
      campaign.status = 'sent';
      this.logger.log(`Campaign sent successfully: ${campaignId}`);
    } catch (error) {
      campaign.status = 'failed';
      campaign.failedCount++;
      this.logger.error(`Campaign failed: ${campaignId}`, error);
    } finally {
      await this.updateEmailCampaign(campaign);
    }
  }

  async scheduleEmailCampaign(campaignId: string, scheduledAt: Date): Promise<void> {
    const campaign = await this.getEmailCampaign(campaignId);
    campaign.scheduledAt = scheduledAt;
    campaign.status = 'scheduled';
    
    await this.updateEmailCampaign(campaign);
    
    // Schedule the campaign execution
    await this.scheduleCampaignExecution(campaignId, scheduledAt);
    
    this.logger.log(`Campaign scheduled: ${campaignId} for ${scheduledAt}`);
  }

  async getEmailAnalytics(campaignId?: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
        SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as total_opened,
        SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as total_clicked,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as total_bounced
      FROM email_logs
      ${campaignId ? 'WHERE campaign_id = $1' : ''}
    `, campaignId ? [campaignId] : []);
    
    const stats = result.rows[0];
    const totalSent = parseInt(stats.total_sent) || 0;
    const totalDelivered = parseInt(stats.total_delivered) || 0;
    const totalOpened = parseInt(stats.total_opened) || 0;
    const totalClicked = parseInt(stats.total_clicked) || 0;
    const totalBounced = parseInt(stats.total_bounced) || 0;
    
    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0
    };
  }

  async personalizeEmail(recipientId: string, template: EmailTemplate, data: any): Promise<{
    subject: string;
    content: string;
  }> {
    const personalization = await this.getPersonalization(recipientId);
    
    let subject = template.subject;
    let content = template.content;
    
    // Replace variables in subject and content
    for (const variable of template.variables) {
      const value = this.getVariableValue(variable, data, personalization);
      const placeholder = `{{${variable}}}`;
      
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return { subject, content };
  }

  private async saveEmailTemplate(template: EmailTemplate): Promise<void> {
    await this.db.execute(`
      INSERT INTO email_templates (id, name, subject, content, variables, type, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        content = EXCLUDED.content,
        variables = EXCLUDED.variables,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      template.id,
      template.name,
      template.subject,
      template.content,
      JSON.stringify(template.variables),
      template.type,
      template.status,
      template.createdAt,
      template.updatedAt
    ]);
  }

  private async getEmailTemplate(templateId: string): Promise<EmailTemplate> {
    const result = await this.db.execute(`
      SELECT * FROM email_templates WHERE id = $1
    `, [templateId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Email template not found: ${templateId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      variables: JSON.parse(row.variables || '[]')
    };
  }

  private async saveEmailTrigger(trigger: EmailTrigger): Promise<void> {
    await this.db.execute(`
      INSERT INTO email_triggers (id, name, event, conditions, template_id, delay, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      trigger.id,
      trigger.name,
      trigger.event,
      JSON.stringify(trigger.conditions),
      trigger.templateId,
      trigger.delay,
      trigger.status,
      trigger.createdAt
    ]);
  }

  private async getActiveTriggersByEvent(event: string): Promise<EmailTrigger[]> {
    const result = await this.db.execute(`
      SELECT * FROM email_triggers
      WHERE event = $1 AND status = 'active'
    `, [event]);
    
    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions || '{}')
    }));
  }

  private evaluateConditions(conditions: Record<string, any>, data: any): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (data[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private async processEmailTrigger(trigger: EmailTrigger, data: any): Promise<void> {
    const template = await this.getEmailTemplate(trigger.templateId);
    
    // Apply delay if specified
    if (trigger.delay > 0) {
      setTimeout(async () => {
        await this.sendTriggeredEmail(trigger, template, data);
      }, trigger.delay * 1000);
    } else {
      await this.sendTriggeredEmail(trigger, template, data);
    }
  }

  private async sendTriggeredEmail(trigger: EmailTrigger, template: EmailTemplate, data: any): Promise<void> {
    const recipient = data.recipient || data.email;
    if (!recipient) {
      this.logger.warn(`No recipient found for trigger: ${trigger.id}`);
      return;
    }
    
    const personalized = await this.personalizeEmail(recipient, template, data);
    
    await this.sendEmail({
      to: recipient,
      subject: personalized.subject,
      content: personalized.content,
      templateId: template.id,
      triggerId: trigger.id
    });
  }

  private async sendPersonalizedEmail(recipient: string, template: EmailTemplate, data: any): Promise<void> {
    const personalized = await this.personalizeEmail(recipient, template, data);
    
    await this.sendEmail({
      to: recipient,
      subject: personalized.subject,
      content: personalized.content,
      templateId: template.id
    });
  }

  private async sendEmail(email: {
    to: string;
    subject: string;
    content: string;
    templateId?: string;
    triggerId?: string;
  }): Promise<void> {
    // Mock email sending - in real implementation, use SendGrid or similar
    this.logger.log(`Sending email to ${email.to}: ${email.subject}`);
    
    // Log email in database
    await this.db.execute(`
      INSERT INTO email_logs (recipient, subject, content, template_id, trigger_id, status, sent_at)
      VALUES ($1, $2, $3, $4, $5, 'sent', NOW())
    `, [
      email.to,
      email.subject,
      email.content,
      email.templateId,
      email.triggerId
    ]);
  }

  private async saveEmailCampaign(campaign: EmailCampaign): Promise<void> {
    await this.db.execute(`
      INSERT INTO email_campaigns (id, name, template_id, recipient_list, scheduled_at, status, sent_count, failed_count, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      campaign.id,
      campaign.name,
      campaign.templateId,
      JSON.stringify(campaign.recipientList),
      campaign.scheduledAt,
      campaign.status,
      campaign.sentCount,
      campaign.failedCount,
      campaign.createdAt
    ]);
  }

  private async getEmailCampaign(campaignId: string): Promise<EmailCampaign> {
    const result = await this.db.execute(`
      SELECT * FROM email_campaigns WHERE id = $1
    `, [campaignId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Email campaign not found: ${campaignId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      recipientList: JSON.parse(row.recipient_list || '[]')
    };
  }

  private async updateEmailCampaign(campaign: EmailCampaign): Promise<void> {
    await this.db.execute(`
      UPDATE email_campaigns SET
        name = $2,
        template_id = $3,
        recipient_list = $4,
        scheduled_at = $5,
        status = $6,
        sent_count = $7,
        failed_count = $8
      WHERE id = $1
    `, [
      campaign.id,
      campaign.name,
      campaign.templateId,
      JSON.stringify(campaign.recipientList),
      campaign.scheduledAt,
      campaign.status,
      campaign.sentCount,
      campaign.failedCount
    ]);
  }

  private async scheduleCampaignExecution(campaignId: string, scheduledAt: Date): Promise<void> {
    // Mock scheduling - in real implementation, use a job scheduler
    this.logger.log(`Scheduling campaign ${campaignId} for ${scheduledAt}`);
  }

  private async getPersonalization(recipientId: string): Promise<EmailPersonalization> {
    // Mock personalization data
    return {
      recipientId,
      variables: {
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Corp'
      },
      preferences: {
        language: 'en',
        timezone: 'UTC',
        frequency: 'immediate'
      }
    };
  }

  private getVariableValue(variable: string, data: any, personalization: EmailPersonalization): string {
    // Check data first, then personalization, then default
    if (data[variable] !== undefined) {
      return String(data[variable]);
    }
    if (personalization.variables[variable] !== undefined) {
      return String(personalization.variables[variable]);
    }
    return `{{${variable}}}`;
  }
}
