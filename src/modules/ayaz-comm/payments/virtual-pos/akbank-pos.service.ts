import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BaseVirtualPOSService, PaymentRequest, PaymentResponse, RefundRequest, RefundResponse, CancelRequest, CancelResponse } from './base-virtual-pos.service';

@Injectable()
export class AkbankPOSService extends BaseVirtualPOSService {
  private merchantId: string;
  private terminalId: string;
  private storeKey: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    super('Akbank');
  }

  initialize(config?: any): void {
    this.merchantId = this.configService.get<string>('AKBANK_MERCHANT_ID');
    this.terminalId = this.configService.get<string>('AKBANK_TERMINAL_ID');
    this.storeKey = this.configService.get<string>('AKBANK_STORE_KEY');
    const testMode = this.configService.get<boolean>('AKBANK_TEST_MODE', true);
    this.apiUrl = testMode ? 'https://testpayment.akbank.com' : 'https://virtualpayment.akbank.com';
  }

  async payment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const hashData = this.generateHash(request);
      const xmlRequest = this.buildPaymentXML(request, hashData);
      const response = await axios.post(`${this.apiUrl}/fim/est3Dgate`, xmlRequest, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const result = this.parseResponse(response.data);
      return {
        success: result.ProcReturnCode === '00',
        transactionId: result.TransId,
        authCode: result.AuthCode,
        errorCode: result.ProcReturnCode,
        errorMessage: result.ErrMsg,
        rawResponse: result,
      };
    } catch (error) {
      this.handleError('Payment', error);
    }
  }

  async payment3D(request: PaymentRequest): Promise<PaymentResponse> {
    const hashData = this.generate3DHash(request);
    return {
      success: true,
      htmlContent: this.build3DForm(request, hashData),
    };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const hashData = this.generateRefundHash(request);
    const response = await axios.post(`${this.apiUrl}/fim/api`, {
      merchantId: this.merchantId,
      terminalId: this.terminalId,
      orderId: request.orderId,
      amount: this.formatAmount(request.amount),
      currency: request.currency,
      transactionType: 'Refund',
      hashData,
    });
    return { success: response.data.status === 'success' };
  }

  async cancel(request: CancelRequest): Promise<CancelResponse> {
    return { success: true };
  }

  async verifyCallback(data: any): Promise<boolean> {
    return data.mdStatus === '1' && data.procReturnCode === '00';
  }

  private generateHash(request: PaymentRequest): string {
    const data = `${this.merchantId}${request.orderId}${this.formatAmount(request.amount)}${this.storeKey}`;
    return this.generateSHA256Hash(data);
  }

  private generate3DHash(request: PaymentRequest): string {
    return this.generateHash(request);
  }

  private generateRefundHash(request: RefundRequest): string {
    const data = `${this.merchantId}${request.orderId}${this.formatAmount(request.amount)}${this.storeKey}`;
    return this.generateSHA256Hash(data);
  }

  private buildPaymentXML(request: PaymentRequest, hashData: string): string {
    return `clientId=${this.merchantId}&amount=${this.formatAmount(request.amount)}&oid=${request.orderId}&hash=${hashData}`;
  }

  private build3DForm(request: PaymentRequest, hashData: string): string {
    return `<html><body><form method="post" action="${this.apiUrl}/fim/est3Dgate" id="form"><input type="hidden" name="clientId" value="${this.merchantId}"/><input type="hidden" name="amount" value="${this.formatAmount(request.amount)}"/><input type="hidden" name="oid" value="${request.orderId}"/><input type="hidden" name="hash" value="${hashData}"/></form><script>document.getElementById('form').submit();</script></body></html>`;
  }

  private parseResponse(data: any): any {
    return typeof data === 'string' ? JSON.parse(data) : data;
  }
}

