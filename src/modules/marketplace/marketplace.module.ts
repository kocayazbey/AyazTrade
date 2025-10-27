import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';

@Module({
  controllers: [MarketplaceController],
  providers: [],
  exports: [],
})
export class MarketplaceModule {}

