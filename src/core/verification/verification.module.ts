import { Module } from '@nestjs/common';
import { SystemVerificationService } from './system-verification.service';
import { VerificationController } from './verification.controller';
import { DatabaseModule } from '../database/database.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [VerificationController],
  providers: [SystemVerificationService],
  exports: [SystemVerificationService],
})
export class VerificationModule {}

