import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../core/database/database.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryTreeService } from './category-tree.service';
import { CacheModule } from '@/core/cache/cache.module';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryTreeService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

