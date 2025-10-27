# 🛒 AyazComm - E-commerce Module

**Modüler, Kurumsal E-ticaret Çözümü**

AyazComm, AyazTrade Enterprise Suite içinde yer alan bağımsız e-ticaret modülüdür. B2C, B2B ve marketplace operasyonlarını destekleyen kapsamlı bir çözümdür.

## 📦 Özellikler

### Core Modules

#### 🏷️ **Products** (Ürün Yönetimi)
- Basit ve varyantlı ürünler
- SKU ve stok takibi
- B2B toptan fiyatlandırma
- Kategoriler ve markalar
- Çoklu görseller ve videolar
- SEO optimizasyonu
- Elasticsearch entegrasyonu

#### 📋 **Orders** (Sipariş Yönetimi)
- Çok aşamalı sipariş işleme
- Sipariş durumu takibi
- Ödeme ve kargo entegrasyonu
- İade ve iptal yönetimi
- Sipariş geçmişi ve notları
- Event-driven architecture

#### 👥 **Customers** (Müşteri Yönetimi)
- B2C ve B2B müşteri tipleri
- Şirket bilgileri (vergi, firma)
- Çoklu adres yönetimi
- Müşteri grupları ve özel fiyatlandırma
- Sosyal login entegrasyonu
- Müşteri segmentasyonu

#### 🛒 **Carts** (Sepet)
- Misafir ve üye sepet
- Sepet hesaplamaları
- Kupon uygulaması
- Terk edilmiş sepet takibi
- Session yönetimi

#### 💳 **Payments** (Ödeme)
- Stripe entegrasyonu
- İyzico entegrasyonu (Türkiye)
- Kredi kartı işlemleri
- Taksit desteği
- İade yönetimi (tam/kısmi)
- Kapıda ödeme

#### ⭐ **Reviews** (Değerlendirmeler)
- 1-5 yıldız sistemi
- Görsel ekleme
- Onaylı alışveriş doğrulaması
- Moderasyon
- Mağaza cevabı

#### 🚚 **Shipping** (Kargo)
- Çoklu kargo firmaları
- Kargo ücreti hesaplama
- Takip numarası entegrasyonu
- Kargo durumu takibi
- Kargo bölgesi yönetimi

#### 🎁 **Promotions** (Promosyonlar)
- Kupon kodları
- İndirim kampanyaları
- Flash satışlar
- Paket fırsatları (bundle deals)
- Müşteri grubu indirimleri

#### 🔍 **Search** (Arama)
- Elasticsearch entegrasyonu
- Otomatik tamamlama
- Fuzzy search
- Faceted search
- Filtreler (kategori, marka, fiyat)

#### ❤️ **Wishlist** (İstek Listesi)
- Ürün favorileme
- Fiyat düşüş bildirimleri
- Stok bildirimleri
- Paylaşım özellikleri

#### 🔔 **Notifications** (Bildirimler)
- E-posta
- SMS
- Push notification
- WhatsApp
- Şablon sistemi

#### 📂 **Categories** (Kategoriler)
- Ağaç yapısı (hiyerarşik)
- SEO dostu URL'ler
- Kategori görselleri
- Menü görünürlüğü

## 🚀 Kullanım

### Bağımsız Kullanım

```typescript
// Sadece AyazComm modülünü kullan
import { Module } from '@nestjs/common';
import { AyazCommModule } from './modules/ayaz-comm/ayaz-comm.module';

@Module({
  imports: [AyazCommModule],
})
export class AppModule {}
```

### Seçici Modül Kullanımı

```typescript
// Sadece belirli modülleri kullan
import { Module } from '@nestjs/common';
import { ProductsModule } from './modules/ayaz-comm/products/products.module';
import { OrdersModule } from './modules/ayaz-comm/orders/orders.module';

@Module({
  imports: [
    ProductsModule,
    OrdersModule,
  ],
})
export class AppModule {}
```

