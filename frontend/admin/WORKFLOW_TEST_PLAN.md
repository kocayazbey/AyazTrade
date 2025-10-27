# AyazTrade Admin Panel - Workflow Test Plan

## 📋 Test Edilecek Workflow'lar

### 1. Authentication Workflow
- [ ] Login sayfası açılıyor mu?
- [ ] Login form çalışıyor mu?
- [ ] Başarılı login sonrası dashboard'a yönlendirme
- [ ] Token localStorage'a kaydediliyor mu?
- [ ] Logout çalışıyor mu?
- [ ] Protected routes kontrolü
- [ ] Unauthorized sayfa erişimi

### 2. Navigation Workflow
- [ ] Sidebar tüm menüleri gösteriyor mu?
- [ ] Menüler kategorize mi?
- [ ] Active state çalışıyor mu?
- [ ] Tüm linkler doğru sayfalara gidiyor mu?
- [ ] Mobile responsive sidebar

### 3. Ana Menü Sayfaları
- [ ] /dashboard - Dashboard
- [ ] /analytics - Analytics
- [ ] /notifications - Bildirimler (badge: 5)

### 4. E-Ticaret (B2B/B2C) Sayfaları
- [ ] /products - Ürünler
- [ ] /categories - Kategoriler
- [ ] /orders - Siparişler
- [ ] /carts - Sepetler
- [ ] /reviews - Değerlendirmeler
- [ ] /campaigns - Kampanyalar
- [ ] /marketplace - Marketplace

### 5. CRM Sayfaları
- [ ] /crm/leads - Leads
- [ ] /crm/quotes - Teklifler
- [ ] /crm/contracts - Sözleşmeler
- [ ] /crm/activities - Aktiviteler

### 6. ERP & Finans Sayfaları
- [ ] /erp/invoices - Faturalar
- [ ] /erp/payments - Ödemeler
- [ ] /erp/accounting - Muhasebe
- [ ] /erp/efatura - e-Fatura
- [ ] /erp/financial-reports - Finansal Raporlar

### 7. WMS & Lojistik Sayfaları
- [ ] /wms/warehouse - Depo Yönetimi
- [ ] /wms/inventory - Stok Yönetimi
- [ ] /wms/transfers - Transfer
- [ ] /shipping - Sevkiyat

### 8. Pazarlama Sayfaları
- [ ] /emails - E-posta Şablonları
- [ ] /marketing/sms - SMS Kampanyaları
- [ ] /marketing/segments - Hedef Kitlemler
- [ ] /builder - Sayfa Düzenleyici

### 9. Sistem Sayfaları
- [ ] /settings - Ayarlar
- [ ] /security - Güvenlik
- [ ] /webhooks - Webhook'ler
- [ ] /integrations - Entegrasyonlar

## 🔍 Eksik Sayfalar (Oluşturulacak)

### app/ dizininde eksik sayfalar:
1. /crm/* - Tüm CRM sayfaları
2. /erp/* - Tüm ERP sayfaları
3. /wms/* - Tüm WMS sayfaları
4. /marketing/* - Marketing sayfaları
5. /security - Güvenlik
6. /webhooks - Webhooks
7. /integrations - Entegrasyonlar
8. /notifications - Bildirimler
9. /categories - Kategoriler
10. /carts - Sepetler
11. /reviews - Değerlendirmeler
12. /marketplace - Marketplace
13. /shipping - Sevkiyat
14. /dashboard - Ana dashboard

## 🎯 Test Senaryoları

### Scenario 1: İlk Giriş
1. Tarayıcıda localhost:3002 aç
2. /login sayfasına yönlendir
3. Email: test@ayaztrade.com, Password: 123456
4. Login butonuna bas
5. Dashboard'a yönlendirilmeli
6. Sidebar menüler görünmeli

### Scenario 2: Menü Navigasyonu
1. Her menü item'a tıkla
2. Sayfa yüklenmeli
3. Active state değişmeli
4. URL güncellemeli
5. Sayfa içeriği görünmeli

### Scenario 3: CRM Workflow
1. CRM > Leads sayfasına git
2. Lead listesi görüntüle
3. CRM > Quotes'a geç
4. Teklif oluştur/görüntüle
5. CRM > Contracts'a geç
6. Sözleşme yönetimi

### Scenario 4: E-Commerce Workflow
1. Products sayfasına git
2. Ürün listele
3. Orders sayfasına git
4. Sipariş detayları
5. Customers sayfasına git
6. Müşteri bilgileri

### Scenario 5: Logout & Security
1. Logout butonuna bas
2. Login sayfasına dön
3. Token temizlenmiş mi?
4. Protected route'a direkt erişim dene
5. Unauthorized page görünmeli

## 🐛 Bilinen Sorunlar

- [ ] app/ ve src/app/ arasında tutarsızlık
- [ ] Bazı sayfalar eksik
- [ ] API integration bağlantıları mock

## ✅ Çözümler

1. Eksik sayfaları oluştur
2. Routing yapılandırmasını düzelt
3. API mock'ları test et
4. Loading states ekle
5. Error handling iyileştir

