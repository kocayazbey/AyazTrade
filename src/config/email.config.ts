import { ConfigService } from '@nestjs/config';

export const getEmailConfig = (configService: ConfigService) => {
  return {
    transport: {
      host: configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: configService.get('SMTP_PORT', 587),
      secure: configService.get('SMTP_SECURE', false),
      auth: {
        user: configService.get('SMTP_USER'),
        pass: configService.get('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: configService.get('SMTP_TLS_REJECT_UNAUTHORIZED', false),
      },
    },
    defaults: {
      from: configService.get('EMAIL_FROM', 'noreply@ayaztrade.com'),
      replyTo: configService.get('EMAIL_REPLY_TO', 'support@ayaztrade.com'),
    },
    template: {
      dir: configService.get('EMAIL_TEMPLATE_DIR', './templates/email'),
      options: {
        strict: true,
      },
    },
    sendgrid: {
      apiKey: configService.get('SENDGRID_API_KEY'),
      fromEmail: configService.get('SENDGRID_FROM_EMAIL', 'noreply@ayaztrade.com'),
      fromName: configService.get('SENDGRID_FROM_NAME', 'AyazTrade'),
    },
    mailgun: {
      apiKey: configService.get('MAILGUN_API_KEY'),
      domain: configService.get('MAILGUN_DOMAIN'),
      fromEmail: configService.get('MAILGUN_FROM_EMAIL', 'noreply@ayaztrade.com'),
    },
  };
};
