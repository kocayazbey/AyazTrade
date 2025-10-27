import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface VirtualPOSConfig {
  merchantId: string;
  terminalId: string;
  username: string;
  password: string;
  storeKey?: string;
  apiUrl: string;
  testMode: boolean;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  installment: number;
  cardNumber: string;
  cardHolderName: string;
  cardExpireMonth: string;
  cardExpireYear: string;
  cardCvv: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  customerCountry?: string;
  successUrl?: string;
  failUrl?: string;
  callbackUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  referenceNumber?: string;
  authCode?: string;
  provisionNumber?: string;
  errorCode?: string;
  errorMessage?: string;
  htmlContent?: string;
  redirectUrl?: string;
  rawResponse?: any;
}

export interface RefundRequest {
  transactionId: string;
  orderId: string;
  amount?: number;
  currency?: string;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  transactionId?: string;
  refundId?: string;
  amount?: number;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface CancelRequest {
  transactionId: string;
  orderId: string;
  authCode?: string;
}

export interface CancelResponse {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export abstract class BaseVirtualPOSService {
  protected readonly logger: Logger;
  protected config: VirtualPOSConfig;

  constructor(protected readonly bankName: string) {
    this.logger = new Logger(`${bankName}VirtualPOS`);
  }

  abstract initialize(config: VirtualPOSConfig): void;
  abstract payment(request: PaymentRequest): Promise<PaymentResponse>;
  abstract payment3D(request: PaymentRequest): Promise<PaymentResponse>;
  abstract refund(request: RefundRequest): Promise<RefundResponse>;
  abstract cancel(request: CancelRequest): Promise<CancelResponse>;
  abstract verifyCallback(data: any): Promise<boolean>;

  protected generateSHA256Hash(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  protected generateSHA1Hash(data: string): string {
    return crypto.createHash('sha1').update(data, 'utf8').digest('hex');
  }

  protected generateMD5Hash(data: string): string {
    return crypto.createHash('md5').update(data, 'utf8').digest('hex');
  }

  protected generateHMAC(key: string, data: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, key).update(data).digest('hex');
  }

  protected generateBase64HMAC(key: string, data: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('base64');
  }

  protected formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  protected formatAmountForBank(amount: number, decimals: number = 2): string {
    return (amount * Math.pow(10, decimals)).toFixed(0);
  }

  protected maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 10) return '****';
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    return `${first6}******${last4}`;
  }

  protected validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  protected validateExpireDate(month: string, year: string): boolean {
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    
    const expireYear = parseInt(year, 10);
    const expireMonth = parseInt(month, 10);
    
    if (expireMonth < 1 || expireMonth > 12) return false;
    if (expireYear < currentYear) return false;
    if (expireYear === currentYear && expireMonth < currentMonth) return false;
    
    return true;
  }

  protected sanitizeInput(input: string): string {
    return input.replace(/[<>\"']/g, '');
  }

  protected logRequest(operation: string, data: any): void {
    const sanitized = { ...data };
    if (sanitized.cardNumber) sanitized.cardNumber = this.maskCardNumber(sanitized.cardNumber);
    if (sanitized.cardCvv) sanitized.cardCvv = '***';
    if (sanitized.password) sanitized.password = '***';
    
    this.logger.debug(`${operation} Request:`, JSON.stringify(sanitized, null, 2));
  }

  protected logResponse(operation: string, response: any): void {
    this.logger.debug(`${operation} Response:`, JSON.stringify(response, null, 2));
  }

  protected handleError(operation: string, error: any): never {
    this.logger.error(`${operation} Error:`, error.message, error.stack);
    throw error;
  }
}

