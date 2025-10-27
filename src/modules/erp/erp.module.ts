import { Module } from '@nestjs/common';
import { ERPController } from './erp.controller';
import { FinanceService } from './services/finance.service';
import { PersonnelService } from './services/personnel.service';
import { PayrollService } from './services/payroll.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { AccountingService } from './services/accounting.service';
import { EFaturaService } from './services/efatura.service';
import { DatabaseModule } from '../../core/database/database.module';
import { EventsModule } from '../../core/events/events.module';
import { CacheModule } from '../../core/cache/cache.module';

@Module({
  imports: [DatabaseModule, EventsModule, CacheModule],
  controllers: [ERPController],
  providers: [
    FinanceService, 
    PersonnelService, 
    PayrollService,
    InvoiceService,
    PaymentService,
    AccountingService,
    EFaturaService,
  ],
  exports: [
    FinanceService, 
    PersonnelService, 
    PayrollService,
    InvoiceService,
    PaymentService,
    AccountingService,
    EFaturaService,
  ],
})
export class ERPModule {}

