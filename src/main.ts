import { NestFactory, BadRequestException } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './core/shared/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './core/exceptions/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable CORS for development
  app.enableCors({
    origin: [
      'http://localhost:5000',
      'http://localhost:5001',
      'http://localhost:5002',
      'http://localhost:5003',
      'http://localhost:5004',
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // Reject unknown properties
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false, // Show detailed validation errors
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: (errors) => {
        // Custom error formatting for better API responses
        const formattedErrors = errors.map(error => ({
          field: error.property,
          errors: Object.values(error.constraints || {}),
          value: error.value,
        }));

        return new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
          timestamp: new Date().toISOString(),
        });
      },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('AyazTrade API')
    .setDescription('Enterprise E-commerce Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Products', 'Product management endpoints')
    .addTag('Orders', 'Order management endpoints')
    .addTag('Customers', 'Customer management endpoints')
    .addTag('CRM', 'CRM endpoints')
    .addTag('ERP', 'ERP endpoints')
    .addTag('WMS', 'Warehouse Management endpoints')
    .addTag('Analytics', 'Analytics endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Health', 'Health check endpoints')
    .addTag('Shipping', 'Shipping provider endpoints')
    .addTag('Inventory', 'Inventory management endpoints')
    .addServer('http://localhost:5000', 'Development server')
    .addServer('https://api.ayaztrade.com', 'Production server')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);

  console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║   🛒 AyazTrade - Enterprise E-commerce Platform 🛒           ║
  ║                                                               ║
  ║   🚀 Application started successfully!                        ║
  ║   📡 Running on: http://localhost:${port}                    ║
  ║   📚 API: http://localhost:${port}/api/v1                   ║
  ║   📖 Docs: http://localhost:${port}/api/docs                ║
  ║   ❤️  Health: http://localhost:${port}/api/v1/health        ║
  ║                                                               ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                                      ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

