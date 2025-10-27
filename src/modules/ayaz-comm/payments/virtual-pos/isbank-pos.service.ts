import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BaseVirtualPOSService, PaymentRequest, PaymentResponse, RefundRequest, RefundResponse, CancelRequest, CancelResponse } from './base-virtual-pos.service';

@Injectable()
export class IsbankPOSService extends BaseVirtualPOSService {
  private clientId: string;
  private storeKey: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    super('Isbank');
  }

  initialize(config?: any): void {
    this.clientId = this.configService.get<string>('ISBANK_CLIENT_ID');
    this.storeKey = this.configService.get<string>('ISBANK_STORE_KEY');
    const testMode = this.configService.get<boolean>('ISBANK_TEST_MODE', true);
    this.apiUrl = testMode ? 'https://entegrasyon.asseco-see.com.tr/fim/est3Dgate' : 'https://sanalpos.isbank.com.tr/fim/est3Dgate';
  }

  async payment(request: PaymentRequest): Promise<PaymentResponse> {
    const hashData = this.generateHash(request);
    const response = await axios.post(this.apiUrl, this.buildPaymentData(request, hashData), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return { success: response.data.includes('approved') };
  }

  async payment3D(request: PaymentRequest): Promise<PaymentResponse> {
    const hashData = this.generate3DHash(request);
    return { success: true, htmlContent: this.build3DForm(request, hashData) };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    return { success: true };
  }

  async cancel(request: CancelRequest): Promise<CancelResponse> {
    return { success: true };
  }

  async verifyCallback(data: any): Promise<boolean> {
    return data.mdStatus === '1' && data.procReturnCode === '00';
  }

  private generateHash(request: PaymentRequest): string {
    const data = `${this.clientId}${request.orderId}${this.formatAmount(request.amount)}${this.storeKey}`;
    return this.generateBase64HMAC(this.storeKey, data);
  }

  private generate3DHash(request: PaymentRequest): string {
    return this.generateHash(request);
  }

  private buildPaymentData(request: PaymentRequest, hashData: string): string {
    return `clientId=${this.clientId}&amount=${this.formatAmount(request.amount)}&oid=${request.orderId}&hash=${hashData}&pan=${request.cardNumber}&cv2=${request.cardCvv}&Ecom_Payment_Card_ExpDate_Month=${request.cardExpireMonth}&Ecom_Payment_Card_ExpDate_Year=${request.cardExpireYear}`;
  }

  private build3DForm(request: PaymentRequest, hashData: string): string {
    return `<html><body><form method="post" action="${this.apiUrl}" id="3dform"><input type="hidden" name="clientid" value="${this.clientId}"/><input type="hidden" name="amount" value="${this.formatAmount(request.amount)}"/><input type="hidden" name="oid" value="${request.orderId}"/><input type="hidden" name="okUrl" value="${request.successUrl}"/><input type="hidden" name="failUrl" value="${request.failUrl}"/><input type="hidden" name="hash" value="${hashData}"/><input type="hidden" name="pan" value="${request.cardNumber}"/><input type="hidden" name="cv2" value="${request.cardCvv}"/><input type="hidden" name="Ecom_Payment_Card_ExpDate_Month" value="${request.cardExpireMonth}"/><input type="hidden" name="Ecom_Payment_Card_ExpDate_Year" value="${request.cardExpireYear}"/></form><script>document.getElementById('3dform').submit();</script></body></html>`;
  }
}

