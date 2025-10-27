import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DRIZZLE_ORM, DATABASE_POOL } from './database.module';
import { sql } from 'drizzle-orm';
import { inventory } from '../../database/schema/wms/inventory.schema';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: postgres.Sql;
  private _pool: Pool;

  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE_ORM) private drizzle: any,
    @Inject(DATABASE_POOL) private pool: Pool,
  ) {
    // Initialize Drizzle connection
    const connectionString = this.configService.get<string>('DATABASE_URL');
    this.connection = postgres(connectionString);
    this._pool = pool;
  }

  async onModuleInit() {
    try {
      // Test database connection with Drizzle
      await this.drizzle.execute(sql`SELECT 1`);
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.connection.end();
    if (this._pool) {
      await this._pool.end();
    }
  }

  // Drizzle methods
  get drizzleClient() {
    return this.drizzle;
  }

  // Pool accessor for raw queries
  get pool() {
    return this._pool;
  }

  // Table accessors
  get inventory() {
    return inventory;
  }

  // Health check using Drizzle
  async isHealthy(): Promise<boolean> {
    try {
      await this.drizzle.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Transaction support
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return this.drizzle.transaction(callback);
  }

  // Raw query support
  async rawQuery<T = any>(query: string, params?: any[]): Promise<T> {
    return this.drizzle.execute(sql.raw(query, ...(params || [])));
  }

  // Connection info
  getConnectionInfo() {
    return {
      provider: 'postgresql',
      url: this.configService.get<string>('DATABASE_URL')?.replace(/\/\/.*@/, '//***:***@'),
      connected: this.connection ? true : false,
    };
  }
}