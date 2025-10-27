# AyazTrade Refactoring ToDo Listesi

## Tamamlanan Görevler ✅
- [x] Env adlarını projede standartlaştır (DATABASE_HOST vs DB_HOST)
- [x] tsconfig'i strict moda al ve derleme ayarlarını sertleştir
- [x] GlobalExceptionFilter'dan Prisma bağımlılıklarını temizle

---

## Yüksek Öncelikli - Temel Altyapı

### 1. Veritabanı ve ORM
- [ ] Prisma bağımlılıklarını kaldır ve yalnızca Drizzle kullan
- [ ] DatabaseService'i yalnızca Drizzle'ı kullanacak şekilde sadeleştir
- [ ] DRIZZLE_ORM provider'ını tek modülde topla; yineleneni kaldır
- [ ] DatabaseService'den PrismaClient kaldır

### 2. Konfigürasyon ve Doğrulama
- [ ] Env değişkenleri için doğrulama katmanı ekle (Config validation)
- [ ] `env.example` ile koddaki config anahtarlarını senkronize et
- [ ] database.config.ts'de eski DB_* isimlerini DATABASE_* ile güncelle

### 3. Health Check ve Probe
- [ ] K8s liveness/readiness yollarını gerçek endpointlerle hizala
- [ ] Docker HEALTHCHECK ve nginx yollarını API prefix ile hizala
- [ ] HealthService'deki database.client.execute() hatasını düzelt

---

## Orta Öncelikli - Güvenlik ve Kimlik Doğrulama

### 4. JWT ve Auth
- [ ] JwtModule.registerAsync ve JwtStrategy'yi AuthModule'de yapılandır
- [ ] PassportModule bağla, JwtAuthGuard'ı varsayılan guard yap
- [ ] Şifre hashleme ve parola politikası (bcrypt + kurallar) uygula
- [ ] Refresh token rotasyonu ve token revoke store (Redis) ekle
- [ ] RBAC/ABAC yetkilendirme guard ve decorator'larını uygula

### 5. Güvenlik ve Rate Limiting
- [ ] CORS ve Helmet CSP'yi sıkılaştır; yapılandırılabilir direktifler ekle
- [ ] Gerekli ise CSRF korumasını uygun endpointlerde etkinleştir
- [ ] Nest CacheModule'u Redis store ile entegre et (CACHE_MANAGER)
- [ ] RateLimitGuard'ı CACHE_MANAGER ve TTL ile refaktör et
- [ ] Rate-limit değerlerini decorator tabanlı parametrize et
- [ ] DDoS koruma eşiklerini ve davranışını ayarla/test et

---

## Düşük Öncelikli - Entity ve Repository

### 6. Entity Düzeltmeleri
- [ ] `cart.entity.ts` ve `cart-item.entity.ts` TS hatalarını gider

### 7. Repository Pattern (Drizzle)
- [ ] Products için Drizzle repository ve query'leri yaz
- [ ] Categories için Drizzle repository ve endpointleri yaz
- [ ] Reviews için Drizzle repository ve moderation akışını yaz
- [ ] Customers için Drizzle repository ve endpointleri yaz
- [ ] Orders için Drizzle repository ve durum akışlarını yaz
- [ ] Cart için Drizzle repository ve kupon/indirim mantığını yaz

---

## İş Mantığı (Core Features)

### 8. Products
- [ ] Products CRUD + filtre/pagination/sort endpointlerini tamamla

### 9. Categories
- [ ] Categories CRUD ve hiyerarşi endpointlerini tamamla

### 10. Reviews
- [ ] Reviews CRUD, onay ve doğrulama süreçlerini tamamla

### 11. Customers
- [ ] Customers CRUD ve arama/filtre endpointlerini tamamla

### 12. Cart ve Checkout
- [ ] Cart ve fiyatlandırma/vergilendirme toplamlama mantığını uygula
- [ ] Checkout, adres ve kargo ücret hesaplama akışını uygula

### 13. Orders
- [ ] Orders CRUD, durum geçişleri ve olay yayınlarını uygula

---

## Entegrasyonlar

### 14. Ödeme ve Kargo
- [ ] Stripe + Iyzico ödeme akışı ve webhook doğrulamasını uygula
- [ ] Kargo sağlayıcı entegrasyonları ve gönderi takibi iskeletini ekle

### 15. Webhook ve Bildirimler
- [ ] Webhook yönetimi (inbound/outbound) ve imza doğrulaması ekle
- [ ] Bildirim tercihleri ve şablon yönetimi endpointlerini ekle

### 16. Analytics
- [ ] Analytics KPI endpointlerini (RED, satış, sipariş) ekle

### 17. Stok ve Envanter
- [ ] Stok rezervasyonu ve hareketleri (inventory) endpointlerini ekle

### 18. Elasticsearch
- [ ] Elasticsearch için product index mapping ve analyzer'ları tanımla
- [ ] ES indeksleme işleri (event driven + nightly reindex) yaz
- [ ] Autocomplete/suggestion ve facet filtreli arama API'larını yaz

---

## Notlar
- Öncelik sırasına göre ilerlenmelidir
- Her görev tamamlandığında buraya işaretlenmeli
- Testler her değişiklikten sonra çalıştırılmalı
- Breaking changes için migration planı hazırlanmalı
