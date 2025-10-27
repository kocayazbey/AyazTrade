import { Module, Global } from '@nestjs/common';
import { GibEFaturaService } from './efatura/gib-efatura.service';
import { StripeService } from './payment/stripe.service';
import { IyzicoService } from './payment/iyzico.service';
import { SendGridService } from './email/sendgrid.service';
import { NetgsmService } from './sms/netgsm.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { EImzaService } from './eimza/eimza.service';
import { SGKAPIService } from './sgk/sgk-api.service';
import { BankAPIService } from './bank/bank-api.service';

@Global()
@Module({
  providers: [
    GibEFaturaService,
    StripeService,
    IyzicoService,
    SendGridService,
    NetgsmService,
    WhatsAppService,
    EImzaService,
    SGKAPIService,
    BankAPIService,
  ],
  exports: [
    GibEFaturaService,
    StripeService,
    IyzicoService,
    SendGridService,
    NetgsmService,
    WhatsAppService,
    EImzaService,
    SGKAPIService,
    BankAPIService,
  ],
})
export class IntegrationsModule {}

