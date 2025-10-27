import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { BaseVirtualPOSService, PaymentRequest, PaymentResponse, RefundRequest, RefundResponse, CancelRequest, CancelResponse } from './base-virtual-pos.service';

@Injectable()
export class GarantiPOSService extends BaseVirtualPOSService {
  private merchantId: string;
  private terminalId: string;
  private provUserId: string;
  private provPassword: string;
  private storeKey: string;
  private apiUrl: string;
  private secure3DUrl: string;

  constructor(private configService: ConfigService) {
    super('Garanti');
  }

  initialize(config?: any): void {
    this.merchantId = this.configService.get<string>('GARANTI_MERCHANT_ID');
    this.terminalId = this.configService.get<string>('GARANTI_TERMINAL_ID');
    this.provUserId = this.configService.get<string>('GARANTI_PROV_USER_ID');
    this.provPassword = this.configService.get<string>('GARANTI_PROV_PASSWORD');
    this.storeKey = this.configService.get<string>('GARANTI_STORE_KEY');
    
    const testMode = this.configService.get<boolean>('GARANTI_TEST_MODE', true);
    this.apiUrl = testMode
      ? 'https://sanalposprovtest.garantibbva.com.tr/VPServlet'
      : 'https://sanalposprov.garanti.com.tr/VPServlet';
    this.secure3DUrl = testMode
      ? 'https://sanalposprovtest.garantibbva.com.tr/servlet/gt3dengine'
      : 'https://sanalposprov.garanti.com.tr/servlet/gt3dengine';
  }

  async payment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      this.logRequest('Payment', request);

      if (!this.validateCardNumber(request.cardNumber)) {
        throw new BadRequestException('Invalid card number');
      }

      if (!this.validateExpireDate(request.cardExpireMonth, request.cardExpireYear)) {
        throw new BadRequestException('Invalid expire date');
      }

      const amount = this.formatAmountForBank(request.amount, 2);
      const orderRef = request.orderId;
      const installment = request.installment > 1 ? request.installment.toString().padStart(2, '0') : '';

      const securityData = this.generateSecurityData('sales', amount, orderRef, request.cardNumber);

      const xmlRequest = this.buildPaymentXML({
        mode: 'PROD',
        version: 'v0.01',
        terminal: {
          provUserId: this.provUserId,
          hashData: securityData,
          userId: this.provUserId,
          id: this.terminalId,
          merchantId: this.merchantId,
        },
        customer: {
          ipAddress: '127.0.0.1',
          emailAddress: request.customerEmail,
        },
        card: {
          number: request.cardNumber.replace(/\s/g, ''),
          expireDate: `${request.cardExpireMonth}${request.cardExpireYear}`,
          cvv2: request.cardCvv,
        },
        order: {
          orderID: orderRef,
          groupID: '',
        },
        transaction: {
          type: 'sales',
          installmentCnt: installment,
          amount: amount,
          currencyCode: request.currency === 'USD' ? '840' : request.currency === 'EUR' ? '978' : '949',
          cardHolderName: request.cardHolderName,
          motoInd: 'N',
        },
      });

