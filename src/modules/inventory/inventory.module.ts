import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DatabaseModule } from '../../core/database/database.module';
import { CacheModule } from '../../core/cache/cache.module';
import { LoggerModule } from '../../core/logger/logger.module';
import { WebSocketModule } from '../../core/websocket/websocket.module';

@Module({
  imports: [DatabaseModule, CacheModule, LoggerModule, WebSocketModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

