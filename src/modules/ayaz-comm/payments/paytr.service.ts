import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

export interface PayTRPaymentRequest {
  amount: number;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  basket: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  installment?: number;
  currency?: string;
  successUrl?: string;
  failUrl?: string;
}

export interface PayTRPaymentResponse {
  status: string;
  token: string;
  iframeUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface PayTRRefundRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
}

export interface PayTRInstallmentResponse {
  status: string;
  installments: Array<{
    bank: string;
    cardType: string;
    installmentCount: number;
    totalAmount: number;
    installmentAmount: number;
    commissionRate: number;
  }>;
}

@Injectable()
export class PayTRService {
  private readonly logger = new Logger(PayTRService.name);
  private readonly merchantId: string;
  private readonly merchantKey: string;
  private readonly merchantSalt: string;
  private readonly apiUrl: string;
  private readonly testMode: boolean;

  constructor(private configService: ConfigService) {
    this.merchantId = this.configService.get<string>('PAYTR_MERCHANT_ID');
    this.merchantKey = this.configService.get<string>('PAYTR_MERCHANT_KEY');
    this.merchantSalt = this.configService.get<string>('PAYTR_MERCHANT_SALT');
    this.testMode = this.configService.get<boolean>('PAYTR_TEST_MODE', true);
    this.apiUrl = this.testMode 
      ? 'https://www.paytr.com/odeme/api'
      : 'https://www.paytr.com/odeme/api';
  }

  async createPayment(request: PayTRPaymentRequest): Promise<PayTRPaymentResponse> {
    try {
      const userIp = '127.0.0.1';
      const merchantOid = request.orderId;
      const email = request.customerEmail;
      const paymentAmount = Math.round(request.amount * 100);
      const currency = request.currency || 'TL';
      const testMode = this.testMode ? '1' : '0';
      const noInstallment = request.installment ? '0' : '1';
      const maxInstallment = request.installment || 0;

      const userBasket = Buffer.from(
        JSON.stringify(
          request.basket.map((item) => [
            item.name,
            (item.price * 100).toFixed(2),
            item.quantity,
          ])
        )
      ).toString('base64');

      const timeout_limit = '30';
      const debug_on = this.testMode ? '1' : '0';
      const lang = 'tr';

      const hashStr = `${this.merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}${this.merchantSalt}`;
      const paytrToken = this.generateHash(hashStr);

      const postData = {
        merchant_id: this.merchantId,
        user_ip: userIp,
        merchant_oid: merchantOid,
        email: email,
        payment_amount: paymentAmount,
        user_basket: userBasket,
        paytr_token: paytrToken,
        debug_on: debug_on,
        no_installment: noInstallment,
        max_installment: maxInstallment,
        user_name: request.customerName,
        user_address: request.customerAddress,
        user_phone: request.customerPhone,
        merchant_ok_url: request.successUrl || `${this.configService.get('APP_URL')}/payment/success`,
        merchant_fail_url: request.failUrl || `${this.configService.get('APP_URL')}/payment/fail`,
        timeout_limit: timeout_limit,
        currency: currency,
        test_mode: testMode,
        lang: lang,
      };

      this.logger.log(`Creating PayTR payment for order: ${merchantOid}`);

      const response = await axios.post(`${this.apiUrl}/get-token`, postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(data) => {
          return Object.keys(data)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
        }],
      });

