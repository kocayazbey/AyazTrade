import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../core/database/database.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerAddressesService } from './customer-addresses.service';
import { CustomerAuthService } from './customer-auth.service';
import { CacheModule } from '@/core/cache/cache.module';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerAddressesService,
    CustomerAuthService,
  ],
  exports: [CustomersService, CustomerAuthService],
})
export class CustomersModule {}