### AyazTrade Suite ile Kullanım

```typescript
// Tüm suite modülleriyle birlikte
import { Module } from '@nestjs/common';
import { AyazCommModule } from './modules/ayaz-comm/ayaz-comm.module';
import { AyazCrmModule } from './modules/ayaz-crm/ayaz-crm.module';
import { AyazErpModule } from './modules/ayaz-erp/ayaz-erp.module';
import { AyazWmsModule } from './modules/ayaz-wms/ayaz-wms.module';

@Module({
  imports: [
    AyazCommModule,
    AyazCrmModule,
    AyazErpModule,
    AyazWmsModule,
  ],
})
export class AppModule {}
```

## 📊 API Endpoints

### Products
- `GET /api/v1/products` - Ürün listesi
- `GET /api/v1/products/:id` - Ürün detayı
- `POST /api/v1/products` - Ürün oluştur
- `PUT /api/v1/products/:id` - Ürün güncelle
- `DELETE /api/v1/products/:id` - Ürün sil
- `GET /api/v1/products/search` - Ürün ara
- `GET /api/v1/products/featured` - Öne çıkan ürünler

### Orders
- `GET /api/v1/orders` - Sipariş listesi
- `GET /api/v1/orders/:id` - Sipariş detayı
- `POST /api/v1/orders` - Sipariş oluştur
- `PUT /api/v1/orders/:id/status` - Sipariş durumu güncelle
- `POST /api/v1/orders/:id/cancel` - Sipariş iptal
- `POST /api/v1/orders/:id/refund` - İade oluştur

### Customers
- `GET /api/v1/customers` - Müşteri listesi
- `GET /api/v1/customers/:id` - Müşteri detayı
- `POST /api/v1/customers` - Müşteri oluştur
- `PUT /api/v1/customers/:id` - Müşteri güncelle
- `GET /api/v1/customers/:id/orders` - Müşteri siparişleri

### Payments
- `POST /api/v1/payments` - Ödeme başlat
- `POST /api/v1/payments/:id/confirm` - Ödeme onayla
- `POST /api/v1/payments/:id/refund` - İade yap
- `GET /api/v1/payments/:id` - Ödeme detayı

## 🗄️ Database Schema

Modül kendi veritabanı şemalarını içerir:
- `products`, `product_variants`, `product_images`
- `orders`, `order_items`, `order_history`, `order_refunds`
- `customers`, `customer_addresses`, `customer_reviews`
- `carts`
- `payments`
- `promotions`, `coupons`
- `categories`, `brands`
- `wishlists`
- `notifications`

## 🔧 Bağımlılıklar

### Temel
- `@nestjs/common`
- `@nestjs/core`
- `drizzle-orm` / `prisma` (database)
- `class-validator` (validation)

### Opsiyonel (Özellik Bazlı)
- `@nestjs/event-emitter` (events)
- `elasticsearch` (search)
- `redis` / `ioredis` (cache)
- `stripe` (payments)
- `iyzipay` (payments - Turkey)
- `@aws-sdk/client-s3` (file storage)

## 📝 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ayazcomm

# Redis Cache (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch (Optional)
ELASTICSEARCH_NODE=http://localhost:9200

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# İyzico (Optional)
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

## 🧪 Testing

```bash
# Unit tests
npm run test -- ayaz-comm

# E2E tests
npm run test:e2e -- ayaz-comm
```

## 📄 License

Proprietary - Part of AyazTrade Enterprise Suite

---

**Part of AyazTrade Enterprise Business Suite**

Related Modules:
- 👥 **AyazCRM** - Customer Relationship Management
- 📊 **AyazERP** - Enterprise Resource Planning
- 📦 **AyazWMS** - Warehouse Management System
- 📈 **AyazAnalytics** - Business Intelligence & Analytics
- 🔗 **AyazIntegration** - Third-party Integrations