      const response = await axios.post(this.apiUrl, xmlRequest, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = this.parseXMLResponse(response.data);
      this.logResponse('Payment', result);

      if (result.Transaction.Response.Code === '00') {
        return {
          success: true,
          transactionId: result.Transaction.RetrefNum,
          authCode: result.Transaction.AuthCode,
          provisionNumber: result.Transaction.ProvisionNumber,
          referenceNumber: result.Transaction.RetrefNum,
          rawResponse: result,
        };
      } else {
        return {
          success: false,
          errorCode: result.Transaction.Response.Code,
          errorMessage: result.Transaction.Response.ErrorMsg || result.Transaction.Response.SysErrMsg,
          rawResponse: result,
        };
      }
    } catch (error) {
      this.handleError('Payment', error);
    }
  }

  async payment3D(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      this.logRequest('3D Payment', request);

      if (!this.validateCardNumber(request.cardNumber)) {
        throw new BadRequestException('Invalid card number');
      }

      const amount = this.formatAmountForBank(request.amount, 2);
      const orderRef = request.orderId;
      const installment = request.installment > 1 ? request.installment.toString().padStart(2, '0') : '';

      const successUrl = request.successUrl || `${this.configService.get('APP_URL')}/payment/3d/success`;
      const errorUrl = request.failUrl || `${this.configService.get('APP_URL')}/payment/3d/fail`;

      const securityData = this.generate3DSecurityData(
        this.terminalId,
        orderRef,
        amount,
        successUrl,
        errorUrl,
        'sales',
        installment,
        this.storeKey
      );

      const htmlForm = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>3D Secure Payment</title>
</head>
<body onload="document.forms[0].submit()">
    <form method="post" action="${this.secure3DUrl}">
        <input type="hidden" name="mode" value="PROD">
        <input type="hidden" name="apiversion" value="v0.01">
        <input type="hidden" name="terminalprovuserid" value="${this.provUserId}">
        <input type="hidden" name="terminaluserid" value="${this.provUserId}">
        <input type="hidden" name="terminalmerchantid" value="${this.merchantId}">
        <input type="hidden" name="terminalid" value="${this.terminalId}">
        <input type="hidden" name="txntype" value="sales">
        <input type="hidden" name="txnamount" value="${amount}">
        <input type="hidden" name="txncurrencycode" value="${request.currency === 'USD' ? '840' : request.currency === 'EUR' ? '978' : '949'}">
        <input type="hidden" name="txninstallmentcount" value="${installment}">
        <input type="hidden" name="orderid" value="${orderRef}">
        <input type="hidden" name="successurl" value="${successUrl}">
        <input type="hidden" name="errorurl" value="${errorUrl}">
        <input type="hidden" name="customeremailaddress" value="${request.customerEmail}">
        <input type="hidden" name="customeripaddress" value="127.0.0.1">
        <input type="hidden" name="secure3dhash" value="${securityData}">
        <input type="hidden" name="cardnumber" value="${request.cardNumber.replace(/\s/g, '')}">
        <input type="hidden" name="cardexpiredatemonth" value="${request.cardExpireMonth}">
        <input type="hidden" name="cardexpiredateyear" value="${request.cardExpireYear}">
        <input type="hidden" name="cardcvv2" value="${request.cardCvv}">
        <noscript>
            <button type="submit">Continue to 3D Secure</button>
        </noscript>
    </form>
</body>
</html>`;

      return {
        success: true,
        htmlContent: htmlForm,
        rawResponse: { message: '3D Secure form generated' },
      };
    } catch (error) {
      this.handleError('3D Payment', error);
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    try {
      this.logRequest('Refund', request);

      const amount = this.formatAmountForBank(request.amount, 2);
      const orderRef = request.orderId;

      const securityData = this.generateSecurityData('refund', amount, orderRef);

      const xmlRequest = this.buildPaymentXML({
        mode: 'PROD',
        version: 'v0.01',
        terminal: {
          provUserId: this.provUserId,
          hashData: securityData,
          userId: this.provUserId,
          id: this.terminalId,
          merchantId: this.merchantId,
        },
        customer: {
          ipAddress: '127.0.0.1',
        },
        order: {
          orderID: orderRef,
        },
        transaction: {
          type: 'refund',
          amount: amount,
          currencyCode: request.currency === 'USD' ? '840' : request.currency === 'EUR' ? '978' : '949',
          originalRetrefNum: request.transactionId,
        },
      });

      const response = await axios.post(this.apiUrl, xmlRequest, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = this.parseXMLResponse(response.data);
      this.logResponse('Refund', result);

      if (result.Transaction.Response.Code === '00') {
        return {
          success: true,
          transactionId: result.Transaction.RetrefNum,
          refundId: result.Transaction.RetrefNum,
          amount: request.amount,
          rawResponse: result,
        };
      } else {
        return {
          success: false,
          errorCode: result.Transaction.Response.Code,
          errorMessage: result.Transaction.Response.ErrorMsg || result.Transaction.Response.SysErrMsg,
          rawResponse: result,
        };
      }
    } catch (error) {
      this.handleError('Refund', error);
    }
  }

  async cancel(request: CancelRequest): Promise<CancelResponse> {
    try {
      this.logRequest('Cancel', request);

      const orderRef = request.orderId;
      const securityData = this.generateSecurityData('void', '', orderRef);

      const xmlRequest = this.buildPaymentXML({
        mode: 'PROD',
        version: 'v0.01',
        terminal: {
          provUserId: this.provUserId,
          hashData: securityData,
          userId: this.provUserId,
          id: this.terminalId,
          merchantId: this.merchantId,
        },
        customer: {
          ipAddress: '127.0.0.1',
        },
        order: {
          orderID: orderRef,
        },
        transaction: {
          type: 'void',
          originalRetrefNum: request.transactionId,
        },
      });

      const response = await axios.post(this.apiUrl, xmlRequest, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = this.parseXMLResponse(response.data);
      this.logResponse('Cancel', result);

      if (result.Transaction.Response.Code === '00') {
        return {
          success: true,
          transactionId: result.Transaction.RetrefNum,
          rawResponse: result,
        };
      } else {
        return {
          success: false,
          errorCode: result.Transaction.Response.Code,
          errorMessage: result.Transaction.Response.ErrorMsg || result.Transaction.Response.SysErrMsg,
          rawResponse: result,
        };
      }
    } catch (error) {
      this.handleError('Cancel', error);
    }
  }

  async verifyCallback(data: any): Promise<boolean> {
    try {
      const {
        mdstatus,
        txnstatus,
        hashdata,
        terminalid,
        orderid,
        txnamount,
      } = data;

      if (mdstatus !== '1' && mdstatus !== '2' && mdstatus !== '3' && mdstatus !== '4') {
        this.logger.warn(`Invalid 3D Secure status: ${mdstatus}`);
        return false;
      }

      const calculatedHash = this.generate3DCallbackHash(
        orderid,
        terminalid,
        txnamount,
        txnstatus,
        mdstatus
      );

      if (calculatedHash.toUpperCase() !== hashdata.toUpperCase()) {
        this.logger.error('Hash verification failed for 3D callback');
        return false;
      }

      return txnstatus === 'Y' || txnstatus === 'y';
    } catch (error) {
      this.logger.error('3D callback verification error:', error);
      return false;
    }
  }

  private generateSecurityData(type: string, amount: string, orderRef: string, cardNumber?: string): string {
    const terminalId = this.terminalId.padEnd(9, '0');
    const orderId = orderRef.padEnd(20, '0');
    const amountStr = amount.padEnd(12, '0');
    const provPassword = this.provPassword;

    let hashString = orderId + terminalId + cardNumber?.substring(0, 6) + amountStr + provPassword;
    
    if (type === 'refund' || type === 'void') {
      hashString = orderId + terminalId + amountStr + provPassword;
    }

    const hash = this.generateSHA1Hash(hashString);
    const securityData = hash.toUpperCase();

    return securityData;
  }

  private generate3DSecurityData(
    terminalId: string,
    orderId: string,
    amount: string,
    successUrl: string,
    errorUrl: string,
    type: string,
    installment: string,
    storeKey: string
  ): string {
    const tid = terminalId.padEnd(9, '0');
    const oid = orderId.padEnd(20, '0');
    const amt = amount.padEnd(12, '0');
    const inst = installment.padStart(2, '0');

    const hashString = tid + oid + amt + successUrl + errorUrl + type + inst + storeKey;
    const hash = this.generateSHA1Hash(hashString);

    return hash.toUpperCase();
  }

  private generate3DCallbackHash(
    orderId: string,
    terminalId: string,
    amount: string,
    txnStatus: string,
    mdStatus: string
  ): string {
    const oid = orderId.padEnd(20, '0');
    const tid = terminalId.padEnd(9, '0');
    const amt = amount.padEnd(12, '0');

    const hashString = oid + tid + amt + txnStatus + mdStatus + this.storeKey;
    const hash = this.generateSHA1Hash(hashString);

    return hash.toUpperCase();
  }

  private buildPaymentXML(data: any): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<GVPSRequest>
  <Mode>${data.mode}</Mode>
  <Version>${data.version}</Version>
  <Terminal>
    <ProvUserID>${data.terminal.provUserId}</ProvUserID>
    <HashData>${data.terminal.hashData}</HashData>
    <UserID>${data.terminal.userId}</UserID>
    <ID>${data.terminal.id}</ID>
    <MerchantID>${data.terminal.merchantId}</MerchantID>
  </Terminal>
  ${data.customer ? `<Customer>
    <IPAddress>${data.customer.ipAddress}</IPAddress>
    ${data.customer.emailAddress ? `<EmailAddress>${data.customer.emailAddress}</EmailAddress>` : ''}
  </Customer>` : ''}
  ${data.card ? `<Card>
    <Number>${data.card.number}</Number>
    <ExpireDate>${data.card.expireDate}</ExpireDate>
    <CVV2>${data.card.cvv2}</CVV2>
  </Card>` : ''}
  <Order>
    <OrderID>${data.order.orderID}</OrderID>
    ${data.order.groupID !== undefined ? `<GroupID>${data.order.groupID}</GroupID>` : ''}
  </Order>
  <Transaction>
    <Type>${data.transaction.type}</Type>
    ${data.transaction.installmentCnt ? `<InstallmentCnt>${data.transaction.installmentCnt}</InstallmentCnt>` : ''}
    ${data.transaction.amount ? `<Amount>${data.transaction.amount}</Amount>` : ''}
    ${data.transaction.currencyCode ? `<CurrencyCode>${data.transaction.currencyCode}</CurrencyCode>` : ''}
    ${data.transaction.cardHolderName ? `<CardHolderName>${data.transaction.cardHolderName}</CardHolderName>` : ''}
    ${data.transaction.motoInd ? `<MotoInd>${data.transaction.motoInd}</MotoInd>` : ''}
    ${data.transaction.originalRetrefNum ? `<OriginalRetrefNum>${data.transaction.originalRetrefNum}</OriginalRetrefNum>` : ''}
  </Transaction>
</GVPSRequest>`;
    return xml;
  }

  private parseXMLResponse(xml: string): any {
    const parser = {
      Transaction: {
        Response: {
          Code: this.extractXMLValue(xml, 'Code'),
          ErrorMsg: this.extractXMLValue(xml, 'ErrorMsg'),
          SysErrMsg: this.extractXMLValue(xml, 'SysErrMsg'),
          Message: this.extractXMLValue(xml, 'Message'),
        },
        RetrefNum: this.extractXMLValue(xml, 'RetrefNum'),
        AuthCode: this.extractXMLValue(xml, 'AuthCode'),
        ProvisionNumber: this.extractXMLValue(xml, 'BatchNum'),
      },
    };
    return parser;
  }

  private extractXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }
}

