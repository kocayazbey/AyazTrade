import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface SMSMessage {
  id: string;
  to: string;
  message: string;
  type: 'transactional' | 'otp' | 'notification' | 'marketing';
  sender?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  provider: string;
  providerMessageId?: string;
  cost?: number;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
}

interface SMSProvider {
  name: string;
  baseUrl: string;
  auth: {
    type: 'api_key' | 'basic' | 'bearer';
    credentials: Record<string, any>;
  };
  endpoints: {
    send: string;
    status: string;
    balance: string;
  };
  rateLimit?: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
}

interface OTPRequest {
  phone: string;
  purpose: 'login' | 'payment' | 'registration' | 'password_reset';
  length: number;
  expiryMinutes: number;
}

interface OTPCredentials {
  phone: string;
  otp: string;
  purpose: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: Date;
}

@Injectable()
export class SMSGatewayService {
  private readonly logger = new Logger(SMSGatewayService.name);

  private readonly providers: Record<string, SMSProvider> = {
    netgsm: {
      name: 'NetGSM',
      baseUrl: 'https://api.netgsm.com.tr',
      auth: { type: 'basic', credentials: {} },
      endpoints: {
        send: '/sms/send/get',
        status: '/sms/status',
        balance: '/credit'
      },
      rateLimit: { requests: 1000, period: 'hour' }
    },
    infobip: {
      name: 'Infobip',
      baseUrl: 'https://api.infobip.com',
      auth: { type: 'api_key', credentials: {} },
      endpoints: {
        send: '/sms/2/text/advanced',
        status: '/sms/1/reports',
        balance: '/account/1/balance'
      },
      rateLimit: { requests: 5000, period: 'hour' }
    },
    twilio: {
      name: 'Twilio',
      baseUrl: 'https://api.twilio.com',
      auth: { type: 'basic', credentials: {} },
      endpoints: {
        send: '/2010-04-01/Accounts/{accountSid}/Messages.json',
        status: '/2010-04-01/Accounts/{accountSid}/Messages/{messageSid}.json',
        balance: '/2010-04-01/Accounts/{accountSid}/Balance.json'
      },
      rateLimit: { requests: 1000, period: 'minute' }
    },
    mesaj: {
      name: 'Mesaj',
      baseUrl: 'https://api.mesaj.com.tr',
      auth: { type: 'api_key', credentials: {} },
      endpoints: {
        send: '/sms/send',
        status: '/sms/status',
        balance: '/balance'
      },
      rateLimit: { requests: 2000, period: 'hour' }
    }
  };

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async sendSMS(instanceId: string, message: {
    to: string;
    message: string;
    type: 'transactional' | 'otp' | 'notification' | 'marketing';
    sender?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const provider = this.providers[instance.config.provider];

      if (!provider) {
        throw new Error(`Unsupported SMS provider: ${instance.config.provider}`);
      }

      // Validate phone number
      const phoneNumber = this.formatPhoneNumber(message.to);
      if (!phoneNumber) {
        throw new Error('Invalid phone number format');
      }

      // Check rate limits
      await this.checkRateLimit(instanceId, provider);

      // Send SMS
      const result = await this.sendSMSViaProvider(instance, provider, {
        ...message,
        to: phoneNumber
      });

      if (result.success) {
        await this.saveSMSMessage({
          id: result.messageId,
          to: phoneNumber,
          message: message.message,
          type: message.type,
          sender: message.sender,
          status: 'sent',
          provider: instance.config.provider,
          providerMessageId: result.providerMessageId,
          cost: result.cost,
          sentAt: new Date(),
          createdAt: new Date()
        });

        // If it's an OTP, generate and save OTP
        if (message.type === 'otp') {
          await this.generateOTP(phoneNumber, 'verification');
        }
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to send SMS', error);
      return { success: false, error: error.message };
    }
  }

  async sendOTP(instanceId: string, request: OTPRequest): Promise<{
    success: boolean;
    otpId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      // Generate OTP
      const otp = this.generateOTPCode(request.length);
      const otpId = `otp-${Date.now()}`;

      // Save OTP credentials
      await this.saveOTPCredentials({
        phone: request.phone,
        otp,
        purpose: request.purpose,
        expiresAt: new Date(Date.now() + request.expiryMinutes * 60 * 1000),
        attempts: 0,
        maxAttempts: 3,
        verified: false,
        createdAt: new Date()
      });

      // Send OTP via SMS
      const message = `Doğrulama kodunuz: ${otp}. Bu kod ${request.expiryMinutes} dakika geçerlidir.`;
      const result = await this.sendSMS(instanceId, {
        to: request.phone,
        message,
        type: 'otp',
        sender: 'AYAZTRADE'
      });

      if (result.success) {
        await this.updateOTPSentStatus(otpId, request.phone, result.messageId);
        return { success: true, otpId };
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to send OTP', error);
      return { success: false, error: error.message };
    }
  }

  async verifyOTP(phone: string, otp: string, purpose: string): Promise<{
    success: boolean;
    valid: boolean;
    error?: string;
  }> {
    try {
      const otpCredentials = await this.getOTPCredentials(phone, purpose);

      if (!otpCredentials) {
        return { success: true, valid: false, error: 'OTP not found or expired' };
      }

      if (otpCredentials.verified) {
        return { success: true, valid: false, error: 'OTP already used' };
      }

      if (otpCredentials.expiresAt < new Date()) {
        return { success: true, valid: false, error: 'OTP expired' };
      }

      if (otpCredentials.attempts >= otpCredentials.maxAttempts) {
        return { success: true, valid: false, error: 'Too many attempts' };
      }

      // Verify OTP
      const valid = otp === otpCredentials.otp;

      if (valid) {
        await this.markOTPAsVerified(phone, purpose);
        return { success: true, valid: true };
      } else {
        await this.incrementOTPAttempts(phone, purpose);
        return { success: true, valid: false, error: 'Invalid OTP' };
      }

    } catch (error) {
      this.logger.error('Failed to verify OTP', error);
      return { success: false, valid: false, error: error.message };
    }
  }

  async sendBulkSMS(instanceId: string, messages: Array<{
    to: string;
    message: string;
    type: 'transactional' | 'otp' | 'notification' | 'marketing';
    sender?: string;
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
          const result = await this.sendSMS(instanceId, message);
          results.push({
            phone: message.to,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });

          // Add delay between messages to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
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
      this.logger.error('Failed to send bulk SMS', error);
      return { success: false, results: [], error: error.message };
    }
  }

  async getSMSHistory(instanceId: string, filters?: {
    phone?: string;
    type?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<SMSMessage[]> {
    try {
      let query = 'SELECT * FROM sms_messages WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.phone) {
        query += ` AND "to" = $${paramIndex}`;
        params.push(filters.phone);
        paramIndex++;
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
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        createdAt: row.created_at
      }));

    } catch (error) {
      this.logger.error('Failed to get SMS history', error);
      return [];
    }
  }

