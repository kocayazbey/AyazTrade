# AyazTrade - Enterprise E-Commerce ERP Suite

## 🚀 Proje Özeti

AyazTrade, modern e-ticaret işletmeleri için tasarlanmış kapsamlı bir ERP (Enterprise Resource Planning) çözümüdür. Rol tabanlı erişim kontrolü, gelişmiş menü yapısı ve gerçek zamanlı veri yönetimi ile işletmelerin tüm süreçlerini tek platformda yönetmelerini sağlar.

## ✨ Özellikler

### 🎯 Ana Modüller
- **E-Ticaret**: Ürün, sipariş, müşteri yönetimi
- **CRM**: Lead, teklif, sözleşme, aktivite takibi
- **ERP**: Fatura, ödeme, muhasebe, raporlama
- **WMS**: Depo, stok, transfer, sevkiyat yönetimi
- **Pazarlama**: Kampanya, segmentasyon, e-posta/SMS
- **İçerik**: Sayfa, blog, banner yönetimi
- **Sistem**: Kullanıcı, rol, güvenlik ayarları

### 🔐 Güvenlik & Yetkilendirme
- **Rol Tabanlı Erişim Kontrolü (RBAC)**
- **5 Farklı Kullanıcı Rolü**:
  - Süper Yönetici (Tüm yetkiler)
  - Ürün Yöneticisi (Ürün yönetimi)
  - Sipariş Yöneticisi (Sipariş işlemleri)
  - Pazarlama Uzmanı (Kampanya yönetimi)
  - Mali İşler (Finansal işlemler)

### 🎨 Kullanıcı Arayüzü
- **Modern iOS Tarzı Tasarım**
- **Responsive Layout** (Mobil uyumlu)
- **Gelişmiş Menü Yapısı** (Alt menüler ile)
- **Gerçek Zamanlı Veri Güncelleme**
- **Koyu/Açık Tema Desteği**

## 🛠️ Teknoloji Stack

### Backend
- **NestJS** - Node.js framework
- **PostgreSQL** - Veritabanı
- **Drizzle ORM** - Veritabanı ORM
- **JWT** - Kimlik doğrulama
- **Redis** - Cache yönetimi
- **Socket.io** - Gerçek zamanlı iletişim

### Frontend
- **Next.js 13** - React framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Styling
- **Lucide React** - İkonlar
- **React Query** - Veri yönetimi

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/your-org/ayaz-trade.git
cd ayaz-trade
```

### 2. Bağımlılıkları Yükleyin
```bash
# Backend bağımlılıkları
npm install

# Frontend bağımlılıkları
cd frontend/admin
npm install
cd ../..
```

### 3. Ortam Değişkenlerini Ayarlayın
```bash
cp env.example .env
```

`.env` dosyasını düzenleyin:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ayaztrade"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"

# API
API_PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

### 4. Veritabanını Kurun
```bash
# Veritabanı şemasını oluştur
npm run db:push

# Örnek verileri yükle
npm run db:seed
```

### 5. Uygulamayı Başlatın
```bash
# Backend'i başlat (Terminal 1)
npm run dev

