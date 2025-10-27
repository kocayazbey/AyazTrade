import { ConfigService } from '@nestjs/config';

// TODO: Update all DB_* references to use DATABASE_* prefix for consistency
export const getDatabaseConfig = (configService: ConfigService) => {
  return {
    // Drizzle ORM Configuration
    // TODO: Use DATABASE_* instead of DB_* for consistency
    connectionString: configService.get('DATABASE_URL') || 
      `postgresql://${configService.get('DATABASE_USER', 'postgres')}:${configService.get('DATABASE_PASSWORD', 'password')}@${configService.get('DATABASE_HOST', 'localhost')}:${configService.get('DATABASE_PORT', 5432)}/${configService.get('DATABASE_NAME', 'ayaztrade')}`,
    
    // Connection options
    ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    
    // TODO: Use DATABASE_LOGGING instead of DB_LOGGING
    // Logging
    logging: configService.get('DATABASE_LOGGING', false),
    
    // TODO: Use DATABASE_* prefix for all connection pool settings
    // Connection pool settings
    max: configService.get('DATABASE_CONNECTION_LIMIT', 10),
    idleTimeoutMillis: configService.get('DATABASE_IDLE_TIMEOUT', 30000),
    connectionTimeoutMillis: configService.get('DATABASE_CONNECTION_TIMEOUT', 10000),
    
    // Migration settings
    migrations: {
      directory: './src/database/migrations',
      tableName: 'drizzle_migrations',
    },
  };
};
