import { Module } from '@nestjs/common';
import { TrendyolService } from './marketplace/trendyol.service';
import { HepsiburadaService } from './marketplace/hepsiburada.service';
import { N11Service } from './marketplace/n11.service';
import { AmazonTRService } from './marketplace/amazon-tr.service';
import { SahibindenService } from './marketplace/sahibinden.service';
import { ArasCargoService } from './shipping-carriers/aras-cargo.service';
import { YurticiCargoService } from './shipping-carriers/yurtici-cargo.service';
import { MNGCargoService } from './shipping-carriers/mng-cargo.service';
import { PTTCargoService } from './shipping-carriers/ptt-cargo.service';

/**
 * AyazIntegration - Third-party Integrations Module
 * 
 * Provides integrations with:
 * - Marketplaces: Trendyol, Hepsiburada, N11, Amazon TR, Sahibinden
 * - Shipping Carriers: Aras, Yurtiçi, MNG, PTT
 * - Payment Gateways: (handled in payments module)
 * - GPS/IoT: (separate services)
 */
@Module({
  providers: [
    TrendyolService,
    HepsiburadaService,
    N11Service,
    AmazonTRService,
    SahibindenService,
    ArasCargoService,
    YurticiCargoService,
    MNGCargoService,
    PTTCargoService,
  ],
  exports: [
    TrendyolService,
    HepsiburadaService,
    N11Service,
    AmazonTRService,
    SahibindenService,
    ArasCargoService,
    YurticiCargoService,
    MNGCargoService,
    PTTCargoService,
  ],
})
export class AyazIntegrationModule {}