# Frontend'i başlat (Terminal 2)
npm run frontend:dev
```

## 🎯 Kullanım

### Giriş Bilgileri
Sistem kurulumu sonrası aşağıdaki test hesapları ile giriş yapabilirsiniz:

| Email | Şifre | Rol |
|-------|-------|-----|
| admin@ayaztrade.com | password | Süper Yönetici |
| product@ayaztrade.com | password | Ürün Yöneticisi |
| order@ayaztrade.com | password | Sipariş Yöneticisi |

### Ana Özellikler

#### 📊 Dashboard
- Gerçek zamanlı istatistikler
- Satış, sipariş, müşteri metrikleri
- Grafik ve raporlar
- Son aktiviteler

#### 🛍️ E-Ticaret Yönetimi
- **Ürünler**: Kapsamlı ürün kataloğu
- **Siparişler**: Sipariş takibi ve yönetimi
- **Müşteriler**: Müşteri profilleri ve geçmişi
- **Kategoriler**: Ürün kategorileri ve markalar

#### 👥 CRM Sistemi
- **Leads**: Potansiyel müşteri takibi
- **Teklifler**: Teklif oluşturma ve yönetimi
- **Sözleşmeler**: Sözleşme takibi
- **Aktiviteler**: Müşteri etkileşimleri

#### 💰 ERP Modülü
- **Faturalar**: Fatura oluşturma ve takibi
- **Ödemeler**: Ödeme işlemleri
- **Muhasebe**: Mali kayıtlar
- **Raporlar**: Finansal raporlar

#### 📦 WMS & Lojistik
- **Depo Yönetimi**: Depo bilgileri
- **Stok Takibi**: Envanter yönetimi
- **Transfer**: Depo transferleri
- **Sevkiyat**: Kargo takibi

#### 📢 Pazarlama
- **Kampanyalar**: E-posta ve SMS kampanyaları
- **Segmentasyon**: Müşteri grupları
- **E-posta Şablonları**: Şablon yönetimi
- **İndirimler**: Promosyon yönetimi

## 🔧 Geliştirme

### Proje Yapısı
```
ayaz-trade/
├── src/                    # Backend kaynak kodları
│   ├── modules/           # İş modülleri
│   ├── core/              # Çekirdek servisler
│   └── database/          # Veritabanı şemaları
├── frontend/admin/        # Admin panel frontend
│   ├── src/
│   │   ├── pages/         # Sayfalar
│   │   ├── components/    # React bileşenleri
│   │   ├── contexts/      # Context API
│   │   ├── hooks/         # Custom hooks
│   │   └── services/      # API servisleri
├── scripts/               # Yardımcı scriptler
└── docs/                  # Dokümantasyon
```

### Geliştirme Komutları
```bash
# Backend geliştirme
npm run start:dev

# Frontend geliştirme
npm run frontend:dev

# Test çalıştırma
npm run test

# Linting
npm run lint

# Veritabanı işlemleri
npm run db:generate    # Şema oluştur
npm run db:push        # Şemayı uygula
npm run db:seed        # Örnek veri yükle
```

## 📈 Performans

### Optimizasyonlar
- **Lazy Loading**: Sayfa bazlı kod bölme
- **Caching**: Redis ile veri önbellekleme
- **Database Indexing**: Optimize edilmiş sorgular
- **CDN**: Statik dosya dağıtımı
- **Compression**: Gzip sıkıştırma

### Ölçeklenebilirlik
- **Horizontal Scaling**: Mikroservis mimarisi
- **Load Balancing**: Yük dengeleme
- **Database Sharding**: Veritabanı bölümleme
- **Caching Strategy**: Çok katmanlı önbellekleme

## 🔒 Güvenlik

### Güvenlik Önlemleri
- **JWT Authentication**: Token tabanlı kimlik doğrulama
- **Role-Based Access Control**: Rol bazlı yetkilendirme
- **Input Validation**: Giriş doğrulama
- **SQL Injection Protection**: ORM ile koruma
- **XSS Protection**: Cross-site scripting koruması
- **CSRF Protection**: Cross-site request forgery koruması

## 📊 Monitoring & Logging

### İzleme Araçları
- **Application Monitoring**: Performans izleme
- **Error Tracking**: Hata takibi
- **User Analytics**: Kullanıcı analitikleri
- **Database Monitoring**: Veritabanı performansı

## 🚀 Deployment

### Production Kurulumu
```bash
# Backend build
npm run build

# Frontend build
npm run frontend:build

# Production start
npm run start:prod
```

### Docker Deployment
```bash
# Docker Compose ile başlat
docker-compose up -d

# Kubernetes ile deploy
kubectl apply -f k8s/
```

## 📝 API Dokümantasyonu

API dokümantasyonu Swagger UI üzerinden erişilebilir:
- **Development**: http://localhost:3000/api/docs
- **Production**: https://api.ayaztrade.com/docs

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

- **Website**: https://ayaztrade.com
- **Email**: info@ayaztrade.com
- **Support**: support@ayaztrade.com

## 🙏 Teşekkürler

Bu proje aşağıdaki açık kaynak projeleri kullanmaktadır:
- [NestJS](https://nestjs.com/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Drizzle ORM](https://orm.drizzle.team/)

---

**AyazTrade** - Modern E-Ticaret ERP Çözümü 🚀