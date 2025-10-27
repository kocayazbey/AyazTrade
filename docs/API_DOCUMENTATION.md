# AyazTrade API Documentation

## Overview

The AyazTrade API provides a comprehensive set of endpoints for managing enterprise e-commerce operations including products, orders, payments, users, notifications, analytics, inventory management, and AI-powered features. Built with NestJS, this API supports multi-tenant architecture, real-time updates, and extensive integration capabilities.

## Features

- **Multi-tenant Architecture**: Support for multiple business entities
- **Real-time Analytics**: Live dashboard and reporting capabilities
- **AI-Powered Insights**: Predictive analytics and intelligent recommendations
- **Multi-vendor Support**: Marketplace functionality
- **Advanced Inventory Management**: WMS integration with real-time tracking
- **Comprehensive CRM**: Customer lifecycle management
- **Payment Processing**: Multiple payment gateway integrations
- **PWA Support**: Offline-first mobile experience
- **Webhooks**: Real-time integration with external systems
- **Rate Limiting**: Built-in DDoS protection
- **Audit Logging**: Comprehensive compliance tracking

## Base URL

```
Production: https://api.ayaztrade.com
Staging: https://api-staging.ayaztrade.com
Development: http://localhost:3000
```

## Authentication

All API endpoints require authentication except for public endpoints like product listings and user registration.

### JWT Token

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Refresh Token

To refresh an expired token, use the refresh endpoint:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

## Rate Limiting

API requests are rate limited to prevent abuse:

- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Payment endpoints**: 20 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Handling

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "path": "/api/products"
}
```

## API Modules

### 1. Authentication & Authorization

#### Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/change-password` - Change password
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/verify-email` - Verify email address
- `POST /api/v1/auth/resend-verification` - Resend verification email

#### Role-Based Access Control (RBAC)
- **Admin**: Full system access
- **Editor**: Content and product management
- **Viewer**: Read-only access
- **Customer**: Personal account management

### 2. Products Management

#### Endpoints
- `GET /api/v1/products` - List products with filtering and pagination
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products` - Create product (Admin/Editor)
- `PATCH /api/v1/products/:id` - Update product (Admin/Editor)
- `DELETE /api/v1/products/:id` - Delete product (Admin)
- `GET /api/v1/products/search` - Search products
- `GET /api/v1/products/:id/variants` - Get product variants
- `POST /api/v1/products/:id/variants` - Add product variant (Admin/Editor)
- `GET /api/v1/products/categories` - Get product categories
- `GET /api/v1/products/brands` - Get product brands
- `POST /api/v1/products/bulk-update` - Bulk update products (Admin)

#### Advanced Features
- **Product Variants**: Size, color, material options
- **SEO Optimization**: Meta tags, structured data
- **Multi-language Support**: Localized product descriptions
- **Advanced Search**: Elasticsearch integration
- **Product Recommendations**: AI-powered suggestions

### 3. Orders Management

#### Endpoints
- `GET /api/v1/orders` - List orders with filtering
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders` - Create order
- `PATCH /api/v1/orders/:id` - Update order (Admin)
- `POST /api/v1/orders/:id/cancel` - Cancel order
- `GET /api/v1/orders/:id/tracking` - Get order tracking
- `PATCH /api/v1/orders/:id/status` - Update order status (Admin)
- `POST /api/v1/orders/:id/refund` - Process refund (Admin)
- `GET /api/v1/orders/:id/invoice` - Generate invoice

#### Order Status Flow
1. **Pending** → **Confirmed** → **Processing** → **Shipped** → **Delivered**
2. **Cancelled** (at any stage)
3. **Refunded** (after delivery)

### 4. Shopping Cart

#### Endpoints
- `GET /api/v1/cart` - Get user's cart
- `POST /api/v1/cart/items` - Add item to cart
- `PATCH /api/v1/cart/items/:itemId` - Update cart item
- `DELETE /api/v1/cart/items/:itemId` - Remove cart item
- `DELETE /api/v1/cart` - Clear cart
- `POST /api/v1/cart/apply-coupon` - Apply discount coupon
- `GET /api/v1/cart/totals` - Calculate cart totals

#### Features
- **Guest Cart**: Anonymous shopping
- **Persistent Cart**: Cross-device synchronization
- **Real-time Updates**: Live price and availability updates
- **Discount Engine**: Coupons, promotions, bulk discounts

### 5. Checkout & Payments

#### Endpoints
- `POST /api/v1/checkout/create-order` - Create order from cart
- `POST /api/v1/checkout/process-payment` - Process payment
- `GET /api/v1/checkout/payment-methods` - Get available payment methods
- `POST /api/v1/checkout/webhook/:provider` - Payment webhook handler
- `GET /api/v1/checkout/order/:id/status` - Get checkout status

#### Payment Providers
- **Stripe**: Credit cards, digital wallets
- **Iyzico**: Turkish payment gateway
- **PayPal**: International payments
- **Bank Transfer**: B2B payments
- **Cash on Delivery**: Local delivery option

### 6. Customer Management (CRM)

#### Endpoints
- `GET /api/v1/customers` - List customers (Admin)
- `GET /api/v1/customers/:id` - Get customer details
- `POST /api/v1/customers` - Create customer (Admin)
- `PATCH /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer (Admin)
- `GET /api/v1/customers/:id/orders` - Get customer orders
- `GET /api/v1/customers/:id/analytics` - Get customer analytics
- `POST /api/v1/customers/:id/notes` - Add customer note (Admin)

