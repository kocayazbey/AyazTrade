# 🧪 AyazTrade Testing Guide

## Overview

AyazTrade implements a comprehensive testing strategy covering unit tests, integration tests, end-to-end tests, and performance tests. This ensures high code quality, reliability, and maintainability.

## 🏗️ Testing Architecture

### Test Categories

1. **Unit Tests** - Individual components and services
2. **Integration Tests** - Module interactions and API endpoints
3. **E2E Tests** - Complete user journeys and workflows
4. **Performance Tests** - Load testing and stress testing
5. **Security Tests** - Vulnerability scanning and penetration testing

### Testing Stack

- **Jest** - Unit and integration testing
- **Supertest** - API testing
- **Playwright** - E2E testing
- **Artillery** - Load testing
- **Cypress** - Alternative E2E testing

## 📁 Test Structure

```
test/
├── unit/                    # Unit tests
│   ├── core/               # Core services
│   ├── modules/            # Module-specific tests
│   └── utils/              # Utility functions
├── integration/            # Integration tests
│   ├── api/               # API endpoint tests
│   ├── database/          # Database integration
│   └── services/          # Service integration
├── e2e/                   # End-to-end tests
│   ├── critical-paths.spec.ts
│   ├── user-journeys/
│   └── system-workflows/
├── performance/           # Performance tests
│   ├── load-test.js
│   └── stress-test.js
└── security/             # Security tests
    ├── auth/
    └── api/
```

## 🚀 Getting Started

### Prerequisites

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest
npm install --save-dev supertest @types/supertest
npm install --save-dev @playwright/test
npm install --save-dev artillery
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🧪 Unit Testing

### Writing Unit Tests

```typescript
// src/modules/products/products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { DatabaseService } from '../../core/database/database.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProducts', () => {
    it('should return products array', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100 }
      ];

      jest.spyOn(databaseService, 'findMany').mockResolvedValue(mockProducts);

      const result = await service.getProducts();

      expect(result).toEqual(mockProducts);
      expect(databaseService.findMany).toHaveBeenCalledWith('products');
    });
  });
});
```

### Testing Best Practices

- **Arrange, Act, Assert** pattern
- Mock external dependencies
- Test one thing per test case
- Use descriptive test names
- Cover edge cases and error scenarios

## 🔗 Integration Testing

### API Testing

```typescript
// test/integration/products/products.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Products API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should get products', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  it('should create product with valid data', () => {
    const productData = {
      name: 'Test Product',
      price: 100,
      category: 'Electronics',
    };

    return request(app.getHttpServer())
      .post('/products')
      .send(productData)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('id');
      });
  });
});
```

## 🌐 End-to-End Testing

### Playwright Setup

```typescript
// test/e2e/specs/products.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@ayaztrade.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display products list', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('[data-testid="products-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-item"]')).toHaveCount(10);
  });

  test('should create new product', async ({ page }) => {
    await page.goto('/products/new');
    await page.fill('[data-testid="product-name"]', 'Test Product');
    await page.fill('[data-testid="product-price"]', '100');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

### Critical Path Tests

```typescript
// test/e2e/critical-paths.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical E-commerce Paths', () => {
  test('complete purchase flow', async ({ page }) => {
    // 1. Browse products
    await page.goto('/products');
    await page.click('[data-testid="product-1"]');

    // 2. Add to cart
    await page.click('[data-testid="add-to-cart"]');

    // 3. Checkout
    await page.goto('/cart');
    await page.click('[data-testid="checkout"]');

    // 4. Fill shipping info
    await page.fill('[data-testid="name"]', 'John Doe');
    await page.fill('[data-testid="address"]', '123 Main St');
    await page.click('[data-testid="continue"]');

    // 5. Payment
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.click('[data-testid="pay"]');

    // 6. Verify success
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
  });

  test('user registration and login', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="register"]');

    await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
  });
});
```

## ⚡ Performance Testing

### Load Testing

```javascript
// test/performance/load-test.js
const artillery = require('artillery');

const script = {
  config: {
    target: 'http://localhost:5000',
    phases: [
      { duration: 60, arrivalRate: 10 },   // Ramp up
      { duration: 300, arrivalRate: 50 },  // Steady state
      { duration: 60, arrivalRate: 10 },   // Ramp down
    ],
  },
  scenarios: [
    {
      name: 'Get products',
      requests: [
        { get: { url: '/api/v1/products' } },
      ],
    },
    {
      name: 'Create order',
      requests: [
        {
          post: {
            url: '/api/v1/orders',
            json: {
              items: [{ productId: '1', quantity: 1 }],
              shipping: { address: '123 Main St' },
            },
          },
        },
      ],
    },
  ],
};

artillery.run(script);
```

### Performance Metrics

- **Response Time**: < 200ms for API calls
- **Throughput**: 1000+ requests per second
- **Error Rate**: < 0.1%
- **Database Queries**: < 50ms average
- **Memory Usage**: < 512MB for application

## 🔒 Security Testing

### Authentication Tests

```typescript
// test/security/auth/auth-security.spec.ts
describe('Authentication Security', () => {
  it('should reject invalid tokens', async () => {
    const response = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('should handle brute force attacks', async () => {
    // Attempt multiple login failures
    for (let i = 0; i < 15; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }

    // Should be rate limited
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(429);
  });
});
```

## 📊 Test Coverage

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e:ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
# Install husky
npm install husky --save-dev

# Setup pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run test:unit"
npx husky add .husky/pre-push "npm run test:e2e"
```

## 🛠️ Debugging Tests

### Debug Mode

```typescript
// Enable debug logging in tests
process.env.DEBUG = 'true';

// Step through tests
test.only('debug specific test', async () => {
  // Add breakpoints here
  const result = await service.methodUnderTest();
  expect(result).toBe(expected);
});
```

### Test Utilities

```typescript
// test/utils/test-helpers.ts
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  role: 'user',
  ...overrides,
});

export const createMockProduct = (overrides = {}) => ({
  id: 'product-1',
  name: 'Test Product',
  price: 100,
  ...overrides,
});
```

## 📈 Test Metrics

### Quality Gates

```json
{
  "coverage": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  },
  "performance": {
    "responseTime": 200,
    "throughput": 1000,
    "errorRate": 0.1
  },
  "security": {
    "vulnerabilities": 0,
    "rateLimitTests": "pass"
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Database connection**: Ensure test database is running
2. **Port conflicts**: Use different ports for different test types
3. **Async operations**: Properly handle promises and async/await
4. **Mock data**: Ensure mocks match actual data structures

### Test Database

```bash
# Setup test database
npm run db:test:setup

# Run migrations
npm run db:test:migrate

# Seed test data
npm run db:test:seed
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Artillery Documentation](https://artillery.io/)

## 🤝 Contributing

1. Write tests for new features
2. Maintain test coverage above 80%
3. Follow testing best practices
4. Update test documentation
5. Run full test suite before PR

---

*Testing is not optional - it's essential for maintaining code quality and reliability.*
