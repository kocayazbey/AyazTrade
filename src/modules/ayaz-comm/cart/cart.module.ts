import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../core/database/database.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