#### CRM Features
- **Customer Segmentation**: RFM analysis, behavioral clustering
- **Lead Management**: Lead scoring and conversion tracking
- **Communication History**: Email, SMS, call logs
- **Loyalty Program**: Points, rewards, VIP tiers
- **Customer Journey**: Purchase history and preferences

### 7. Analytics & Reporting

#### Endpoints
- `GET /api/v1/analytics/dashboard` - Get dashboard overview
- `GET /api/v1/analytics/revenue` - Revenue analytics
- `GET /api/v1/analytics/orders` - Order analytics
- `GET /api/v1/analytics/customers` - Customer analytics
- `GET /api/v1/analytics/products` - Product analytics
- `GET /api/v1/analytics/inventory` - Inventory analytics
- `POST /api/v1/reports/generate` - Generate custom report
- `GET /api/v1/reports/:id` - Get generated report
- `GET /api/v1/reports/scheduled` - Get scheduled reports

#### Analytics Features
- **Real-time Dashboard**: Live metrics and KPIs
- **Predictive Analytics**: Demand forecasting, trend analysis
- **Custom Reports**: Flexible reporting with filters
- **Export Options**: PDF, Excel, CSV formats
- **Automated Reports**: Scheduled email delivery

### 8. Inventory Management (WMS)

#### Endpoints
- `GET /api/v1/inventory` - Get inventory overview
- `GET /api/v1/inventory/:id` - Get item details
- `POST /api/v1/inventory/adjustment` - Adjust inventory (Admin)
- `GET /api/v1/inventory/alerts` - Get low stock alerts
- `GET /api/v1/inventory/movements` - Get inventory movements
- `POST /api/v1/inventory/transfer` - Transfer between warehouses
- `GET /api/v1/inventory/valuation` - Get inventory valuation

#### WMS Features
- **Multi-warehouse Support**: Distributed inventory management
- **Real-time Tracking**: RFID and barcode integration
- **Automated Replenishment**: Smart reorder points
- **Quality Control**: Batch tracking and expiry dates
- **IoT Integration**: Sensor data for environmental monitoring

### 9. Shipping & Logistics

#### Endpoints
- `GET /api/v1/shipping/methods` - Get shipping methods
- `POST /api/v1/shipping/calculate` - Calculate shipping costs
- `POST /api/v1/shipping/create-label` - Create shipping label
- `GET /api/v1/shipping/track/:trackingNumber` - Track package
- `GET /api/v1/shipping/providers` - Get shipping providers
- `POST /api/v1/shipping/webhook` - Shipping webhook handler

#### Shipping Features
- **Multiple Carriers**: Aras, Yurtiçi, MNG, DHL, UPS
- **Real-time Tracking**: Live shipment updates
- **Automatic Label Generation**: PDF shipping labels
- **Rate Shopping**: Best price comparison
- **International Shipping**: Customs documentation

### 10. Notifications

#### Endpoints
- `POST /api/v1/notifications/email/send` - Send email notification
- `POST /api/v1/notifications/sms/send` - Send SMS notification
- `POST /api/v1/notifications/push/send` - Send push notification
- `POST /api/v1/notifications/web-push/send` - Send web push notification
- `GET /api/v1/notifications/templates` - Get notification templates
- `POST /api/v1/notifications/templates` - Create template (Admin)
- `GET /api/v1/notifications/history` - Get notification history

#### Notification Types
- **Order Notifications**: Status updates, shipping alerts
- **Marketing**: Promotions, newsletters, abandoned cart
- **System Alerts**: Inventory, payment failures
- **Customer Service**: Support tickets, feedback

### 11. Webhooks