  async getSMSAnalytics(instanceId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    successRate: number;
    cost: number;
    byType: Record<string, number>;
    byProvider: Record<string, number>;
  }> {
    try {
      const result = await this.db.execute(`
        SELECT
          COUNT(*) as total_sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed,
          SUM(cost) as total_cost,
          type,
          provider
        FROM sms_messages
        WHERE created_at >= $1
        GROUP BY type, provider
      `, [this.getPeriodStartDate(period)]);

      const stats = {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        successRate: 0,
        cost: 0,
        byType: {} as Record<string, number>,
        byProvider: {} as Record<string, number>
      };

      for (const row of result.rows) {
        stats.totalSent += parseInt(row.total_sent);
        stats.totalDelivered += parseInt(row.total_delivered);
        stats.totalFailed += parseInt(row.total_failed);
        stats.cost += parseFloat(row.total_cost) || 0;

        if (row.type) {
          stats.byType[row.type] = (stats.byType[row.type] || 0) + parseInt(row.total_sent);
        }

        if (row.provider) {
          stats.byProvider[row.provider] = (stats.byProvider[row.provider] || 0) + parseInt(row.total_sent);
        }
      }

      stats.successRate = stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent) * 100 : 0;

      return stats;

    } catch (error) {
      this.logger.error('Failed to get SMS analytics', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        successRate: 0,
        cost: 0,
        byType: {},
        byProvider: {}
      };
    }
  }

  async updateSMSStatus(providerMessageId: string, status: string, provider: string): Promise<void> {
    try {
      await this.db.execute(`
        UPDATE sms_messages SET
          status = $1,
          ${status === 'delivered' ? 'delivered_at = $2,' : ''}
          updated_at = $2
        WHERE provider_message_id = $3 AND provider = $4
      `, [status, new Date(), providerMessageId, provider]);

    } catch (error) {
      this.logger.error('Failed to update SMS status', error);
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

  private async sendSMSViaProvider(instance: any, provider: SMSProvider, message: any): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    cost?: number;
    error?: string;
  }> {
    const messageId = `sms-${Date.now()}`;

    try {
      switch (provider.name) {
        case 'NetGSM':
          return await this.sendNetGSMSMS(instance, message, messageId);
        case 'Infobip':
          return await this.sendInfobipSMS(instance, message, messageId);
        case 'Twilio':
          return await this.sendTwilioSMS(instance, message, messageId);
        case 'Mesaj':
          return await this.sendMesajSMS(instance, message, messageId);
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }
    } catch (error) {
      return { success: false, messageId, error: error.message };
    }
  }

  private async sendNetGSMSMS(instance: any, message: any, messageId: string): Promise<any> {
    // NetGSM API implementation
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/sms/send/get',
      {
        usercode: instance.credentials.username,
        password: instance.credentials.password,
        gsmno: message.to,
        message: encodeURIComponent(message.message),
        msgheader: message.sender || 'AYAZTRADE',
        dil: 'TR'
      }
    );

    // Parse NetGSM response format
    if (!response.data?.status) {
      throw new Error('NetGSM API returned invalid response');
    }

    return {
      success: true,
      messageId,
      providerMessageId: response.data?.messageId || messageId,
      cost: parseFloat(response.data?.cost) || 0
    };
  }

  private async sendInfobipSMS(instance: any, message: any, messageId: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/sms/2/text/advanced',
      {
        messages: [{
          from: message.sender || 'AyazTrade',
          destinations: [{ to: message.to }],
          text: message.message,
          intermediateReport: true,
          notifyUrl: instance.config.webhookUrl || ''
        }]
      }
    );

    // Parse Infobip response
    if (!response.data?.messages?.[0]) {
      throw new Error('Infobip API returned invalid response');
    }

    const messageResponse = response.data.messages[0];

    return {
      success: messageResponse.status?.groupName === 'PENDING',
      messageId,
      providerMessageId: messageResponse.messageId,
      cost: parseFloat(messageResponse.price?.price) || 0
    };
  }

  private async sendTwilioSMS(instance: any, message: any, messageId: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      `/2010-04-01/Accounts/${instance.credentials.accountSid}/Messages.json`,
      {
        From: message.sender || instance.credentials.fromNumber,
        To: message.to,
        Body: message.message,
        StatusCallback: instance.config.webhookUrl || ''
      }
    );

    // Parse Twilio response
    if (!response.data?.sid) {
      throw new Error('Twilio API returned invalid response');
    }

    return {
      success: response.data.status !== 'failed',
      messageId,
      providerMessageId: response.data.sid,
      cost: parseFloat(response.data.price) || 0
    };
  }

  private async sendMesajSMS(instance: any, message: any, messageId: string): Promise<any> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/sms/send',
      {
        to: message.to,
        message: message.message,
        sender: message.sender || 'AYAZTRADE'
      }
    );

    return {
      success: true,
      messageId,
      providerMessageId: response.data?.id,
      cost: parseFloat(response.data?.cost) || 0
    };
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const provider = this.providers[instance.config.provider];
    let url = `${provider.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade-SMS/1.0'
    };

    switch (provider.auth.type) {
      case 'api_key':
        headers['X-API-Key'] = instance.credentials.apiKey;
        break;
      case 'basic':
        const credentials = Buffer.from(`${instance.credentials.username}:${instance.credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${instance.credentials.token}`;
        break;
    }

    this.logger.log(`Making SMS API call: ${method} ${url}`);

    try {
      // Real HTTP request implementation
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`SMS API Error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      this.logger.error(`SMS API call failed: ${method} ${url}`, error);

      // Handle specific error types
      if (error.message.includes('401')) {
        throw new Error('SMS API authentication failed. Check API credentials.');
      } else if (error.message.includes('403')) {
        throw new Error('SMS API access forbidden. Check API permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('SMS API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('500')) {
        throw new Error('SMS API server error. Please try again later.');
      }

      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Add country code if not present (assuming Turkey)
    if (cleaned.length === 10) {
      return `90${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `90${cleaned.substring(1)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('90')) {
      return cleaned;
    }

    return null;
  }

  private async checkRateLimit(instanceId: string, provider: SMSProvider): Promise<void> {
    if (!provider.rateLimit) return;

    const result = await this.db.execute(`
      SELECT COUNT(*) as count
      FROM sms_messages
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

  private generateOTPCode(length: number): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  private async generateOTP(phone: string, purpose: string): Promise<void> {
    const otp = this.generateOTPCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.db.execute(`
      INSERT INTO otp_credentials (phone, otp, purpose, expires_at, attempts, max_attempts, verified, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (phone, purpose) DO UPDATE SET
        otp = $2, expires_at = $4, attempts = 0, verified = false, created_at = $8
    `, [phone, otp, purpose, expiresAt, 0, 3, false, new Date()]);
  }

  private async saveOTPCredentials(credentials: OTPCredentials): Promise<void> {
    await this.db.execute(`
      INSERT INTO otp_credentials (phone, otp, purpose, expires_at, attempts, max_attempts, verified, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      credentials.phone,
      credentials.otp,
      credentials.purpose,
      credentials.expiresAt,
      credentials.attempts,
      credentials.maxAttempts,
      credentials.verified,
      credentials.createdAt
    ]);
  }

  private async getOTPCredentials(phone: string, purpose: string): Promise<OTPCredentials | null> {
    const result = await this.db.execute(`
      SELECT * FROM otp_credentials
      WHERE phone = $1 AND purpose = $2 AND expires_at > $3
    `, [phone, purpose, new Date()]);

    if (result.rows.length === 0) return null;

    return result.rows[0];
  }

  private async markOTPAsVerified(phone: string, purpose: string): Promise<void> {
    await this.db.execute(`
      UPDATE otp_credentials SET verified = true, updated_at = $1
      WHERE phone = $2 AND purpose = $3
    `, [new Date(), phone, purpose]);
  }

  private async incrementOTPAttempts(phone: string, purpose: string): Promise<void> {
    await this.db.execute(`
      UPDATE otp_credentials SET attempts = attempts + 1, updated_at = $1
      WHERE phone = $2 AND purpose = $3
    `, [new Date(), phone, purpose]);
  }

  private async saveSMSMessage(message: SMSMessage): Promise<void> {
    await this.db.execute(`
      INSERT INTO sms_messages (id, to, message, type, sender, status, provider, provider_message_id, cost, sent_at, delivered_at, error, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      message.id,
      message.to,
      message.message,
      message.type,
      message.sender,
      message.status,
      message.provider,
      message.providerMessageId,
      message.cost,
      message.sentAt,
      message.deliveredAt,
      message.error,
      message.createdAt
    ]);
  }

  private async updateOTPSentStatus(otpId: string, phone: string, smsMessageId: string): Promise<void> {
    await this.db.execute(`
      UPDATE otp_credentials SET sms_message_id = $1, updated_at = $2
      WHERE phone = $3 AND purpose = $4
    `, [smsMessageId, new Date(), phone, 'verification']);
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
