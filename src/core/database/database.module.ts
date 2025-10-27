import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from '../../database/schema';
import { DatabaseService } from './database.service';

export const DRIZZLE_ORM = 'DRIZZLE_ORM';
export const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_ORM,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        const client = postgres(connectionString);
        return drizzle(client, { schema });
      },
      inject: [ConfigService],
    },
    {
      provide: DATABASE_POOL,
      useFactory: (configService: ConfigService) => {
        const poolConfig: PoolConfig = {
          host: configService.get<string>('DATABASE_HOST'),
          port: parseInt(configService.get<string>('DATABASE_PORT') || '5432'),
          database: configService.get<string>('DATABASE_NAME'),
          user: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          ssl: configService.get<string>('DATABASE_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : undefined,
        };
        return new Pool(poolConfig);
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: [DRIZZLE_ORM, DATABASE_POOL, DatabaseService],
})
export class DatabaseModule {}