#### Endpoints
- `POST /api/v1/webhooks/:provider` - Webhook handler
- `GET /api/v1/webhooks` - List webhooks (Admin)
- `POST /api/v1/webhooks` - Create webhook (Admin)
- `DELETE /api/v1/webhooks/:id` - Delete webhook (Admin)
- `POST /api/v1/webhooks/:id/test` - Test webhook (Admin)

#### Supported Webhooks
- **Stripe**: Payment events, disputes
- **Iyzico**: Payment confirmations, refunds
- **Shipping**: Delivery updates, tracking
- **Marketplace**: Order sync, inventory updates

### 12. AI & Machine Learning

#### Endpoints
- `GET /api/v1/ai/recommendations/:userId` - Get product recommendations
- `GET /api/v1/ai/pricing` - Get dynamic pricing suggestions
- `POST /api/v1/ai/demand-forecast` - Generate demand forecast
- `GET /api/v1/ai/customer-segmentation` - Get customer segments
- `POST /api/v1/ai/inventory-optimize` - Optimize inventory levels
- `GET /api/v1/ai/fraud-detection` - Fraud detection analysis

#### AI Features
- **Product Recommendations**: Collaborative filtering, content-based
- **Dynamic Pricing**: Market-based, competitor analysis
- **Demand Forecasting**: Seasonal trends, external factors
- **Customer Segmentation**: Behavioral, demographic, RFM
- **Fraud Detection**: Transaction scoring, anomaly detection

### 13. Admin Panel

#### Endpoints
- `GET /api/v1/admin/users` - Manage users (Admin)
- `GET /api/v1/admin/system/health` - System health check
- `GET /api/v1/admin/system/metrics` - System metrics
- `POST /api/v1/admin/system/cache/clear` - Clear cache (Admin)
- `GET /api/v1/admin/audit-logs` - View audit logs (Admin)
- `GET /api/v1/admin/backup` - Database backup (Admin)
- `POST /api/v1/admin/backup/restore` - Restore backup (Admin)

### 14. Integrations

#### Endpoints
- `GET /api/v1/integrations` - List available integrations
- `POST /api/v1/integrations/:provider/connect` - Connect integration
- `DELETE /api/v1/integrations/:provider/disconnect` - Disconnect integration
- `GET /api/v1/integrations/:provider/status` - Integration status
- `POST /api/v1/integrations/:provider/sync` - Trigger sync

#### Supported Integrations
- **Marketplaces**: Trendyol, Hepsiburada, N11, Amazon
- **Accounting**: Logo, Mikro, SAP
- **ERP Systems**: Netsis, Nebim, Canias
- **CRM**: Salesforce, HubSpot, Pipedrive
- **E-commerce**: Shopify, WooCommerce, Magento

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+905551234567"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

#### Change Password
```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "resetToken": "reset-token",
  "newPassword": "newPassword123"
}
```

### Products

#### Get All Products
```http
GET /products?page=1&limit=20&category=electronics&search=laptop
```

#### Get Product by ID
```http
GET /products/:id
```

#### Create Product (Admin)
```http
POST /products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 15000,
  "stock": 100,
  "sku": "LAPTOP-001",
  "categoryId": "cat-123",
  "imageUrls": ["https://example.com/image1.jpg"]
}
```

#### Update Product (Admin)
```http
PATCH /products/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Updated Laptop",
  "price": 16000
}
```

#### Delete Product (Admin)
```http
DELETE /products/:id
Authorization: Bearer <admin-token>
```

### Orders

#### Get User Orders
```http
GET /orders
Authorization: Bearer <token>
```

#### Get Order by ID
```http
GET /orders/:id
Authorization: Bearer <token>
```

#### Create Order
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "prod-123",
      "quantity": 2,
      "price": 15000
    }
  ],
  "totalAmount": 30000,
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "city": "Istanbul",
    "state": "Istanbul",
    "zipCode": "34000",
    "country": "Turkey",
    "phone": "+905551234567"
  },
  "paymentMethod": "stripe"
}
```

#### Update Order Status (Admin)
```http
PATCH /orders/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "TRK123456"
}
```

#### Cancel Order
```http
POST /orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed mind"
}
```

### Cart

#### Get Cart
```http
GET /cart
Authorization: Bearer <token>
```

#### Add Item to Cart
```http
POST /cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "prod-123",
  "quantity": 2,
  "variantId": "var-456"
}
```

#### Update Cart Item
```http
PATCH /cart/update/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

#### Remove Item from Cart
```http
DELETE /cart/remove/:itemId
Authorization: Bearer <token>
```

