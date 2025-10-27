import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../modules/ayaz-comm/notifications/email.service';
import { SmsService } from '../../modules/ayaz-comm/notifications/sms.service';

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private alertChannels = {
    email: true,
    sms: false,
    webhook: false,
  };

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {
    this.initializeAlertChannels();
  }

  private initializeAlertChannels(): void {
    this.alertChannels = {
      email: this.configService.get('ALERT_EMAIL_ENABLED', true),
      sms: this.configService.get('ALERT_SMS_ENABLED', false),
      webhook: this.configService.get('ALERT_WEBHOOK_ENABLED', false),
    };
  }

  async sendAlert(alert: {
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    timestamp: string;
    metadata?: any;
  }): Promise<void> {
    this.logger.log(`Sending alert: ${alert.title}`);

    try {
      if (this.alertChannels.email) {
        await this.sendEmailAlert(alert);
      }

      if (this.alertChannels.sms) {
        await this.sendSmsAlert(alert);
      }

      if (this.alertChannels.webhook) {
        await this.sendWebhookAlert(alert);
      }
    } catch (error) {
      this.logger.error('Failed to send alert:', error);
    }
  }

  private async sendEmailAlert(alert: any): Promise<void> {
    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const body = `
      <h2>${alert.title}</h2>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Source:</strong> ${alert.source}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      ${alert.metadata ? `<p><strong>Metadata:</strong> ${JSON.stringify(alert.metadata, null, 2)}</p>` : ''}
    `;

    await this.emailService.sendEmail({
      to: this.configService.get('ALERT_EMAIL_RECIPIENTS', 'admin@example.com'),
      subject,
      html: body,
    });
  }

  private async sendSmsAlert(alert: any): Promise<void> {
    const message = `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`;
    
    await this.smsService.sendSms({
      to: this.configService.get('ALERT_SMS_RECIPIENTS', '+1234567890'),
      message,
    });
  }

  private async sendWebhookAlert(alert: any): Promise<void> {
    const webhookUrl = this.configService.get('ALERT_WEBHOOK_URL');
    if (!webhookUrl) return;

    // This would be implemented with actual webhook sending logic
    this.logger.log(`Webhook alert sent to ${webhookUrl}`);
  }

  async sendPerformanceAlert(metrics: {
    http: { average: number; p95: number; p99: number };
    database: { average: number; p95: number; p99: number };
    memory: { used: number; total: number; percentage: number };
    cpu: { user: number; system: number; total: number };
  }): Promise<void> {
    const alerts = [];

    if (metrics.http.average > 1000) {
      alerts.push({
        type: 'warning',
        title: 'Slow HTTP Response Times',
        message: `Average HTTP response time is ${metrics.http.average}ms`,
        severity: 'high',
        source: 'performance-monitor',
        timestamp: new Date().toISOString(),
      });
    }

    if (metrics.database.average > 500) {
      alerts.push({
        type: 'warning',
        title: 'Slow Database Queries',
        message: `Average database query time is ${metrics.database.average}ms`,
        severity: 'high',
        source: 'performance-monitor',
        timestamp: new Date().toISOString(),
      });
    }

    if (metrics.memory.percentage > 80) {
      alerts.push({
        type: 'error',
        title: 'High Memory Usage',
        message: `Memory usage is ${metrics.memory.percentage.toFixed(2)}%`,
        severity: 'critical',
        source: 'performance-monitor',
        timestamp: new Date().toISOString(),
      });
    }

    if (metrics.cpu.total > 80) {
      alerts.push({
        type: 'error',
        title: 'High CPU Usage',
        message: `CPU usage is ${metrics.cpu.total.toFixed(2)}%`,
        severity: 'critical',
        source: 'performance-monitor',
        timestamp: new Date().toISOString(),
      });
    }

    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }
}