      if (response.data.status === 'success') {
        this.logger.log(`PayTR payment token created: ${response.data.token}`);
        return {
          status: 'success',
          token: response.data.token,
          iframeUrl: `https://www.paytr.com/odeme/guvenli/${response.data.token}`,
        };
      } else {
        this.logger.error(`PayTR payment failed: ${response.data.reason}`);
        throw new BadRequestException(response.data.reason || 'Payment creation failed');
      }
    } catch (error) {
      this.logger.error(`PayTR payment error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Payment processing failed');
    }
  }

  async verifyCallback(postData: any): Promise<boolean> {
    try {
      const {
        merchant_oid,
        status,
        total_amount,
        hash,
      } = postData;

      const hashStr = `${merchant_oid}${this.merchantSalt}${status}${total_amount}`;
      const calculatedHash = this.generateHash(hashStr);

      if (calculatedHash !== hash) {
        this.logger.error('PayTR callback hash verification failed');
        return false;
      }

      if (status === 'success') {
        this.logger.log(`PayTR payment verified successfully for order: ${merchant_oid}`);
        return true;
      }

      this.logger.warn(`PayTR payment status is not success: ${status}`);
      return false;
    } catch (error) {
      this.logger.error(`PayTR callback verification error: ${error.message}`, error.stack);
      return false;
    }
  }

  async refund(request: PayTRRefundRequest): Promise<any> {
    try {
      const merchantOid = request.transactionId;
      const refundAmount = request.amount ? Math.round(request.amount * 100) : undefined;
      const refundReason = request.reason || 'Müşteri talebi';

      const hashStr = `${this.merchantId}${merchantOid}${refundAmount || ''}${this.merchantSalt}`;
      const paytrToken = this.generateHash(hashStr);

      const postData: any = {
        merchant_id: this.merchantId,
        merchant_oid: merchantOid,
        paytr_token: paytrToken,
        return_amount: refundAmount,
        reference_no: merchantOid,
        reason: refundReason,
      };

      this.logger.log(`Processing PayTR refund for transaction: ${merchantOid}`);

      const response = await axios.post(`${this.apiUrl}/return`, postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(data) => {
          return Object.keys(data)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
        }],
      });

      if (response.data.status === 'success') {
        this.logger.log(`PayTR refund successful: ${merchantOid}`);
        return {
          status: 'success',
          transactionId: merchantOid,
          amount: refundAmount / 100,
          message: response.data.message,
        };
      } else {
        this.logger.error(`PayTR refund failed: ${response.data.err_msg}`);
        throw new BadRequestException(response.data.err_msg || 'Refund failed');
      }
    } catch (error) {
      this.logger.error(`PayTR refund error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Refund processing failed');
    }
  }

  async getInstallments(binNumber: string, amount: number): Promise<PayTRInstallmentResponse> {
    try {
      const paymentAmount = Math.round(amount * 100);

      const hashStr = `${this.merchantId}${paymentAmount}${binNumber}${this.merchantSalt}`;
      const paytrToken = this.generateHash(hashStr);

      const postData = {
        merchant_id: this.merchantId,
        bin_number: binNumber,
        payment_amount: paymentAmount,
        paytr_token: paytrToken,
      };

      this.logger.log(`Fetching PayTR installments for BIN: ${binNumber}`);

      const response = await axios.post(`${this.apiUrl}/installment`, postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(data) => {
          return Object.keys(data)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
        }],
      });

      if (response.data.status === 'success') {
        return {
          status: 'success',
          installments: response.data.installment_list || [],
        };
      } else {
        throw new BadRequestException('Failed to fetch installments');
      }
    } catch (error) {
      this.logger.error(`PayTR installments error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch installment options');
    }
  }

  async checkTransaction(orderId: string): Promise<any> {
    try {
      const hashStr = `${this.merchantId}${orderId}${this.merchantSalt}`;
      const paytrToken = this.generateHash(hashStr);

      const postData = {
        merchant_id: this.merchantId,
        merchant_oid: orderId,
        paytr_token: paytrToken,
      };

      this.logger.log(`Checking PayTR transaction status: ${orderId}`);

      const response = await axios.post(`${this.apiUrl}/query`, postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(data) => {
          return Object.keys(data)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
        }],
      });

      return {
        status: response.data.status,
        transactionStatus: response.data.payment_status,
        amount: response.data.payment_amount / 100,
        currency: response.data.currency,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`PayTR transaction check error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to check transaction status');
    }
  }

  async getBinInfo(binNumber: string): Promise<any> {
    try {
      const hashStr = `${binNumber}${this.merchantSalt}`;
      const paytrToken = this.generateHash(hashStr);

      const postData = {
        bin_number: binNumber,
        paytr_token: paytrToken,
      };

      const response = await axios.post(`${this.apiUrl}/bin`, postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(data) => {
          return Object.keys(data)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
        }],
      });

      if (response.data.status === 'success') {
        return {
          status: 'success',
          bank: response.data.bank_name,
          cardType: response.data.card_type,
          cardFamily: response.data.card_family,
          commercial: response.data.commercial === '1',
        };
      } else {
        throw new BadRequestException('Failed to fetch BIN info');
      }
    } catch (error) {
      this.logger.error(`PayTR BIN info error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch card info');
    }
  }

  private generateHash(data: string): string {
    return crypto
      .createHmac('sha256', this.merchantKey)
      .update(data)
      .digest('base64');
  }

  async create3DSecurePayment(request: PayTRPaymentRequest & {
    cardNumber: string;
    cardHolderName: string;
    cardExpireMonth: string;
    cardExpireYear: string;
    cardCvv: string;
  }): Promise<any> {
    try {
      const userIp = '127.0.0.1';
      const merchantOid = request.orderId;
      const paymentAmount = Math.round(request.amount * 100);

      const hashStr = `${this.merchantId}${userIp}${merchantOid}${request.customerEmail}${paymentAmount}${this.merchantSalt}`;
      const paytrToken = this.generateHash(hashStr);

      const postData = {
        merchant_id: this.merchantId,
        user_ip: userIp,
        merchant_oid: merchantOid,
        email: request.customerEmail,
        payment_amount: paymentAmount,
        paytr_token: paytrToken,
        card_number: request.cardNumber.replace(/\s/g, ''),
        card_holder_name: request.cardHolderName,
        expiry_month: request.cardExpireMonth,
        expiry_year: request.cardExpireYear,
        cvv: request.cardCvv,
        installment_count: request.installment || 0,
        currency: request.currency || 'TL',
        test_mode: this.testMode ? '1' : '0',
      };

      const response = await axios.post(`${this.apiUrl}/3d-payment`, postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(data) => {
          return Object.keys(data)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
            .join('&');
        }],
      });

      if (response.data.status === 'success') {
        return {
          status: 'success',
          redirectUrl: response.data.redirect_url,
          transactionId: response.data.transaction_id,
        };
      } else {
        throw new BadRequestException(response.data.err_msg || '3D Secure payment failed');
      }
    } catch (error) {
      this.logger.error(`PayTR 3D Secure payment error: ${error.message}`, error.stack);
      throw new BadRequestException('3D Secure payment processing failed');
    }
  }
}

