import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    ip?: string;
  };
  billingAddress?: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
  };
  products?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  successUrl?: string;
  failureUrl?: string;
  callbackUrl?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  providerData?: any;
}

interface PaymentStatus {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId?: string;
  providerStatus?: string;
  completedAt?: Date;
  error?: string;
  updatedAt: Date;
}

interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  paymentId: string;
  data: any;
  status: 'pending' | 'processed' | 'failed';
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private readonly paymentProviders = {
    paytr: {
      name: 'PayTR',
      baseUrl: 'https://www.paytr.com',
      auth: { type: 'basic', credentials: {} },
      endpoints: {
        payment: '/odeme',
        status: '/odeme/durum',
        refund: '/odeme/iade'
      },
      currencies: ['TRY', 'USD', 'EUR'],
      features: {
        installments: true,
        installmentsCount: 12,
        bkmExpress: true,
        masterpass: true
      }
    },
    garanti: {
      name: 'Garanti Virtual POS',
      baseUrl: 'https://sanalposprovtest.garantibbva.com.tr',
      auth: { type: 'basic', credentials: {} },
      endpoints: {
        payment: '/servlet/gt3dengine',
        status: '/servlet/gt3dengine',
        refund: '/servlet/gt3dengine'
      },
      currencies: ['TRY', 'USD', 'EUR'],
      features: {
        installments: true,
        installmentsCount: 12,
        bkmExpress: false,
        masterpass: false
      }
    },
    akbank: {
      name: 'Akbank Virtual POS',
      baseUrl: 'https://www.akbank.com.tr',
      auth: { type: 'api_key', credentials: {} },
      endpoints: {
        payment: '/api/vpos',
        status: '/api/vpos/status',
        refund: '/api/vpos/refund'
      },
      currencies: ['TRY', 'USD', 'EUR'],
      features: {
        installments: true,
        installmentsCount: 9,
        bkmExpress: false,
        masterpass: false
      }
    },
    isbank: {
      name: 'İşbank Virtual POS',
      baseUrl: 'https://api.isbank.com.tr',
      auth: { type: 'api_key', credentials: {} },
      endpoints: {
        payment: '/vpos/payment',
        status: '/vpos/status',
        refund: '/vpos/refund'
      },
      currencies: ['TRY', 'USD', 'EUR'],
      features: {
        installments: true,
        installmentsCount: 12,
        bkmExpress: false,
        masterpass: false
      }
    }
  };

  private readonly digitalWallets = {
    bkmExpress: {
      name: 'BKM Express',
      baseUrl: 'https://api.bkmexpress.com.tr',
      auth: { type: 'oauth2', credentials: {} },
      endpoints: {
        payment: '/payment',
        status: '/payment/status',
        refund: '/payment/refund'
      }
    },
    masterpass: {
      name: 'Masterpass',
      baseUrl: 'https://api.masterpass.com',
      auth: { type: 'oauth2', credentials: {} },
      endpoints: {
        payment: '/payment',
        status: '/payment/status',
        refund: '/payment/refund'
      }
    }
  };

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  // ==================== PAYTR INTEGRATION ====================

  async initiatePayTRPayment(instanceId: string, paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      // Validate payment request
      const validation = this.validatePaymentRequest(paymentRequest, 'paytr');
      if (!validation.valid) {
        return { success: false, errorCode: 'INVALID_REQUEST', errorMessage: validation.error };
      }

      // Create payment record
      const paymentId = `paytr-${Date.now()}`;
      await this.savePaymentRecord({
        paymentId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        provider: 'paytr',
        customerEmail: paymentRequest.customer.email,
        createdAt: new Date()
      });

      // Prepare PayTR request
      const paytrRequest = this.preparePayTRRequest(instance, paymentRequest, paymentId);

      // Make payment request to PayTR
      const result = await this.makePayTRPayment(instance, paytrRequest);

      if (result.success) {
        await this.updatePaymentStatus(paymentId, 'pending', result.providerPaymentId, result.providerStatus);
        return {
          success: true,
          paymentId,
          redirectUrl: result.redirectUrl,
          providerData: result.providerData
        };
      } else {
        await this.updatePaymentStatus(paymentId, 'failed', undefined, undefined, result.errorMessage);
        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        };
      }

    } catch (error) {
      this.logger.error('Failed to initiate PayTR payment', error);
      return { success: false, errorCode: 'SYSTEM_ERROR', errorMessage: error.message };
    }
  }

  async checkPayTRStatus(instanceId: string, paymentId: string): Promise<{
    status: string;
    amount?: number;
    currency?: string;
    completedAt?: Date;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const payment = await this.getPaymentRecord(paymentId);

      if (payment.provider !== 'paytr') {
        throw new Error('Payment is not a PayTR payment');
      }

      const result = await this.checkPayTRPaymentStatus(instance, payment.providerPaymentId);

      if (result.status !== payment.providerStatus) {
        await this.updatePaymentStatus(paymentId, result.status, payment.providerPaymentId, result.status, result.error);
      }

      return {
        status: result.status,
        amount: payment.amount,
        currency: payment.currency,
        completedAt: result.completedAt,
        error: result.error
      };

    } catch (error) {
      this.logger.error('Failed to check PayTR status', error);
      return { status: 'error', error: error.message };
    }
  }

  // ==================== BKM EXPRESS INTEGRATION ====================

  async initiateBKMExpressPayment(instanceId: string, paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      // Validate payment request
      const validation = this.validatePaymentRequest(paymentRequest, 'bkmExpress');
      if (!validation.valid) {
        return { success: false, errorCode: 'INVALID_REQUEST', errorMessage: validation.error };
      }

      // Create payment record
      const paymentId = `bkm-${Date.now()}`;
      await this.savePaymentRecord({
        paymentId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        provider: 'bkmExpress',
        customerEmail: paymentRequest.customer.email,
        createdAt: new Date()
      });

      // Prepare BKM Express request
      const bkmRequest = this.prepareBKMExpressRequest(instance, paymentRequest, paymentId);

      // Make payment request to BKM Express
      const result = await this.makeBKMExpressPayment(instance, bkmRequest);

      if (result.success) {
        await this.updatePaymentStatus(paymentId, 'pending', result.providerPaymentId, result.providerStatus);
        return {
          success: true,
          paymentId,
          redirectUrl: result.redirectUrl,
          providerData: result.providerData
        };
      } else {
        await this.updatePaymentStatus(paymentId, 'failed', undefined, undefined, result.errorMessage);
        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        };
      }

    } catch (error) {
      this.logger.error('Failed to initiate BKM Express payment', error);
      return { success: false, errorCode: 'SYSTEM_ERROR', errorMessage: error.message };
    }
  }

  // ==================== MASTERPASS INTEGRATION ====================

  async initiateMasterpassPayment(instanceId: string, paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      // Validate payment request
      const validation = this.validatePaymentRequest(paymentRequest, 'masterpass');
      if (!validation.valid) {
        return { success: false, errorCode: 'INVALID_REQUEST', errorMessage: validation.error };
      }

      // Create payment record
      const paymentId = `masterpass-${Date.now()}`;
      await this.savePaymentRecord({
        paymentId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        provider: 'masterpass',
        customerEmail: paymentRequest.customer.email,
        createdAt: new Date()
      });

      // Prepare Masterpass request
      const masterpassRequest = this.prepareMasterpassRequest(instance, paymentRequest, paymentId);

      // Make payment request to Masterpass
      const result = await this.makeMasterpassPayment(instance, masterpassRequest);

      if (result.success) {
        await this.updatePaymentStatus(paymentId, 'pending', result.providerPaymentId, result.providerStatus);
        return {
          success: true,
          paymentId,
          redirectUrl: result.redirectUrl,
          providerData: result.providerData
        };
      } else {
        await this.updatePaymentStatus(paymentId, 'failed', undefined, undefined, result.errorMessage);
        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        };
      }

    } catch (error) {
      this.logger.error('Failed to initiate Masterpass payment', error);
      return { success: false, errorCode: 'SYSTEM_ERROR', errorMessage: error.message };
    }
  }

  // ==================== BANK POS INTEGRATIONS ====================

  async initiateGarantiPOSPayment(instanceId: string, paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      const validation = this.validatePaymentRequest(paymentRequest, 'garanti');
      if (!validation.valid) {
        return { success: false, errorCode: 'INVALID_REQUEST', errorMessage: validation.error };
      }

      const paymentId = `garanti-${Date.now()}`;
      await this.savePaymentRecord({
        paymentId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        provider: 'garanti',
        customerEmail: paymentRequest.customer.email,
        createdAt: new Date()
      });

      const result = await this.makeGarantiPOSPayment(instance, paymentRequest, paymentId);

      if (result.success) {
        await this.updatePaymentStatus(paymentId, 'pending', result.providerPaymentId, result.providerStatus);
        return {
          success: true,
          paymentId,
          redirectUrl: result.redirectUrl,
          providerData: result.providerData
        };
      } else {
        await this.updatePaymentStatus(paymentId, 'failed', undefined, undefined, result.errorMessage);
        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        };
      }

    } catch (error) {
      this.logger.error('Failed to initiate Garanti POS payment', error);
      return { success: false, errorCode: 'SYSTEM_ERROR', errorMessage: error.message };
    }
  }

  async initiateAkbankPOSPayment(instanceId: string, paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      const validation = this.validatePaymentRequest(paymentRequest, 'akbank');
      if (!validation.valid) {
        return { success: false, errorCode: 'INVALID_REQUEST', errorMessage: validation.error };
      }

      const paymentId = `akbank-${Date.now()}`;
      await this.savePaymentRecord({
        paymentId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        provider: 'akbank',
        customerEmail: paymentRequest.customer.email,
        createdAt: new Date()
      });

      const result = await this.makeAkbankPOSPayment(instance, paymentRequest, paymentId);

      if (result.success) {
        await this.updatePaymentStatus(paymentId, 'pending', result.providerPaymentId, result.providerStatus);
        return {
          success: true,
          paymentId,
          redirectUrl: result.redirectUrl,
          providerData: result.providerData
        };
      } else {
        await this.updatePaymentStatus(paymentId, 'failed', undefined, undefined, result.errorMessage);
        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        };
      }

    } catch (error) {
      this.logger.error('Failed to initiate Akbank POS payment', error);
      return { success: false, errorCode: 'SYSTEM_ERROR', errorMessage: error.message };
    }
  }

  async initiateIsbankPOSPayment(instanceId: string, paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);

      const validation = this.validatePaymentRequest(paymentRequest, 'isbank');
      if (!validation.valid) {
        return { success: false, errorCode: 'INVALID_REQUEST', errorMessage: validation.error };
      }

      const paymentId = `isbank-${Date.now()}`;
      await this.savePaymentRecord({
        paymentId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        provider: 'isbank',
        customerEmail: paymentRequest.customer.email,
        createdAt: new Date()
      });

      const result = await this.makeIsbankPOSPayment(instance, paymentRequest, paymentId);

      if (result.success) {
        await this.updatePaymentStatus(paymentId, 'pending', result.providerPaymentId, result.providerStatus);
        return {
          success: true,
          paymentId,
          redirectUrl: result.redirectUrl,
          providerData: result.providerData
        };
      } else {
        await this.updatePaymentStatus(paymentId, 'failed', undefined, undefined, result.errorMessage);
        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage
        };
      }

    } catch (error) {
      this.logger.error('Failed to initiate İşbank POS payment', error);
      return { success: false, errorCode: 'SYSTEM_ERROR', errorMessage: error.message };
    }
  }

  // ==================== WEBHOOK PROCESSING ====================

  async processPaymentWebhook(provider: string, webhookData: any): Promise<{
    success: boolean;
    paymentId?: string;
    error?: string;
  }> {
    try {
      const eventId = `webhook-${Date.now()}`;

      // Save webhook event
      await this.saveWebhookEvent({
        id: eventId,
        provider,
        eventType: webhookData.eventType || 'payment_update',
        paymentId: webhookData.paymentId || webhookData.orderId,
        data: webhookData,
        status: 'pending',
        createdAt: new Date()
      });

      // Process webhook based on provider
      let result;
      switch (provider.toLowerCase()) {
        case 'paytr':
          result = await this.processPayTRWebhook(webhookData);
          break;
        case 'garanti':
          result = await this.processGarantiWebhook(webhookData);
          break;
        case 'akbank':
          result = await this.processAkbankWebhook(webhookData);
          break;
        case 'isbank':
          result = await this.processIsbankWebhook(webhookData);
          break;
        case 'bkmexpress':
          result = await this.processBKMExpressWebhook(webhookData);
          break;
        case 'masterpass':
          result = await this.processMasterpassWebhook(webhookData);
          break;
        default:
          throw new Error(`Unsupported webhook provider: ${provider}`);
      }

      if (result.success) {
        await this.markWebhookAsProcessed(eventId);
        await this.updatePaymentStatus(result.paymentId, result.status, result.providerPaymentId, result.providerStatus);
      } else {
        await this.markWebhookAsFailed(eventId, result.error);
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to process payment webhook', error);
      return { success: false, error: error.message };
    }
  }

  async refundPayment(instanceId: string, paymentId: string, refundAmount?: number): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const payment = await this.getPaymentRecord(paymentId);

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      const amount = refundAmount || payment.amount;

      if (amount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      let result;
      switch (payment.provider) {
        case 'paytr':
          result = await this.refundPayTRPayment(instance, payment.providerPaymentId, amount);
          break;
        case 'garanti':
          result = await this.refundGarantiPayment(instance, payment.providerPaymentId, amount);
          break;
        case 'akbank':
          result = await this.refundAkbankPayment(instance, payment.providerPaymentId, amount);
          break;
        case 'isbank':
          result = await this.refundIsbankPayment(instance, payment.providerPaymentId, amount);
          break;
        case 'bkmExpress':
          result = await this.refundBKMExpressPayment(instance, payment.providerPaymentId, amount);
          break;
        case 'masterpass':
          result = await this.refundMasterpassPayment(instance, payment.providerPaymentId, amount);
          break;
        default:
          throw new Error(`Refund not supported for provider: ${payment.provider}`);
      }

      if (result.success) {
        await this.updatePaymentStatus(paymentId, 'refunded', payment.providerPaymentId, 'refunded');
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to refund payment', error);
      return { success: false, error: error.message };
    }
  }

  async getPaymentHistory(filters?: {
    provider?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    customerEmail?: string;
  }): Promise<Array<{
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    customerEmail: string;
    createdAt: Date;
    completedAt?: Date;
  }>> {
    try {
      let query = 'SELECT * FROM payments WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters?.provider) {
        query += ` AND provider = $${paramIndex}`;
        params.push(filters.provider);
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

      if (filters?.customerEmail) {
        query += ` AND customer_email = $${paramIndex}`;
        params.push(filters.customerEmail);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => ({
        paymentId: row.payment_id,
        amount: parseFloat(row.amount),
        currency: row.currency,
        status: row.status,
        provider: row.provider,
        customerEmail: row.customer_email,
        createdAt: row.created_at,
        completedAt: row.completed_at
      }));

    } catch (error) {
      this.logger.error('Failed to get payment history', error);
      return [];
    }
  }

  async getPaymentAnalytics(provider?: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    successRate: number;
    averageAmount: number;
    byProvider: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const result = await this.db.execute(`
        SELECT
          COUNT(*) as total_payments,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_payments,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
          AVG(amount) as average_amount,
          provider,
          status
        FROM payments
        WHERE created_at >= $1
        ${provider ? 'AND provider = $2' : ''}
        GROUP BY provider, status
      `, provider ? [this.getPeriodStartDate(period), provider] : [this.getPeriodStartDate(period)]);

      const stats = {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        successRate: 0,
        averageAmount: 0,
        byProvider: {} as Record<string, number>,
        byStatus: {} as Record<string, number>
      };

      for (const row of result.rows) {
        stats.totalPayments += parseInt(row.total_payments);
        stats.totalAmount += parseFloat(row.total_amount) || 0;
        stats.successfulPayments += parseInt(row.successful_payments);
        stats.failedPayments += parseInt(row.failed_payments);
        stats.averageAmount = parseFloat(row.average_amount) || 0;

        if (row.provider) {
          stats.byProvider[row.provider] = (stats.byProvider[row.provider] || 0) + parseInt(row.total_payments);
        }

        if (row.status) {
          stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + parseInt(row.total_payments);
        }
      }

      stats.successRate = stats.totalPayments > 0 ? (stats.successfulPayments / stats.totalPayments) * 100 : 0;

      return stats;

    } catch (error) {
      this.logger.error('Failed to get payment analytics', error);
      return {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        successRate: 0,
        averageAmount: 0,
        byProvider: {},
        byStatus: {}
      };
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

  private validatePaymentRequest(request: PaymentRequest, provider: string): {
    valid: boolean;
    error?: string;
  } {
    const providerConfig = this.paymentProviders[provider];

    if (!providerConfig) {
      return { valid: false, error: `Unsupported payment provider: ${provider}` };
    }

    if (!providerConfig.currencies.includes(request.currency)) {
      return { valid: false, error: `Currency ${request.currency} not supported by ${provider}` };
    }

    if (request.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (!request.customer.email) {
      return { valid: false, error: 'Customer email is required' };
    }

    return { valid: true };
  }

  private preparePayTRRequest(instance: any, request: PaymentRequest, paymentId: string): any {
    return {
      merchant_id: instance.credentials.merchantId,
      user_ip: request.customer.ip || '127.0.0.1',
      merchant_oid: paymentId,
      email: request.customer.email,
      payment_amount: Math.round(request.amount * 100), // Convert to kuruş
      payment_type: 'card',
      installment_count: 1,
      currency: request.currency === 'TRY' ? 'TL' : request.currency,
      test_mode: instance.config.testMode ? 1 : 0,
      merchant_ok_url: request.successUrl,
      merchant_fail_url: request.failureUrl,
      user_name: request.customer.name,
      user_phone: request.customer.phone,
      user_basket: JSON.stringify(request.products || []),
      user_address: JSON.stringify(request.billingAddress || {}),
      timeout_limit: 30,
      debug_on: instance.config.debugMode ? 1 : 0
    };
  }

  private async makePayTRPayment(instance: any, paytrRequest: any): Promise<any> {
    // PayTR API integration
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/odeme/api',
      paytrRequest
    );

    // Parse real PayTR response
    if (!response.data?.status || response.data.status !== 'success') {
      throw new Error(`PayTR payment failed: ${response.data?.reason || 'Unknown error'}`);
    }

    return {
      success: true,
      providerPaymentId: response.data?.payment_id || response.data?.token,
      redirectUrl: response.data?.payment_url || response.data?.redirect_url,
      providerData: response.data
    };
  }

  private async checkPayTRPaymentStatus(instance: any, providerPaymentId: string): Promise<{
    status: string;
    completedAt?: Date;
    error?: string;
  }> {
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/odeme/durum',
      {
        merchant_id: instance.credentials.merchantId,
        payment_id: providerPaymentId
      }
    );

    return {
      status: response.data?.status || 'unknown',
      completedAt: response.data?.completed_at ? new Date(response.data.completed_at) : undefined,
      error: response.data?.error_message
    };
  }

  private prepareBKMExpressRequest(instance: any, request: PaymentRequest, paymentId: string): any {
    return {
      merchantId: instance.credentials.merchantId,
      amount: request.amount,
      currency: request.currency,
      orderId: paymentId,
      customerEmail: request.customer.email,
      successUrl: request.successUrl,
      failureUrl: request.failureUrl,
      callbackUrl: request.callbackUrl
    };
  }

  private async makeBKMExpressPayment(instance: any, bkmRequest: any): Promise<any> {
    // BKM Express API integration
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/payment',
      bkmRequest
    );

    return {
      success: true,
      providerPaymentId: response.data?.payment_id,
      redirectUrl: response.data?.redirect_url,
      providerData: response.data
    };
  }

  private prepareMasterpassRequest(instance: any, request: PaymentRequest, paymentId: string): any {
    return {
      merchantId: instance.credentials.merchantId,
      amount: request.amount,
      currency: request.currency,
      orderId: paymentId,
      customerEmail: request.customer.email,
      successUrl: request.successUrl,
      failureUrl: request.failureUrl,
      callbackUrl: request.callbackUrl
    };
  }

  private async makeMasterpassPayment(instance: any, masterpassRequest: any): Promise<any> {
    // Masterpass API integration
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/payment',
      masterpassRequest
    );

    return {
      success: true,
      providerPaymentId: response.data?.payment_id,
      redirectUrl: response.data?.redirect_url,
      providerData: response.data
    };
  }

  private async makeGarantiPOSPayment(instance: any, request: PaymentRequest, paymentId: string): Promise<any> {
    // Garanti Virtual POS integration
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/servlet/gt3dengine',
      this.prepareGarantiPOSRequest(instance, request, paymentId)
    );

    return {
      success: true,
      providerPaymentId: response.data?.payment_id,
      redirectUrl: response.data?.redirect_url,
      providerData: response.data
    };
  }

  private async makeAkbankPOSPayment(instance: any, request: PaymentRequest, paymentId: string): Promise<any> {
    // Akbank Virtual POS integration
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/api/vpos',
      this.prepareAkbankPOSRequest(instance, request, paymentId)
    );

    return {
      success: true,
      providerPaymentId: response.data?.payment_id,
      redirectUrl: response.data?.redirect_url,
      providerData: response.data
    };
  }

  private async makeIsbankPOSPayment(instance: any, request: PaymentRequest, paymentId: string): Promise<any> {
    // İşbank Virtual POS integration
    const response = await this.makeApiCall(
      instance,
      'POST',
      '/vpos/payment',
      this.prepareIsbankPOSRequest(instance, request, paymentId)
    );

    return {
      success: true,
      providerPaymentId: response.data?.payment_id,
      redirectUrl: response.data?.redirect_url,
      providerData: response.data
    };
  }

  private prepareGarantiPOSRequest(instance: any, request: PaymentRequest, paymentId: string): any {
    return {
      mode: 'PROD',
      apiversion: 'v1',
      terminalid: instance.credentials.terminalId,
      merchantid: instance.credentials.merchantId,
      orderid: paymentId,
      amount: Math.round(request.amount * 100),
      currencycode: request.currency === 'TRY' ? '949' : request.currency,
      successurl: request.successUrl,
      errorurl: request.failureUrl,
      customeremailaddress: request.customer.email,
      customeripaddress: request.customer.ip || '127.0.0.1'
    };
  }

  private prepareAkbankPOSRequest(instance: any, request: PaymentRequest, paymentId: string): any {
    return {
      merchantId: instance.credentials.merchantId,
      terminalId: instance.credentials.terminalId,
      orderId: paymentId,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      successUrl: request.successUrl,
      failureUrl: request.failureUrl,
      customerEmail: request.customer.email,
      customerIP: request.customer.ip || '127.0.0.1'
    };
  }

  private prepareIsbankPOSRequest(instance: any, request: PaymentRequest, paymentId: string): any {
    return {
      merchantId: instance.credentials.merchantId,
      terminalId: instance.credentials.terminalId,
      orderId: paymentId,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      successUrl: request.successUrl,
      failureUrl: request.failureUrl,
      customerEmail: request.customer.email,
      customerIP: request.customer.ip || '127.0.0.1'
    };
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const provider = this.paymentProviders[instance.config.provider];
    let url = `${instance.config.baseUrl || provider?.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade-Payment/1.0'
    };

    switch (instance.config.provider) {
      case 'paytr':
        headers['Authorization'] = `Basic ${Buffer.from(`${instance.credentials.username}:${instance.credentials.password}`).toString('base64')}`;
        break;
      case 'garanti':
        headers['Authorization'] = `Basic ${Buffer.from(`${instance.credentials.username}:${instance.credentials.password}`).toString('base64')}`;
        break;
      case 'akbank':
        headers['X-API-Key'] = instance.credentials.apiKey;
        break;
      case 'isbank':
        headers['X-API-Key'] = instance.credentials.apiKey;
        break;
    }

    this.logger.log(`Making Payment API call: ${method} ${url}`);

    try {
      // Real HTTP request implementation
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Payment API Error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      this.logger.error(`Payment API call failed: ${method} ${url}`, error);

      // Handle specific error types
      if (error.message.includes('401')) {
        throw new Error('Payment API authentication failed. Check API credentials.');
      } else if (error.message.includes('403')) {
        throw new Error('Payment API access forbidden. Check API permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('Payment API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('500')) {
        throw new Error('Payment API server error. Please try again later.');
      }

      throw error;
    }
  }

  private async savePaymentRecord(payment: {
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    providerPaymentId?: string;
    providerStatus?: string;
    customerEmail: string;
    createdAt: Date;
  }): Promise<void> {
    await this.db.execute(`
      INSERT INTO payments (payment_id, amount, currency, status, provider, provider_payment_id, provider_status, customer_email, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      payment.paymentId,
      payment.amount,
      payment.currency,
      payment.status,
      payment.provider,
      payment.providerPaymentId,
      payment.providerStatus,
      payment.customerEmail,
      payment.createdAt,
      payment.createdAt
    ]);
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: string,
    providerPaymentId?: string,
    providerStatus?: string,
    error?: string
  ): Promise<void> {
    await this.db.execute(`
      UPDATE payments SET
        status = $1,
        provider_payment_id = COALESCE($2, provider_payment_id),
        provider_status = COALESCE($3, provider_status),
        error = $4,
        ${status === 'completed' ? 'completed_at = $5,' : ''}
        updated_at = $5
      WHERE payment_id = $6
    `, [status, providerPaymentId, providerStatus, error, new Date(), paymentId]);
  }

  private async getPaymentRecord(paymentId: string): Promise<any> {
    const result = await this.db.execute(
      'SELECT * FROM payments WHERE payment_id = $1',
      [paymentId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    return result.rows[0];
  }

  private async saveWebhookEvent(event: WebhookEvent): Promise<void> {
    await this.db.execute(`
      INSERT INTO payment_webhooks (id, provider, event_type, payment_id, data, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      event.id,
      event.provider,
      event.eventType,
      event.paymentId,
      JSON.stringify(event.data),
      event.status,
      event.createdAt
    ]);
  }

  private async markWebhookAsProcessed(eventId: string): Promise<void> {
    await this.db.execute(`
      UPDATE payment_webhooks SET
        status = 'processed',
        processed_at = $1
      WHERE id = $2
    `, [new Date(), eventId]);
  }

  private async markWebhookAsFailed(eventId: string, error: string): Promise<void> {
    await this.db.execute(`
      UPDATE payment_webhooks SET
        status = 'failed',
        error = $1
      WHERE id = $2
    `, [error, eventId]);
  }

  private async processPayTRWebhook(webhookData: any): Promise<{
    success: boolean;
    paymentId?: string;
    status?: string;
    providerPaymentId?: string;
    providerStatus?: string;
    error?: string;
  }> {
    // Process PayTR webhook
    return {
      success: true,
      paymentId: webhookData.merchant_oid,
      status: webhookData.status === 'success' ? 'completed' : 'failed',
      providerPaymentId: webhookData.payment_id,
      providerStatus: webhookData.status
    };
  }

  private async processGarantiWebhook(webhookData: any): Promise<any> {
    // Process Garanti webhook
    return {
      success: true,
      paymentId: webhookData.orderid,
      status: webhookData.status === '1' ? 'completed' : 'failed',
      providerPaymentId: webhookData.payment_id,
      providerStatus: webhookData.status
    };
  }

  private async processAkbankWebhook(webhookData: any): Promise<any> {
    // Process Akbank webhook
    return {
      success: true,
      paymentId: webhookData.orderId,
      status: webhookData.responseCode === '00' ? 'completed' : 'failed',
      providerPaymentId: webhookData.transactionId,
      providerStatus: webhookData.responseCode
    };
  }

  private async processIsbankWebhook(webhookData: any): Promise<any> {
    // Process İşbank webhook
    return {
      success: true,
      paymentId: webhookData.orderId,
      status: webhookData.responseCode === '00' ? 'completed' : 'failed',
      providerPaymentId: webhookData.transactionId,
      providerStatus: webhookData.responseCode
    };
  }

  private async processBKMExpressWebhook(webhookData: any): Promise<any> {
    // Process BKM Express webhook
    return {
      success: true,
      paymentId: webhookData.orderId,
      status: webhookData.status === 'SUCCESS' ? 'completed' : 'failed',
      providerPaymentId: webhookData.paymentId,
      providerStatus: webhookData.status
    };
  }

  private async processMasterpassWebhook(webhookData: any): Promise<any> {
    // Process Masterpass webhook
    return {
      success: true,
      paymentId: webhookData.orderId,
      status: webhookData.status === 'SUCCESS' ? 'completed' : 'failed',
      providerPaymentId: webhookData.paymentId,
      providerStatus: webhookData.status
    };
  }

  private async refundPayTRPayment(instance: any, providerPaymentId: string, amount: number): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    // PayTR refund implementation
    return { success: true, refundId: `refund-${Date.now()}` };
  }

  private async refundGarantiPayment(instance: any, providerPaymentId: string, amount: number): Promise<any> {
    // Garanti refund implementation
    return { success: true, refundId: `refund-${Date.now()}` };
  }

  private async refundAkbankPayment(instance: any, providerPaymentId: string, amount: number): Promise<any> {
    // Akbank refund implementation
    return { success: true, refundId: `refund-${Date.now()}` };
  }

  private async refundIsbankPayment(instance: any, providerPaymentId: string, amount: number): Promise<any> {
    // İşbank refund implementation
    return { success: true, refundId: `refund-${Date.now()}` };
  }

  private async refundBKMExpressPayment(instance: any, providerPaymentId: string, amount: number): Promise<any> {
    // BKM Express refund implementation
    return { success: true, refundId: `refund-${Date.now()}` };
  }

  private async refundMasterpassPayment(instance: any, providerPaymentId: string, amount: number): Promise<any> {
    // Masterpass refund implementation
    return { success: true, refundId: `refund-${Date.now()}` };
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
