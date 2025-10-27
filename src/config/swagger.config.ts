import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('AyazTrade API')
    .setDescription('Comprehensive e-commerce and business management platform API')
    .setVersion('1.0.0')
    .setContact('AyazTrade Team', 'https://ayaztrade.com', 'support@ayaztrade.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.ayaztrade.com', 'Production server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for external services',
      },
      'api-key',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management operations')
    .addTag('Products', 'Product management operations')
    .addTag('Orders', 'Order management operations')
    .addTag('Customers', 'Customer management operations')
    .addTag('Analytics', 'Analytics and reporting operations')
    .addTag('Inventory', 'Inventory management operations')
    .addTag('Shipping', 'Shipping and logistics operations')
    .addTag('Notifications', 'Notification management operations')
    .addTag('Reports', 'Report generation and management')
    .addTag('AI Core', 'AI-powered features and services')
    .addTag('Sustainability', 'Sustainability and carbon footprint tracking')
    .addTag('Export', 'Data export operations')
    .addTag('Import', 'Data import operations')
    .addTag('Marketplace', 'Marketplace integration operations')
    .addTag('Reviews', 'Product review management')
    .addTag('WMS', 'Warehouse management operations')
    .addTag('Trade', 'Trading operations')
    .addTag('ERP', 'ERP system integration')
    .addTag('CRM', 'CRM system integration')
    .addTag('Webhooks', 'Webhook management operations')
    .addTag('AyazComm', 'AyazComm communication services')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
    },
    customSiteTitle: 'AyazTrade API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });
};
