import { Module } from '@nestjs/common';
import { CRMController } from './crm.controller';
import { LeadsController } from './controllers/leads.controller';
import { QuotesController } from './controllers/quotes.controller';
import { ContractsController } from './controllers/contracts.controller';
import { ActivitiesController } from './controllers/activities.controller';
import { ContactsController } from './controllers/contacts.controller';
import { CRMService } from './services/crm.service';
import { LeadService } from './services/lead.service';
import { QuoteService } from './services/quote.service';
import { ContractService } from './services/contract.service';
import { ActivityService } from './services/activity.service';
import { SalesPipelineService } from './services/sales-pipeline.service';
import { ConversionTrackingService } from './services/conversion-tracking.service';
import { FrontendCRMDashboardService } from './frontend-crm-dashboard.service';
import { DatabaseModule } from '../../core/database/database.module';
import { CacheModule } from '../../core/cache/cache.module';
import { LoggerModule } from '../../core/logger/logger.module';

@Module({
  imports: [DatabaseModule, CacheModule, LoggerModule],
  controllers: [
    CRMController,
    LeadsController,
    QuotesController,
    ContractsController,
    ActivitiesController,
    ContactsController,
  ],
  providers: [
    CRMService,
    LeadService,
    QuoteService,
    ContractService,
    ActivityService,
    SalesPipelineService,
    ConversionTrackingService,
    FrontendCRMDashboardService,
  ],
  exports: [
    CRMService,
    LeadService,
    QuoteService,
    ContractService,
    ActivityService,
    SalesPipelineService,
    ConversionTrackingService,
    FrontendCRMDashboardService,
  ],
})
export class CRMModule {}
