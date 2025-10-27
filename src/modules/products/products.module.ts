import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CacheModule } from '../../core/cache/cache.module';
import { EventsModule } from '../../core/events/events.module';
import { LoggerModule } from '../../core/logger/logger.module';
import { StorageModule } from '../../core/storage/storage.module';
import { ExportModule } from '../export/export.module';
import { ImportModule } from '../import/import.module';

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    EventsModule,
    LoggerModule,
    StorageModule,
    ExportModule,
    ImportModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
