# AyazTrade Sistem Doğrulama Kılavuzu

## Genel Bakış

AyazTrade sistem doğrulama servisi, sistemin sağlığını ve konfigürasyonunu kapsamlı bir şekilde kontrol eder.

## Kullanım

### CLI ile Doğrulama

```bash
npm run verify
```

Bu komut şunları kontrol eder:
- ✅ Tüm modüllerin doğru şekilde yüklenmesi
- ✅ Veritabanı bağlantısı
- ✅ Redis bağlantısı
- ✅ Konfigürasyon ayarları
- ✅ CRM, ERP, WMS bağlantıları (opsiyonel)
- ✅ Modül bağımlılıkları

### API Endpoint ile Doğrulama

Uygulama çalışırken:

```bash
# Temel doğrulama
curl http://localhost:5000/api/v1/verification

# Derin kontrol ile
curl "http://localhost:5000/api/v1/verification?deepCheck=true&testRealConnections=true"

# Modül doğrulaması atlanarak
curl "http://localhost:5000/api/v1/verification?confirmModules=false"
```

## Parametreler

### Query Parametreleri

- `deepCheck` (boolean): Detaylı kontrolleri çalıştırır
  - `true`: Modül bağımlılıkları ve şema tutarlılığı kontrol edilir
  - `false`: Temel kontroller yapılır (varsayılan)

- `skipReports` (boolean): Rapor oluşturmayı atlar
  - `true`: Sadece doğrulama yapılır, rapor oluşturulmaz
  - `false`: Tam rapor oluşturulur (varsayılan)

- `confirmModules` (boolean): Modül doğrulamasını çalıştırır
  - `true`: Tüm modüller kontrol edilir (varsayılan)
  - `false`: Modül kontrolü atlanır

- `testRealConnections` (boolean): Gerçek bağlantı testlerini çalıştırır
  - `true`: Veritabanı, Redis ve harici servisler test edilir (varsayılan)
  - `false`: Bağlantı testleri atlanır

## Çıktı Formatı

Doğrulama raporu şu bilgileri içerir:

```json
{
  "system": "AyazTrade",
  "timestamp": "2025-01-XX...",
  "overallStatus": "healthy|degraded|unhealthy",
  "modules": [
    {
      "module": "DatabaseModule",
      "status": "pass|fail|warning",
      "message": "Modül durumu açıklaması",
      "responseTime": 123,
      "details": {}
    }
  ],
  "connections": [...],
  "configuration": [...],
  "summary": {
    "total": 50,
    "passed": 45,
    "failed": 2,
    "warnings": 3
  }
}
```

## Durum Kodları

- **healthy**: Tüm kontroller başarılı
- **degraded**: Bazı opsiyonel kontroller başarısız (uyarılar var)
- **unhealthy**: Kritik kontroller başarısız

## Kontrol Edilen Modüller

### Core Modüller
- DatabaseModule
- CacheModule
- LoggerModule
- AuthModule
- HealthModule
- EventsModule

### İş Modülleri
- AyazCommModule
- CRMModule
- ERPModule
- WMSModule
- AnalyticsModule
- AIModule
- ProductsModule
- OrdersModule
- CustomersModule
- CartModule
- MarketplaceModule
- InventoryModule
- WebhookModule
- ExportModule
- ImportModule
- IntegrationsModule
- SustainabilityModule
- AdminModule

## Kontrol Edilen Konfigürasyonlar

### Zorunlu Konfigürasyonlar
- `DATABASE_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_NAME`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `NODE_ENV`
- `PORT`

## Sorun Giderme

### Veritabanı Bağlantı Hatası

```bash
# Veritabanı servisinin çalıştığından emin olun
docker-compose ps

# .env dosyasını kontrol edin
cat .env | grep DATABASE
```

### Redis Bağlantı Hatası

```bash
# Redis'in çalıştığından emin olun
redis-cli ping

# REDIS_HOST ve REDIS_PORT ayarlarını kontrol edin
```

### Modül Yükleme Hatası

```bash
# Bağımlılıkları kontrol edin
npm install

# TypeScript derlemesini kontrol edin
npm run build
```

## CI/CD Entegrasyonu

Doğrulama scripti CI/CD pipeline'ında kullanılabilir:

```yaml
# .github/workflows/verify.yml
- name: Verify System
  run: npm run verify
```

Başarısız durumlarda pipeline durur (exit code 1).

## Geliştirme

### Yeni Kontrol Ekleme

`src/core/verification/system-verification.service.ts` dosyasına yeni kontrol metodları ekleyebilirsiniz:

```typescript
private async verifyCustomService(): Promise<VerificationResult> {
  const startTime = Date.now();
  try {
    // Kontrol mantığı
    return {
      module: 'CustomService',
      status: 'pass',
      message: 'Custom service is healthy',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      module: 'CustomService',
      status: 'fail',
      message: `Custom service failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}
```

## İlgili Dokümantasyon

- [API Dokümantasyonu](./API_DOCUMENTATION.md)
- [Dağıtım Kılavuzu](./DEPLOYMENT_GUIDE.md)
- [Geliştirici Kılavuzu](./DEVELOPER_GUIDE.md)

