import { Module } from '@nestjs/common';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { ProductsModule } from '../products/products.module';
import { CacheModule } from '@/core/cache/cache.module';

@Module({
  imports: [ProductsModule, CacheModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}

