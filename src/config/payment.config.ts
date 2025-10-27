import { ConfigService } from '@nestjs/config';

export const getPaymentConfig = (configService: ConfigService) => {
  return {
    stripe: {
      secretKey: configService.get('STRIPE_SECRET_KEY'),
      publishableKey: configService.get('STRIPE_PUBLISHABLE_KEY'),
      webhookSecret: configService.get('STRIPE_WEBHOOK_SECRET'),
      currency: configService.get('STRIPE_CURRENCY', 'usd'),
    },
    iyzipay: {
      apiKey: configService.get('IYZIPAY_API_KEY'),
      secretKey: configService.get('IYZIPAY_SECRET_KEY'),
      baseUrl: configService.get('IYZIPAY_BASE_URL', 'https://sandbox-api.iyzipay.com'),
      currency: configService.get('IYZIPAY_CURRENCY', 'TRY'),
    },
    paypal: {
      clientId: configService.get('PAYPAL_CLIENT_ID'),
      clientSecret: configService.get('PAYPAL_CLIENT_SECRET'),
      mode: configService.get('PAYPAL_MODE', 'sandbox'),
      currency: configService.get('PAYPAL_CURRENCY', 'USD'),
    },
    square: {
      applicationId: configService.get('SQUARE_APPLICATION_ID'),
      accessToken: configService.get('SQUARE_ACCESS_TOKEN'),
      environment: configService.get('SQUARE_ENVIRONMENT', 'sandbox'),
      locationId: configService.get('SQUARE_LOCATION_ID'),
    },
  };
};