#### Clear Cart
```http
DELETE /cart/clear
Authorization: Bearer <token>
```

### Checkout

#### Create Order from Cart
```http
POST /checkout/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "city": "Istanbul",
    "state": "Istanbul",
    "zipCode": "34000",
    "country": "Turkey",
    "phone": "+905551234567"
  },
  "paymentMethod": "stripe",
  "couponCode": "SAVE10"
}
```

#### Process Payment
```http
POST /checkout/process-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order-123",
  "paymentMethod": "stripe",
  "paymentData": {
    "paymentMethodId": "pm_1234567890",
    "customerId": "cus_1234567890"
  }
}
```

### Payments

#### Stripe Payment
```http
POST /payments/stripe
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 15000,
  "currency": "try",
  "paymentMethodId": "pm_1234567890"
}
```

#### Iyzico Payment
```http
POST /payments/iyzico
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 15000,
  "currency": "TRY",
  "paymentCard": {
    "cardNumber": "5555555555554444",
    "expireMonth": "12",
    "expireYear": "2025",
    "cvc": "123",
    "cardHolderName": "John Doe"
  },
  "buyer": {
    "id": "user-123",
    "name": "John",
    "surname": "Doe",
    "email": "john@example.com",
    "identityNumber": "12345678901",
    "city": "Istanbul",
    "country": "Turkey",
    "registrationAddress": "123 Main St",
    "ip": "192.168.1.1"
  }
}
```

### Users

#### Get All Users (Admin)
```http
GET /users
Authorization: Bearer <admin-token>
```

#### Get User by ID
```http
GET /users/:id
Authorization: Bearer <token>
```

#### Update User
```http
PATCH /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+905551234567"
}
```

#### Delete User (Admin)
```http
DELETE /users/:id
Authorization: Bearer <admin-token>
```

### Notifications

#### Send Email
```http
POST /notifications/email/send
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Welcome to AyazTrade!",
  "content": "<h1>Welcome!</h1><p>Thank you for joining us.</p>"
}
```

#### Send SMS
```http
POST /notifications/sms/send
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "phoneNumber": "+905551234567",
  "message": "Your order has been confirmed!"
}
```

#### Send Push Notification
```http
POST /notifications/push/send
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "deviceToken": "device-token-123",
  "title": "Order Update",
  "body": "Your order has been shipped!",
  "data": {
    "orderId": "order-123",
    "type": "order_update"
  }
}
```

## Webhooks

### Stripe Webhooks

Configure webhook endpoint: `https://api.ayaztrade.com/webhooks/stripe`

Events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.dispute.created`

### Iyzico Webhooks

Configure webhook endpoint: `https://api.ayaztrade.com/webhooks/iyzico`

Events:
- `payment.success`
- `payment.failure`
- `refund.success`

## SDKs

### JavaScript/TypeScript

```bash
npm install @ayaztrade/api-client
```

```typescript
import { AyazTradeClient } from '@ayaztrade/api-client';

const client = new AyazTradeClient({
  baseUrl: 'https://api.ayaztrade.com',
  apiKey: 'your-api-key'
});

// Get products
const products = await client.products.list({
  page: 1,
  limit: 20,
  category: 'electronics'
});

// Create order
const order = await client.orders.create({
  items: [{
    productId: 'prod-123',
    quantity: 2,
    price: 15000
  }],
  totalAmount: 30000,
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'Istanbul',
    state: 'Istanbul',
    zipCode: '34000',
    country: 'Turkey',
    phone: '+905551234567'
  },
  paymentMethod: 'stripe'
});
```

### Python

```bash
pip install ayaztrade-api-client
```

```python
from ayaztrade import AyazTradeClient

client = AyazTradeClient(
    base_url='https://api.ayaztrade.com',
    api_key='your-api-key'
)

# Get products
products = client.products.list(
    page=1,
    limit=20,
    category='electronics'
)

# Create order
order = client.orders.create({
    'items': [{
        'productId': 'prod-123',
        'quantity': 2,
        'price': 15000
    }],
    'totalAmount': 30000,
    'shippingAddress': {
        'firstName': 'John',
        'lastName': 'Doe',
        'address': '123 Main St',
        'city': 'Istanbul',
        'state': 'Istanbul',
        'zipCode': '34000',
        'country': 'Turkey',
        'phone': '+905551234567'
    },
    'paymentMethod': 'stripe'
})
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

## Support

For API support and questions:

- **Email**: api-support@ayaztrade.com
- **Documentation**: https://docs.ayaztrade.com
- **Status Page**: https://status.ayaztrade.com