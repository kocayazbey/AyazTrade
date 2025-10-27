# Bekleyen API Entegrasyon Görevleri

## Özet
Bu doküman, frontend admin panelinde backend API'ye bağlanması gereken kalan sayfaları listeler.

## Mock Data Kullanan Sayfalar (Hemen Bağlanmalı)

### Pazarlama Modülü
1. **Marketing Segments** (`/marketing/segments`)
   - Dosya: `src/pages/marketing/segments/index.tsx`
   - Mock data var
   - API: `/api/proxy/marketing/segments`

2. **Marketing SMS** (`/marketing/sms`)
   - Dosya: `src/pages/marketing/sms/index.tsx`
   - Mock data var
   - API: `/api/proxy/marketing/sms`

### WMS Modülü
3. **WMS Warehouse** (`/wms/warehouse`)
   - Dosya: `src/pages/wms/warehouse/index.tsx`
   - Mock data var
   - API: `/api/proxy/wms/warehouses`

4. **WMS Transfers** (`/wms/transfers`)
   - Dosya: `src/pages/wms/transfers/index.tsx`
   - Mock data var
   - API: `/api/proxy/wms/transfers`

### E-Ticaret Modülü
5. **Orders Returns** (`/orders/returns`)
   - Dosya: `src/pages/orders/returns.tsx`
   - Mock data var
   - API: `/api/proxy/orders/returns`

6. **Products Brands** (`/products/brands`)
   - Dosya: `src/pages/products/brands.tsx`
   - Mock data var
   - API: `/api/proxy/products/brands`

7. **Products All** (`/products/all`)
   - Dosya: `src/pages/products/all.tsx`
   - Mock data var
   - API: `/api/proxy/products`

8. **Customer Detail** (`/customers/[id]`)
   - Dosya: `src/pages/customers/[id].tsx`
   - Mock data var
   - API: `/api/proxy/customers/{id}`

### Email Modülü
9. **Email Templates** (`/emails`)
   - Dosya: `src/pages/emails/index.tsx`
   - Mock data var
   - API: `/api/proxy/emails/templates`

## Endpoint Düzeltmeleri Gereken Sayfalar

10. **Products Categories** (`/products/categories`)
    - Dosya: `src/pages/products/categories.tsx`
    - Şu anki: `/api/v1/products/categories`
    - Olması gereken: `/api/proxy/products/categories`

11. **Users** (`/users`)
    - Dosya: `src/pages/users/index.tsx`
    - Şu anki: `/api/v1/admin/users`
    - Olması gereken: `/api/proxy/users`

## Form Submit Eksik Sayfalar

12. **Products Add** (`/products/add`)
    - Dosya: `src/pages/products/add.tsx`
    - Form submit API'ye bağlanmalı
    - API: `POST /api/proxy/products`

13. **Settings** (`/settings`)
    - Dosya: `src/pages/settings/index.tsx`
    - Form submit API'ye bağlanmalı
    - API: `PUT /api/proxy/settings`

14. **Products Brands** - Form submit eksik
    - API: `POST /api/proxy/products/brands` (oluşturma)
    - API: `PUT /api/proxy/products/brands/{id}` (güncelleme)
    - API: `DELETE /api/proxy/products/brands/{id}` (silme)

15. **Products Categories** - Form submit eksik
    - API: `POST /api/proxy/products/categories` (oluşturma)
    - API: `PUT /api/proxy/products/categories/{id}` (güncelleme)
    - API: `DELETE /api/proxy/products/categories/{id}` (silme)

## Eksik Sayfalar (Oluşturulmalı veya Kontrol Edilmeli)

### Pazarlama
16. **Marketing Email Campaigns** (`/marketing/email-campaigns`)
    - Sidebar'da link var ama sayfa eksik
    - Oluşturulmalı veya kontrol edilmeli

17. **Marketing Discounts** (`/marketing/discounts`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/marketing/discounts`

18. **Marketing Newsletter** (`/marketing/newsletter`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/marketing/newsletter`

### E-Ticaret
19. **Reviews** (`/reviews`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/reviews`

20. **Notifications** (`/notifications`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/notifications`

### İçerik Yönetimi
21. **Content Pages** (`/content/pages`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/content/pages`

22. **Content Blogs** (`/content/blogs`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/content/blogs`

23. **Content Banners** (`/content/banners`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/content/banners`

### ERP Modülü
24. **ERP Accounting** (`/erp/accounting`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/erp/accounting`

25. **ERP Financial Reports** (`/erp/financial-reports`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/erp/financial-reports`

### Sistem
26. **Security** (`/security`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/security`

27. **Webhooks** (`/webhooks`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/webhooks`

28. **Integrations** (`/integrations`)
    - Sidebar'da link var ama sayfa eksik
    - API: `/api/proxy/integrations`

### Diğer
29. **Page Builder** (`/builder`)
    - Dosya: `src/pages/builder/index.tsx`
    - Kontrol edilmeli, API entegrasyonu eklenmeli
    - API: `/api/proxy/builder`

30. **Analytics** (`/analytics`)
    - Dosya: `src/pages/analytics/index.tsx`
    - fetchAnalytics fonksiyonu kontrol edilmeli
    - API: `/api/proxy/analytics`

## Öncelik Sırası

### Yüksek Öncelik (Sık Kullanılan Sayfalar)
1. Products Brands - Mock data kaldırılmalı
2. Products All - Mock data kaldırılmalı
3. Customer Detail - Mock data kaldırılmalı
4. Orders Returns - Mock data kaldırılmalı
5. Users - Endpoint düzeltilmeli
6. Products Categories - Endpoint düzeltilmeli

### Orta Öncelik (Modül Sayfaları)
7. Marketing Segments - Mock data kaldırılmalı
8. Marketing SMS - Mock data kaldırılmalı
9. WMS Warehouse - Mock data kaldırılmalı
10. WMS Transfers - Mock data kaldırılmalı
11. Email Templates - Mock data kaldırılmalı

### Düşük Öncelik (Eksik Sayfalar)
12. Eksik sayfalar oluşturulmalı veya kontrol edilmeli
13. Form submit'ler tamamlanmalı

## Notlar

- Tüm API çağrıları `/api/proxy` üzerinden yapılmalı
- Mock data yerine gerçek API kullanılmalı
- Hata durumlarında graceful fallback (boş array) gösterilmeli
- Loading state'ler yönetilmeli
- Toast bildirimleri eklenmeli (kritik işlemler için)

## Tamamlanan Sayfalar ✅

- Dashboard
- Products (ana sayfa)
- Orders (tüm sayfalar)
- Customers (liste)
- CRM Leads
- CRM Quotes
- CRM Contracts
- CRM Activities
- Marketing Campaigns
- ERP Invoices
- ERP Payments
- Shipping
- WMS Inventory

Toplam: **14 sayfa tamamlandı**, **50 görev kaldı**

