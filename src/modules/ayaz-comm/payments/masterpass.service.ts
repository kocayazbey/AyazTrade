import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface MasterpassPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIpAddress: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  successUrl: string;
  failUrl: string;
  sendSmsLanguage?: 'tur' | 'eng';
  sendSms?: boolean;
  token?: string;
  referenceNo?: string;
}

export interface MasterpassPaymentResponse {
  success: boolean;
  token?: string;
  url3D?: string;
  transactionId?: string;
  error?: string;
  errorCode?: string;
}

export interface MasterpassPurchaseRequest {
  token: string;
  msisdn: string;
  amount: number;
  currency: string;
  orderId: string;
  installmentCount?: number;
  listAccountName?: string;
  sendSmsMerchant?: boolean;
  sendSms?: boolean;
}

export interface MasterpassPurchaseResponse {
  success: boolean;
  returnCode?: string;
  responseCode?: string;
  responseDescription?: string;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  error?: string;
}

@Injectable()
export class MasterpassService {
  private readonly logger = new Logger(MasterpassService.name);
  private apiClient: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private baseUrl: string;
  private testMode: boolean;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('MASTERPASS_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('MASTERPASS_CLIENT_SECRET');
    this.username = this.configService.get<string>('MASTERPASS_USERNAME');
    this.password = this.configService.get<string>('MASTERPASS_PASSWORD');
    this.testMode = this.configService.get<boolean>('MASTERPASS_TEST_MODE', true);
    
    this.baseUrl = this.testMode
      ? 'https://test.masterpassturkiye.com'
      : 'https://www.masterpassturkiye.com';

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
        this.logger.debug(`Masterpass API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Masterpass API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Masterpass API Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('Masterpass API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async checkMasterpass(msisdn: string, amount: number, orderId: string): Promise<any> {
    try {
      this.logger.log(`Checking Masterpass for: ${msisdn}`);

      const token = this.generateToken();
      const amountStr = (amount * 100).toFixed(0);

      const payload = {
        clientId: this.clientId,
        sendSmsLanguage: 'tur',
        sendSms: 'N',
        referenceNo: orderId,
        msisdn: msisdn,
        amount: amountStr,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/checkMasterPass', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass check successful for: ${msisdn}`);
        return {
          success: true,
          accountStatus: response.data.accountStatus,
          masterpassAccount: response.data.accountAliasName,
          cards: response.data.cardList?.map((card: any) => ({
            name: card.name,
            alias: card.alias,
            value: card.value,
            bank: card.bank,
          })) || [],
          token: response.data.token,
        };
      } else {
        this.logger.warn(`Masterpass check failed: ${response.data.responseDescription}`);
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass check error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass check failed');
    }
  }

  async linkAccount(msisdn: string, accountAliasName: string, token?: string): Promise<any> {
    try {
      this.logger.log(`Linking Masterpass account for: ${msisdn}`);

      const generatedToken = token || this.generateToken();

      const payload = {
        clientId: this.clientId,
        msisdn: msisdn,
        accountAliasName: accountAliasName,
        token: generatedToken,
        sendSmsLanguage: 'tur',
        sendSms: 'Y',
      };

      const response = await this.apiClient.post('/remote/api/v2/linkCardToClient', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass account linked successfully for: ${msisdn}`);
        return {
          success: true,
          token: response.data.token,
          url3D: response.data.url3D,
          message: response.data.responseDescription,
        };
      } else {
        this.logger.warn(`Masterpass link failed: ${response.data.responseDescription}`);
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass link error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass account linking failed');
    }
  }

  async unlinkAccount(msisdn: string, accountAliasName: string): Promise<any> {
    try {
      this.logger.log(`Unlinking Masterpass account for: ${msisdn}`);

      const token = this.generateToken();

      const payload = {
        clientId: this.clientId,
        msisdn: msisdn,
        accountAliasName: accountAliasName,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/unlinkCardToClient', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass account unlinked successfully for: ${msisdn}`);
        return {
          success: true,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass unlink error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass account unlinking failed');
    }
  }

  async deleteCard(msisdn: string, accountAliasName: string, cardAliasName: string): Promise<any> {
    try {
      this.logger.log(`Deleting Masterpass card for: ${msisdn}`);

      const token = this.generateToken();

      const payload = {
        clientId: this.clientId,
        msisdn: msisdn,
        accountAliasName: accountAliasName,
        cardAliasName: cardAliasName,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/deleteCard', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass card deleted successfully for: ${msisdn}`);
        return {
          success: true,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass delete card error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass card deletion failed');
    }
  }

  async registerCard(params: {
    msisdn: string;
    accountAliasName: string;
    rtaPan: string;
    expiryDate: string;
    cvc: string;
    cardHolderName: string;
    cardAlias?: string;
  }): Promise<any> {
    try {
      this.logger.log(`Registering Masterpass card for: ${params.msisdn}`);

      const token = this.generateToken();

      const payload = {
        clientId: this.clientId,
        msisdn: params.msisdn,
        accountAliasName: params.accountAliasName,
        rtaPan: params.rtaPan,
        expiryDate: params.expiryDate,
        cvc: params.cvc,
        cardHolderName: params.cardHolderName,
        cardAlias: params.cardAlias || `Card_${Date.now()}`,
        token: token,
        sendSmsLanguage: 'tur',
        sendSms: 'Y',
      };

      const response = await this.apiClient.post('/remote/api/v2/register', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass card registered successfully for: ${params.msisdn}`);
        return {
          success: true,
          token: response.data.token,
          url3D: response.data.url3D,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass register card error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass card registration failed');
    }
  }

  async purchase(request: MasterpassPurchaseRequest): Promise<MasterpassPurchaseResponse> {
    try {
      this.logger.log(`Processing Masterpass purchase for order: ${request.orderId}`);

      const amountStr = (request.amount * 100).toFixed(0);
      const installment = request.installmentCount || 0;

      const payload = {
        clientId: this.clientId,
        token: request.token,
        msisdn: request.msisdn,
        amount: amountStr,
        orderNo: request.orderId,
        installmentCount: installment.toString(),
        listAccountName: request.listAccountName || '',
        sendSmsMerchant: request.sendSmsMerchant ? 'Y' : 'N',
        sendSms: request.sendSms ? 'Y' : 'N',
      };

      const response = await this.apiClient.post('/remote/api/v2/purchase', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass purchase successful for order: ${request.orderId}`);
        return {
          success: true,
          returnCode: response.data.returnCode,
          responseCode: response.data.responseCode,
          responseDescription: response.data.responseDescription,
          orderId: response.data.orderNo,
          transactionId: response.data.transactionId,
          amount: parseFloat(response.data.amount) / 100,
        };
      } else {
        this.logger.error(`Masterpass purchase failed: ${response.data.responseDescription}`);
        return {
          success: false,
          responseCode: response.data.responseCode,
          error: response.data.responseDescription,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass purchase error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass purchase failed');
    }
  }

  async purchase3D(params: {
    token: string;
    msisdn: string;
    amount: number;
    orderId: string;
    installmentCount?: number;
    listAccountName?: string;
  }): Promise<any> {
    try {
      this.logger.log(`Processing Masterpass 3D purchase for order: ${params.orderId}`);

      const amountStr = (params.amount * 100).toFixed(0);
      const installment = params.installmentCount || 0;

      const payload = {
        clientId: this.clientId,
        token: params.token,
        msisdn: params.msisdn,
        amount: amountStr,
        orderNo: params.orderId,
        installmentCount: installment.toString(),
        listAccountName: params.listAccountName || '',
      };

      const response = await this.apiClient.post('/remote/api/v2/purchase3D', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass 3D purchase initiated for order: ${params.orderId}`);
        return {
          success: true,
          url3D: response.data.url3D,
          token: response.data.token,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass 3D purchase error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass 3D purchase failed');
    }
  }

  async completePurchase(token: string): Promise<any> {
    try {
      this.logger.log('Completing Masterpass purchase');

      const payload = {
        clientId: this.clientId,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/completePurchase', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log('Masterpass purchase completed successfully');
        return {
          success: true,
          returnCode: response.data.returnCode,
          orderId: response.data.orderNo,
          transactionId: response.data.transactionId,
          amount: parseFloat(response.data.amount) / 100,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass complete purchase error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass purchase completion failed');
    }
  }

  async refund(params: {
    transactionId: string;
    amount: number;
    currency: string;
  }): Promise<any> {
    try {
      this.logger.log(`Processing Masterpass refund for transaction: ${params.transactionId}`);

      const token = this.generateToken();
      const amountStr = (params.amount * 100).toFixed(0);

      const payload = {
        clientId: this.clientId,
        transactionId: params.transactionId,
        amount: amountStr,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/refund', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass refund successful for transaction: ${params.transactionId}`);
        return {
          success: true,
          refundTransactionId: response.data.refundTransactionId,
          amount: params.amount,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass refund error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass refund failed');
    }
  }

  async queryTransaction(transactionId: string): Promise<any> {
    try {
      this.logger.log(`Querying Masterpass transaction: ${transactionId}`);

      const token = this.generateToken();

      const payload = {
        clientId: this.clientId,
        transactionId: transactionId,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/queryTransaction', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        return {
          success: true,
          transactionId: response.data.transactionId,
          orderId: response.data.orderNo,
          amount: parseFloat(response.data.amount) / 100,
          status: response.data.transactionStatus,
          currency: response.data.currency,
          installmentCount: response.data.installmentCount,
          cardBin: response.data.cardBin,
          cardLast4: response.data.cardLast4,
          transactionDate: response.data.transactionDate,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass query transaction error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass transaction query failed');
    }
  }

  async getInstallments(binNumber: string, amount: number): Promise<any> {
    try {
      this.logger.log(`Getting Masterpass installments for BIN: ${binNumber}`);

      const token = this.generateToken();
      const amountStr = (amount * 100).toFixed(0);

      const payload = {
        clientId: this.clientId,
        binNumber: binNumber,
        amount: amountStr,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/getInstallments', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        return {
          success: true,
          bankName: response.data.bankName,
          cardType: response.data.cardType,
          commercial: response.data.commercial,
          installments: response.data.installmentList?.map((inst: any) => ({
            count: inst.installmentCount,
            totalAmount: parseFloat(inst.totalAmount) / 100,
            installmentAmount: parseFloat(inst.installmentAmount) / 100,
            commissionRate: inst.commissionRate,
          })) || [],
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass installments error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass installments fetch failed');
    }
  }

  async resendOTP(params: {
    token: string;
    sendSmsLanguage?: 'tur' | 'eng';
    msisdn?: string;
  }): Promise<any> {
    try {
      this.logger.log('Resending Masterpass OTP');

      const payload = {
        clientId: this.clientId,
        token: params.token,
        sendSmsLanguage: params.sendSmsLanguage || 'tur',
        msisdn: params.msisdn,
      };

      const response = await this.apiClient.post('/remote/api/v2/resendOtp', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log('Masterpass OTP resent successfully');
        return {
          success: true,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass resend OTP error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass OTP resend failed');
    }
  }

  async validateTransaction(validationCode: string, referenceNo: string): Promise<any> {
    try {
      this.logger.log(`Validating Masterpass transaction: ${referenceNo}`);

      const token = this.generateToken();

      const payload = {
        clientId: this.clientId,
        validationCode: validationCode,
        referenceNo: referenceNo,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/validateTransaction', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log('Masterpass transaction validated successfully');
        return {
          success: true,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass validate transaction error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass transaction validation failed');
    }
  }

  async listCards(msisdn: string, accountAliasName: string): Promise<any> {
    try {
      this.logger.log(`Listing Masterpass cards for: ${msisdn}`);

      const token = this.generateToken();

      const payload = {
        clientId: this.clientId,
        msisdn: msisdn,
        accountAliasName: accountAliasName,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/listCards', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        return {
          success: true,
          cards: response.data.cards?.map((card: any) => ({
            name: card.name,
            alias: card.alias,
            value: card.value,
            bank: card.bank,
            cardBrand: card.cardBrand,
            isDefault: card.isDefault,
          })) || [],
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass list cards error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass cards listing failed');
    }
  }

  async updateUser(params: {
    msisdn: string;
    accountAliasName: string;
    email?: string;
    name?: string;
    surname?: string;
  }): Promise<any> {
    try {
      this.logger.log(`Updating Masterpass user: ${params.msisdn}`);

      const token = this.generateToken();

      const payload = {
        clientId: this.clientId,
        msisdn: params.msisdn,
        accountAliasName: params.accountAliasName,
        email: params.email,
        name: params.name,
        surname: params.surname,
        token: token,
      };

      const response = await this.apiClient.post('/remote/api/v2/updateUser', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass user updated successfully: ${params.msisdn}`);
        return {
          success: true,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass update user error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass user update failed');
    }
  }

  private generateToken(): string {
    const timestamp = Date.now().toString();
    const randomStr = crypto.randomBytes(16).toString('hex');
    const dataToHash = `${this.clientId}${timestamp}${randomStr}${this.clientSecret}`;
    
    return crypto
      .createHash('sha256')
      .update(dataToHash)
      .digest('hex')
      .toUpperCase();
  }

  async verifyCallback(data: any): Promise<boolean> {
    try {
      const {
        clientId,
        orderId,
        amount,
        responseCode,
        transactionId,
        token,
      } = data;

      if (clientId !== this.clientId) {
        this.logger.error('Masterpass callback client ID mismatch');
        return false;
      }

      if (responseCode === '0000') {
        this.logger.log(`Masterpass payment verified successfully for order: ${orderId}`);
        return true;
      }

      this.logger.warn(`Masterpass payment verification failed with code: ${responseCode}`);
      return false;
    } catch (error) {
      this.logger.error(`Masterpass callback verification error: ${error.message}`, error.stack);
      return false;
    }
  }

  async directPurchase(params: {
    msisdn: string;
    accountAliasName: string;
    listAccountName: string;
    amount: number;
    orderId: string;
    installmentCount?: number;
    sendSms?: boolean;
  }): Promise<any> {
    try {
      this.logger.log(`Processing Masterpass direct purchase for order: ${params.orderId}`);

      const token = this.generateToken();
      const amountStr = (params.amount * 100).toFixed(0);

      const payload = {
        clientId: this.clientId,
        token: token,
        msisdn: params.msisdn,
        accountAliasName: params.accountAliasName,
        listAccountName: params.listAccountName,
        amount: amountStr,
        orderNo: params.orderId,
        installmentCount: (params.installmentCount || 0).toString(),
        sendSms: params.sendSms ? 'Y' : 'N',
      };

      const response = await this.apiClient.post('/remote/api/v2/directPurchase', payload, {
        auth: {
          username: this.username,
          password: this.password,
        },
      });

      if (response.data.responseCode === '0000') {
        this.logger.log(`Masterpass direct purchase successful for order: ${params.orderId}`);
        return {
          success: true,
          returnCode: response.data.returnCode,
          orderId: response.data.orderNo,
          transactionId: response.data.transactionId,
          amount: parseFloat(response.data.amount) / 100,
          message: response.data.responseDescription,
        };
      } else {
        return {
          success: false,
          error: response.data.responseDescription,
          errorCode: response.data.responseCode,
        };
      }
    } catch (error) {
      this.logger.error(`Masterpass direct purchase error: ${error.message}`, error.stack);
      throw new BadRequestException('Masterpass direct purchase failed');
    }
  }
}

