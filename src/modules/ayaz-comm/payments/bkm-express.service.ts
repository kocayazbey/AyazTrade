import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface BKMExpressPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIpAddress: string;
  successUrl: string;
  failUrl: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  installment?: number;
}

export interface BKMExpressPaymentResponse {
  success: boolean;
  token?: string;
  redirectUrl?: string;
  transactionId?: string;
  error?: string;
  errorCode?: string;
}

export interface BKMExpressTicketRequest {
  ticketId: string;
  path: string;
}

export interface BKMExpressTicketResponse {
  success: boolean;
  ticketToken?: string;
  bankList?: Array<{
    bankId: string;
    bankName: string;
    logoUrl: string;
  }>;
}

@Injectable()
export class BKMExpressService {
  private readonly logger = new Logger(BKMExpressService.name);
  private apiClient: AxiosInstance;
  private merchantId: string;
  private merchantPassword: string;
  private merchantPosnetId: string;
  private terminalId: string;
  private encryptionKey: string;
  private baseUrl: string;
  private testMode: boolean;

  constructor(private configService: ConfigService) {
    this.merchantId = this.configService.get<string>('BKM_EXPRESS_MERCHANT_ID');
    this.merchantPassword = this.configService.get<string>('BKM_EXPRESS_MERCHANT_PASSWORD');
    this.merchantPosnetId = this.configService.get<string>('BKM_EXPRESS_POSNET_ID');
    this.terminalId = this.configService.get<string>('BKM_EXPRESS_TERMINAL_ID');
    this.encryptionKey = this.configService.get<string>('BKM_EXPRESS_ENCRYPTION_KEY');
    this.testMode = this.configService.get<boolean>('BKM_EXPRESS_TEST_MODE', true);
    
    this.baseUrl = this.testMode
      ? 'https://preprod.bkmexpress.com.tr'
      : 'https://www.bkmexpress.com.tr';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`BKM Express API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('BKM Express API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`BKM Express API Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('BKM Express API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async createPayment(request: BKMExpressPaymentRequest): Promise<BKMExpressPaymentResponse> {
    try {
      this.logger.log(`Creating BKM Express payment for order: ${request.orderId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();
      const totalAmount = (request.amount * 100).toString();

      const items = request.items.map((item) => ({
        name: item.name,
        price: (item.price * 100).toString(),
        quantity: item.quantity.toString(),
      }));

      const payload = {
        merchantId: this.merchantId,
        posnetId: this.merchantPosnetId,
        terminalId: this.terminalId,
        orderId: request.orderId,
        amount: totalAmount,
        currencyCode: request.currency === 'USD' ? '840' : request.currency === 'EUR' ? '978' : '949',
        installment: request.installment?.toString() || '0',
        merchantReturnUrl: request.successUrl,
        merchantFailUrl: request.failUrl,
        timestamp: timestamp.toString(),
        nonce: nonce,
        items: items,
        customer: {
          name: request.customerName,
          email: request.customerEmail,
          phoneNumber: request.customerPhone,
          ipAddress: request.customerIpAddress,
        },
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/payment/initialize', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`BKM Express payment initialized: ${response.data.token}`);
        return {
          success: true,
          token: response.data.token,
          redirectUrl: response.data.redirectUrl,
          transactionId: response.data.transactionId,
        };
      } else {
        this.logger.error(`BKM Express payment failed: ${response.data.errorMessage}`);
        return {
          success: false,
          error: response.data.errorMessage,
          errorCode: response.data.errorCode,
        };
      }
    } catch (error) {
      this.logger.error(`BKM Express payment error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'BKM Express payment processing failed');
    }
  }

  async createTicket(request: BKMExpressTicketRequest): Promise<BKMExpressTicketResponse> {
    try {
      this.logger.log(`Creating BKM Express ticket: ${request.ticketId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        ticketId: request.ticketId,
        path: request.path,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/ticket/create', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`BKM Express ticket created: ${response.data.ticketToken}`);
        return {
          success: true,
          ticketToken: response.data.ticketToken,
          bankList: response.data.bankList,
        };
      } else {
        this.logger.error(`BKM Express ticket creation failed: ${response.data.errorMessage}`);
        return {
          success: false,
        };
      }
    } catch (error) {
      this.logger.error(`BKM Express ticket error: ${error.message}`, error.stack);
      throw new BadRequestException('BKM Express ticket creation failed');
    }
  }

  async verifyCallback(data: any): Promise<boolean> {
    try {
      const {
        merchantId,
        orderId,
        amount,
        currencyCode,
        installment,
        status,
        transactionId,
        signature,
      } = data;

      if (merchantId !== this.merchantId) {
        this.logger.error('BKM Express callback merchant ID mismatch');
        return false;
      }

      const payload = {
        merchantId,
        orderId,
        amount,
        currencyCode,
        installment,
        status,
        transactionId,
      };

      const calculatedSignature = this.generateSignature(payload);

      if (calculatedSignature !== signature) {
        this.logger.error('BKM Express callback signature verification failed');
        return false;
      }

      if (status === 'Success' || status === 'SUCCESS') {
        this.logger.log(`BKM Express payment verified successfully for order: ${orderId}`);
        return true;
      }

      this.logger.warn(`BKM Express payment status is not success: ${status}`);
      return false;
    } catch (error) {
      this.logger.error(`BKM Express callback verification error: ${error.message}`, error.stack);
      return false;
    }
  }

  async getPaymentStatus(transactionId: string): Promise<any> {
    try {
      this.logger.log(`Checking BKM Express payment status: ${transactionId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        transactionId: transactionId,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/payment/status', payload);

      if (response.data.result === 'Success') {
        return {
          success: true,
          status: response.data.status,
          transactionId: response.data.transactionId,
          orderId: response.data.orderId,
          amount: response.data.amount,
          currency: response.data.currencyCode,
          installment: response.data.installment,
          cardBin: response.data.cardBin,
          cardLastFour: response.data.cardLastFour,
          bankName: response.data.bankName,
          paymentDate: response.data.paymentDate,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Failed to get payment status');
      }
    } catch (error) {
      this.logger.error(`BKM Express status check error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to check BKM Express payment status');
    }
  }

  async refund(transactionId: string, amount?: number, reason?: string): Promise<any> {
    try {
      this.logger.log(`Processing BKM Express refund for transaction: ${transactionId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();
      const refundAmount = amount ? (amount * 100).toString() : undefined;

      const payload: any = {
        merchantId: this.merchantId,
        transactionId: transactionId,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      if (refundAmount) {
        payload.amount = refundAmount;
      }

      if (reason) {
        payload.reason = reason;
      }

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/payment/refund', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`BKM Express refund successful: ${transactionId}`);
        return {
          success: true,
          refundId: response.data.refundId,
          transactionId: transactionId,
          amount: refundAmount ? parseFloat(refundAmount) / 100 : undefined,
          message: response.data.message,
        };
      } else {
        this.logger.error(`BKM Express refund failed: ${response.data.errorMessage}`);
        throw new BadRequestException(response.data.errorMessage || 'Refund failed');
      }
    } catch (error) {
      this.logger.error(`BKM Express refund error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'BKM Express refund processing failed');
    }
  }

  async cancelPayment(transactionId: string): Promise<any> {
    try {
      this.logger.log(`Cancelling BKM Express payment: ${transactionId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        transactionId: transactionId,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/payment/cancel', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`BKM Express payment cancelled: ${transactionId}`);
        return {
          success: true,
          transactionId: transactionId,
          message: response.data.message,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Cancellation failed');
      }
    } catch (error) {
      this.logger.error(`BKM Express cancel error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to cancel BKM Express payment');
    }
  }

  async getBankList(): Promise<any> {
    try {
      this.logger.log('Fetching BKM Express bank list');

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/banks/list', payload);

      if (response.data.result === 'Success') {
        return {
          success: true,
          banks: response.data.banks.map((bank: any) => ({
            bankId: bank.bankId,
            bankName: bank.bankName,
            logoUrl: bank.logoUrl,
            active: bank.active,
            installmentOptions: bank.installmentOptions,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch bank list');
      }
    } catch (error) {
      this.logger.error('BKM Express bank list error:', error.message);
      throw new BadRequestException('Failed to fetch BKM Express bank list');
    }
  }

  async getInstallmentInfo(binNumber: string, amount: number): Promise<any> {
    try {
      this.logger.log(`Fetching BKM Express installment info for BIN: ${binNumber}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();
      const amountStr = (amount * 100).toString();

      const payload = {
        merchantId: this.merchantId,
        binNumber: binNumber,
        amount: amountStr,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/installment/info', payload);

      if (response.data.result === 'Success') {
        return {
          success: true,
          bankName: response.data.bankName,
          cardType: response.data.cardType,
          cardFamily: response.data.cardFamily,
          commercial: response.data.commercial,
          installmentOptions: response.data.installmentOptions.map((option: any) => ({
            installmentCount: option.installmentCount,
            totalAmount: parseFloat(option.totalAmount) / 100,
            installmentAmount: parseFloat(option.installmentAmount) / 100,
            commissionRate: option.commissionRate,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch installment info');
      }
    } catch (error) {
      this.logger.error('BKM Express installment info error:', error.message);
      throw new BadRequestException('Failed to fetch BKM Express installment info');
    }
  }

  async reconciliation(date: string): Promise<any> {
    try {
      this.logger.log(`Fetching BKM Express reconciliation for date: ${date}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        date: date,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/reconciliation/daily', payload);

      if (response.data.result === 'Success') {
        return {
          success: true,
          date: response.data.date,
          totalTransactionCount: response.data.totalTransactionCount,
          totalAmount: parseFloat(response.data.totalAmount) / 100,
          successfulTransactionCount: response.data.successfulTransactionCount,
          successfulAmount: parseFloat(response.data.successfulAmount) / 100,
          refundedTransactionCount: response.data.refundedTransactionCount,
          refundedAmount: parseFloat(response.data.refundedAmount) / 100,
          transactions: response.data.transactions,
        };
      } else {
        throw new BadRequestException('Failed to fetch reconciliation data');
      }
    } catch (error) {
      this.logger.error('BKM Express reconciliation error:', error.message);
      throw new BadRequestException('Failed to fetch BKM Express reconciliation');
    }
  }

  async createSubscription(params: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    planId: string;
    amount: number;
    currency: string;
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: string;
  }): Promise<any> {
    try {
      this.logger.log(`Creating BKM Express subscription for customer: ${params.customerId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();
      const amountStr = (params.amount * 100).toString();

      const payload = {
        merchantId: this.merchantId,
        customerId: params.customerId,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        planId: params.planId,
        amount: amountStr,
        currencyCode: params.currency === 'USD' ? '840' : params.currency === 'EUR' ? '978' : '949',
        interval: params.interval,
        startDate: params.startDate,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/subscription/create', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`BKM Express subscription created: ${response.data.subscriptionId}`);
        return {
          success: true,
          subscriptionId: response.data.subscriptionId,
          status: response.data.status,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Failed to create subscription');
      }
    } catch (error) {
      this.logger.error('BKM Express subscription error:', error.message);
      throw new BadRequestException('Failed to create BKM Express subscription');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      this.logger.log(`Cancelling BKM Express subscription: ${subscriptionId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        subscriptionId: subscriptionId,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/subscription/cancel', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`BKM Express subscription cancelled: ${subscriptionId}`);
        return {
          success: true,
          subscriptionId: subscriptionId,
          message: response.data.message,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Failed to cancel subscription');
      }
    } catch (error) {
      this.logger.error('BKM Express subscription cancel error:', error.message);
      throw new BadRequestException('Failed to cancel BKM Express subscription');
    }
  }

  private generateSignature(payload: any): string {
    const sortedKeys = Object.keys(payload).sort();
    const dataToSign = sortedKeys
      .map((key) => `${key}=${payload[key]}`)
      .join('&');

    const hash = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(dataToSign)
      .digest('hex');

    return hash.toUpperCase();
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async create3DSecurePayment(request: BKMExpressPaymentRequest & {
    cardNumber: string;
    cardHolderName: string;
    cardExpireMonth: string;
    cardExpireYear: string;
    cardCvv: string;
  }): Promise<any> {
    try {
      this.logger.log(`Creating BKM Express 3D Secure payment for order: ${request.orderId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();
      const totalAmount = (request.amount * 100).toString();

      const payload = {
        merchantId: this.merchantId,
        posnetId: this.merchantPosnetId,
        terminalId: this.terminalId,
        orderId: request.orderId,
        amount: totalAmount,
        currencyCode: request.currency === 'USD' ? '840' : request.currency === 'EUR' ? '978' : '949',
        installment: request.installment?.toString() || '0',
        cardNumber: request.cardNumber.replace(/\s/g, ''),
        cardHolderName: request.cardHolderName,
        cardExpireMonth: request.cardExpireMonth,
        cardExpireYear: request.cardExpireYear,
        cardCvv: request.cardCvv,
        merchantReturnUrl: request.successUrl,
        merchantFailUrl: request.failUrl,
        timestamp: timestamp.toString(),
        nonce: nonce,
        customer: {
          name: request.customerName,
          email: request.customerEmail,
          phoneNumber: request.customerPhone,
          ipAddress: request.customerIpAddress,
        },
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/payment/3dsecure', payload);

      if (response.data.result === 'Success') {
        return {
          success: true,
          redirectUrl: response.data.redirectUrl,
          transactionId: response.data.transactionId,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || '3D Secure payment failed');
      }
    } catch (error) {
      this.logger.error('BKM Express 3D Secure payment error:', error.message);
      throw new BadRequestException('BKM Express 3D Secure payment processing failed');
    }
  }

  async saveCard(params: {
    customerId: string;
    cardNumber: string;
    cardHolderName: string;
    cardExpireMonth: string;
    cardExpireYear: string;
  }): Promise<any> {
    try {
      this.logger.log(`Saving card for customer: ${params.customerId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        customerId: params.customerId,
        cardNumber: params.cardNumber.replace(/\s/g, ''),
        cardHolderName: params.cardHolderName,
        cardExpireMonth: params.cardExpireMonth,
        cardExpireYear: params.cardExpireYear,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/card/save', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`Card saved successfully for customer: ${params.customerId}`);
        return {
          success: true,
          cardToken: response.data.cardToken,
          cardBin: response.data.cardBin,
          cardLastFour: response.data.cardLastFour,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Failed to save card');
      }
    } catch (error) {
      this.logger.error('BKM Express save card error:', error.message);
      throw new BadRequestException('Failed to save card with BKM Express');
    }
  }

  async deleteCard(customerId: string, cardToken: string): Promise<any> {
    try {
      this.logger.log(`Deleting card for customer: ${customerId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        customerId: customerId,
        cardToken: cardToken,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/card/delete', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`Card deleted successfully for customer: ${customerId}`);
        return {
          success: true,
          message: response.data.message,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Failed to delete card');
      }
    } catch (error) {
      this.logger.error('BKM Express delete card error:', error.message);
      throw new BadRequestException('Failed to delete card from BKM Express');
    }
  }

  async getCustomerCards(customerId: string): Promise<any> {
    try {
      this.logger.log(`Fetching cards for customer: ${customerId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();

      const payload = {
        merchantId: this.merchantId,
        customerId: customerId,
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/card/list', payload);

      if (response.data.result === 'Success') {
        return {
          success: true,
          cards: response.data.cards.map((card: any) => ({
            cardToken: card.cardToken,
            cardBin: card.cardBin,
            cardLastFour: card.cardLastFour,
            cardHolderName: card.cardHolderName,
            cardExpireMonth: card.cardExpireMonth,
            cardExpireYear: card.cardExpireYear,
            bankName: card.bankName,
            cardType: card.cardType,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch customer cards');
      }
    } catch (error) {
      this.logger.error('BKM Express get customer cards error:', error.message);
      throw new BadRequestException('Failed to fetch customer cards from BKM Express');
    }
  }

  async payWithSavedCard(params: {
    orderId: string;
    customerId: string;
    cardToken: string;
    amount: number;
    currency: string;
    installment?: number;
  }): Promise<any> {
    try {
      this.logger.log(`Processing payment with saved card for order: ${params.orderId}`);

      const timestamp = new Date().getTime();
      const nonce = this.generateNonce();
      const amountStr = (params.amount * 100).toString();

      const payload = {
        merchantId: this.merchantId,
        posnetId: this.merchantPosnetId,
        terminalId: this.terminalId,
        orderId: params.orderId,
        customerId: params.customerId,
        cardToken: params.cardToken,
        amount: amountStr,
        currencyCode: params.currency === 'USD' ? '840' : params.currency === 'EUR' ? '978' : '949',
        installment: params.installment?.toString() || '0',
        timestamp: timestamp.toString(),
        nonce: nonce,
      };

      const signature = this.generateSignature(payload);
      payload['signature'] = signature;

      const response = await this.apiClient.post('/api/v1/payment/savedcard', payload);

      if (response.data.result === 'Success') {
        this.logger.log(`Payment with saved card successful: ${response.data.transactionId}`);
        return {
          success: true,
          transactionId: response.data.transactionId,
          orderId: params.orderId,
          amount: params.amount,
          status: response.data.status,
        };
      } else {
        throw new BadRequestException(response.data.errorMessage || 'Payment failed');
      }
    } catch (error) {
      this.logger.error('BKM Express saved card payment error:', error.message);
      throw new BadRequestException('Payment with saved card failed');
    }
  }
}

