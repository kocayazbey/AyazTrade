import { ConfigService } from '@nestjs/config';

export const getSecurityConfig = (configService: ConfigService) => {
  return {
    cors: {
      origin: configService.get('CORS_ORIGIN', '*').split(','),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
      credentials: true,
      maxAge: 86400,
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    },
    rateLimit: {
      windowMs: configService.get('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
      max: configService.get('RATE_LIMIT_MAX', 100), // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    },
    throttler: {
      ttl: configService.get('THROTTLE_TTL', 60),
      limit: configService.get('THROTTLE_LIMIT', 10),
    },
    rateLimiting: {
      // Default rate limits
      default: {
        windowMs: configService.get('RATE_LIMIT_DEFAULT_WINDOW_MS', 60 * 1000), // 1 minute
        maxRequests: configService.get('RATE_LIMIT_DEFAULT_MAX', 100),
        blockDuration: configService.get('RATE_LIMIT_DEFAULT_BLOCK_MS', 60 * 1000), // 1 minute
      },
      // Authentication endpoints
      auth: {
        windowMs: configService.get('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
        maxRequests: configService.get('RATE_LIMIT_AUTH_MAX', 5),
        blockDuration: configService.get('RATE_LIMIT_AUTH_BLOCK_MS', 15 * 60 * 1000), // 15 minutes
      },
      // API endpoints
      api: {
        windowMs: configService.get('RATE_LIMIT_API_WINDOW_MS', 60 * 1000), // 1 minute
        maxRequests: configService.get('RATE_LIMIT_API_MAX', 100),
        blockDuration: configService.get('RATE_LIMIT_API_BLOCK_MS', 5 * 60 * 1000), // 5 minutes
      },
      // Admin endpoints
      admin: {
        windowMs: configService.get('RATE_LIMIT_ADMIN_WINDOW_MS', 5 * 60 * 1000), // 5 minutes
        maxRequests: configService.get('RATE_LIMIT_ADMIN_MAX', 50),
        blockDuration: configService.get('RATE_LIMIT_ADMIN_BLOCK_MS', 10 * 60 * 1000), // 10 minutes
      },
      // File uploads
      upload: {
        windowMs: configService.get('RATE_LIMIT_UPLOAD_WINDOW_MS', 60 * 60 * 1000), // 1 hour
        maxRequests: configService.get('RATE_LIMIT_UPLOAD_MAX', 20),
        blockDuration: configService.get('RATE_LIMIT_UPLOAD_BLOCK_MS', 30 * 60 * 1000), // 30 minutes
      },
      // Search endpoints
      search: {
        windowMs: configService.get('RATE_LIMIT_SEARCH_WINDOW_MS', 60 * 1000), // 1 minute
        maxRequests: configService.get('RATE_LIMIT_SEARCH_MAX', 30),
        blockDuration: configService.get('RATE_LIMIT_SEARCH_BLOCK_MS', 2 * 60 * 1000), // 2 minutes
      },
      // Password reset
      passwordReset: {
        windowMs: configService.get('RATE_LIMIT_PASSWORD_RESET_WINDOW_MS', 60 * 60 * 1000), // 1 hour
        maxRequests: configService.get('RATE_LIMIT_PASSWORD_RESET_MAX', 3),
        blockDuration: configService.get('RATE_LIMIT_PASSWORD_RESET_BLOCK_MS', 60 * 60 * 1000), // 1 hour
      },
      // Email verification
      emailVerification: {
        windowMs: configService.get('RATE_LIMIT_EMAIL_VERIFICATION_WINDOW_MS', 60 * 1000), // 1 minute
        maxRequests: configService.get('RATE_LIMIT_EMAIL_VERIFICATION_MAX', 1),
        blockDuration: configService.get('RATE_LIMIT_EMAIL_VERIFICATION_BLOCK_MS', 15 * 60 * 1000), // 15 minutes
      },
    },
    ipFilter: {
      enabled: configService.get('IP_FILTER_ENABLED', true),
      whitelist: configService.get('IP_WHITELIST', '').split(',').filter(Boolean),
      blacklist: configService.get('IP_BLACKLIST', '').split(',').filter(Boolean),
      trackSuspiciousActivity: configService.get('IP_FILTER_TRACK_SUSPICIOUS', true),
    },
    bcrypt: {
      saltRounds: configService.get('BCRYPT_SALT_ROUNDS', 12),
    },
    session: {
      secret: configService.get('SESSION_SECRET', 'your-session-secret'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: configService.get('NODE_ENV') === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    },
  };
};
