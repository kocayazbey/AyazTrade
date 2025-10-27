import { Injectable, BadRequestException } from '@nestjs/common';
import * as Iyzico from 'iyzipay';

@Injectable()
export class IyzicoService {
  private iyzipay: Iyzico;

  constructor() {
    this.iyzipay = new Iyzico({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: process.env.IYZICO_URI || 'https://sandbox-api.iyzipay.com',
    });
  }

  async processPayment(paymentData: {
    amount: number;
    currency: string;
    paymentCard: {
      cardNumber: string;
      expireMonth: string;
      expireYear: string;
      cvc: string;
      cardHolderName: string;
    };
    buyer: {
      id: string;
      name: string;
      surname: string;
      email: string;
      identityNumber: string;
      city: string;
      country: string;
      registrationAddress: string;
      ip: string;
    };
    billingAddress?: {
      contactName: string;
      city: string;
      country: string;
      address: string;
    };
  }) {
    try {
      const { amount, currency, paymentCard, buyer, billingAddress } = paymentData;

      const request = {
        locale: Iyzico.Locale.TR,
        conversationId: `AYZ${Date.now()}`,
        price: amount.toString(),
        paidPrice: amount.toString(),
        currency: currency,
        installment: '1',
        basketId: `BASKET${Date.now()}`,
        paymentChannel: Iyzico.PaymentChannel.WEB,
        paymentGroup: Iyzico.PaymentGroup.PRODUCT,
        callbackUrl: process.env.IYZICO_CALLBACK_URL || 'https://ayaztrade.com/checkout/callback',
        enabledInstallments: [2, 3, 6, 9],
        buyer: {
          id: buyer.id,
          name: buyer.name,
          surname: buyer.surname,
          gsmNumber: (buyer as any).phone || '+905551234567',
          email: buyer.email,
          identityNumber: buyer.identityNumber,
          lastLoginDate: new Date().toISOString(),
          registrationDate: new Date().toISOString(),
          registrationAddress: buyer.registrationAddress,
          ip: buyer.ip,
          city: buyer.city,
          country: buyer.country,
          zipCode: (buyer as any).zipCode || '34000',
        },
        shippingAddress: {
          contactName: buyer.name,
          city: buyer.city,
          country: buyer.country,
          address: buyer.registrationAddress,
        },
        billingAddress: billingAddress || {
          contactName: buyer.name,
          city: buyer.city,
          country: buyer.country,
          address: buyer.registrationAddress,
        },
        basketItems: [
          {
            id: '1',
            name: 'AyazTrade Order',
            category1: 'E-commerce',
            itemType: Iyzico.BasketItemType.PHYSICAL,
            price: amount.toString(),
          },
        ],
        paymentCard: {
          cardHolderName: paymentCard.cardHolderName,
          cardNumber: paymentCard.cardNumber,
          expireMonth: paymentCard.expireMonth,
          expireYear: paymentCard.expireYear,
          cvc: paymentCard.cvc,
          registerCard: '0',
        },
      };

      const payment = await new Promise((resolve, reject) => {
        this.iyzipay.payment.create(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      if ((payment as any).status === 'success') {
        return {
          success: true,
          transactionId: (payment as any).paymentId,
          amount: parseFloat((payment as any).paidPrice),
          currency: (payment as any).currency,
          status: (payment as any).status,
        };
      } else {
        return {
          success: false,
          error: (payment as any).errorMessage || 'Payment failed',
          status: (payment as any).status,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createThreedsPayment(threedsData: {
    amount: number;
    currency: string;
    paymentId: string;
    conversationId: string;
  }) {
    try {
      const { amount, currency, paymentId, conversationId } = threedsData;

      const request = {
        locale: Iyzico.Locale.TR,
        conversationId,
        paymentId,
        paymentData: paymentId,
      };

      const threedsPayment = await new Promise((resolve, reject) => {
        this.iyzipay.threedsPayment.create(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      return {
        success: true,
        htmlContent: (threedsPayment as any).htmlContent,
        status: (threedsPayment as any).status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async refundPayment(paymentId: string, amount: number, reason?: string) {
    try {
      const request = {
        locale: Iyzico.Locale.TR,
        conversationId: `REFUND${Date.now()}`,
        paymentId,
        price: amount.toString(),
        ip: '127.0.0.1',
      };

      const refund = await new Promise((resolve, reject) => {
        this.iyzipay.refund.create(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      if ((refund as any).status === 'success') {
        return {
          success: true,
          refundId: (refund as any).paymentId,
          amount: parseFloat((refund as any).price),
          status: (refund as any).status,
        };
      } else {
        return {
          success: false,
          error: (refund as any).errorMessage || 'Refund failed',
          status: (refund as any).status,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async cancelPayment(paymentId: string, reason?: string) {
    try {
      const request = {
        locale: Iyzico.Locale.TR,
        conversationId: `CANCEL${Date.now()}`,
        paymentId,
        ip: '127.0.0.1',
      };

      const cancel = await new Promise((resolve, reject) => {
        this.iyzipay.cancel.create(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      if ((cancel as any).status === 'success') {
        return {
          success: true,
          cancelId: (cancel as any).paymentId,
          status: (cancel as any).status,
        };
      } else {
        return {
          success: false,
          error: (cancel as any).errorMessage || 'Cancel failed',
          status: (cancel as any).status,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPaymentDetails(paymentId: string) {
    try {
      const request = {
        locale: Iyzico.Locale.TR,
        conversationId: `DETAILS${Date.now()}`,
        paymentId,
      };

      const payment = await new Promise((resolve, reject) => {
        this.iyzipay.payment.retrieve(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      return {
        success: true,
        paymentId: (payment as any).paymentId,
        status: (payment as any).status,
        amount: parseFloat((payment as any).paidPrice),
        currency: (payment as any).currency,
        installment: (payment as any).installment,
        fraudStatus: (payment as any).fraudStatus,
        paidPrice: parseFloat((payment as any).paidPrice),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createBkmPayment(bkmData: {
    amount: number;
    currency: string;
    buyer: {
      id: string;
      name: string;
      surname: string;
      email: string;
      identityNumber: string;
      city: string;
      country: string;
      registrationAddress: string;
      ip: string;
    };
  }) {
    try {
      const { amount, currency, buyer } = bkmData;

      const request = {
        locale: Iyzico.Locale.TR,
        conversationId: `BKM${Date.now()}`,
        price: amount.toString(),
        paidPrice: amount.toString(),
        currency: currency,
        basketId: `BASKET${Date.now()}`,
        paymentGroup: Iyzico.PaymentGroup.PRODUCT,
        buyer: {
          id: buyer.id,
          name: buyer.name,
          surname: buyer.surname,
          gsmNumber: (buyer as any).phone || '+905551234567',
          email: buyer.email,
          identityNumber: buyer.identityNumber,
          lastLoginDate: new Date().toISOString(),
          registrationDate: new Date().toISOString(),
          registrationAddress: buyer.registrationAddress,
          ip: buyer.ip,
          city: buyer.city,
          country: buyer.country,
          zipCode: (buyer as any).zipCode || '34000',
        },
        basketItems: [
          {
            id: '1',
            name: 'AyazTrade Order',
            category1: 'E-commerce',
            itemType: Iyzico.BasketItemType.PHYSICAL,
            price: amount.toString(),
          },
        ],
      };

      const bkmPayment = await new Promise((resolve, reject) => {
        this.iyzipay.bkm.create(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      return {
        success: true,
        token: (bkmPayment as any).token,
        url: (bkmPayment as any).url,
        status: (bkmPayment as any).status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createPayment(paymentData: {
    amount: number;
    currency: string;
    customerInfo: any;
    items: any[];
  }) {
    try {
      // Mock implementation for Iyzico payment
      return {
        success: true,
        paymentId: `iyzico_${Date.now()}`,
        status: 'pending',
        redirectUrl: 'https://sandbox-api.iyzipay.com/payment/3dsecure',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async refund(paymentId: string, amount: number) {
    try {
      // Mock implementation for Iyzico refund
      return {
        success: true,
        refundId: `refund_${Date.now()}`,
        amount,
        status: 'success',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}