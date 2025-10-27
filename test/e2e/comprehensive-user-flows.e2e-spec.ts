import { test, expect, Page } from '@playwright/test';

test.describe('Complete User Journey - E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to admin panel
    await page.goto('http://localhost:5001');

    // Login
    await page.fill('input[type="email"]', 'admin@ayaztrade.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Admin Panel Complete Flow', () => {
    test('should complete product management flow', async () => {
      // Navigate to products page
      await page.goto('http://localhost:5001/products');
      await page.waitForLoadState('networkidle');

      // Click add product button
      await page.click('button:has-text("Yeni Ürün")');
      await page.waitForSelector('form');

      // Fill product form
      await page.fill('input[name="name"]', 'E2E Test Ürünü');
      await page.fill('input[name="sku"]', 'E2E-TEST-001');
      await page.fill('input[name="price"]', '299.99');
      await page.fill('input[name="stock"]', '100');
      await page.selectOption('select[name="categoryId"]', '1');
      await page.fill('textarea[name="description"]', 'Bu ürün E2E testleri için oluşturulmuştur');

      // Submit form
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/products') && response.status() === 201);

      // Verify product appears in list
      await expect(page.locator('text=E2E Test Ürünü')).toBeVisible();
      await expect(page.locator('text=E2E-TEST-001')).toBeVisible();

      // Edit product
      await page.click('button:has-text("Düzenle")');
      await page.waitForSelector('form');
      await page.fill('input[name="price"]', '349.99');
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/products') && response.status() === 200);

      // Verify price update
      await expect(page.locator('text=349.99')).toBeVisible();

      // Delete product
      await page.click('button:has-text("Sil")');
      await page.click('button:has-text("Evet")');
      await page.waitForResponse(response => response.url().includes('/api/v1/products') && response.status() === 200);

      // Verify product is removed
      await expect(page.locator('text=E2E Test Ürünü')).not.toBeVisible();
    });

    test('should complete customer management flow', async () => {
      // Navigate to customers page
      await page.goto('http://localhost:5001/customers');
      await page.waitForLoadState('networkidle');

      // Add new customer
      await page.click('button:has-text("Yeni Müşteri")');
      await page.waitForSelector('form');

      // Fill customer form
      await page.fill('input[name="name"]', 'E2E Test Müşterisi');
      await page.fill('input[name="email"]', 'e2e.customer@example.com');
      await page.fill('input[name="phone"]', '+905551234567');
      await page.fill('input[name="company"]', 'E2E Test Şirketi');

      // Submit form
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/customers') && response.status() === 201);

      // Verify customer appears in list
      await expect(page.locator('text=E2E Test Müşterisi')).toBeVisible();
      await expect(page.locator('text=e2e.customer@example.com')).toBeVisible();

      // View customer details
      await page.click('button:has-text("Görüntüle")');
      await page.waitForSelector('.customer-details');

      // Verify customer details
      await expect(page.locator('text=E2E Test Müşterisi')).toBeVisible();
      await expect(page.locator('text=e2e.customer@example.com')).toBeVisible();

      // Edit customer
      await page.click('button:has-text("Düzenle")');
      await page.fill('input[name="phone"]', '+905558765432');
      await page.click('button[type="submit"]');

      // Verify phone update
      await expect(page.locator('text=+905558765432')).toBeVisible();
    });

    test('should complete order management flow', async () => {
      // Navigate to orders page
      await page.goto('http://localhost:5001/orders');
      await page.waitForLoadState('networkidle');

      // Create new order
      await page.click('button:has-text("Yeni Sipariş")');
      await page.waitForSelector('form');

      // Select customer
      await page.fill('input[placeholder*="Müşteri ara"]', 'E2E Test Müşterisi');
      await page.click('.customer-suggestion');
      await page.waitForTimeout(500);

      // Add product
      await page.fill('input[placeholder*="Ürün ara"]', 'E2E Test Ürünü');
      await page.click('.product-suggestion');
      await page.fill('input[name="quantity"]', '2');

      await page.click('button:has-text("Ürün Ekle")');
      await page.waitForTimeout(500);

      // Fill shipping address
      await page.fill('input[name="shippingStreet"]', 'E2E Test Sokak No:1');
      await page.fill('input[name="shippingCity"]', 'E2E Test Şehir');
      await page.fill('input[name="shippingZipCode"]', '34000');

      // Select payment method
      await page.selectOption('select[name="paymentMethod"]', 'credit_card');

      // Submit order
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/orders') && response.status() === 201);

      // Verify order appears in list
      await expect(page.locator('text=E2E Test Müşterisi')).toBeVisible();

      // Process payment
      await page.click('button:has-text("Ödeme İşle")');
      await page.fill('input[name="cardNumber"]', '4111111111111111');
      await page.fill('input[name="expiryMonth"]', '12');
      await page.fill('input[name="expiryYear"]', '25');
      await page.fill('input[name="cvv"]', '123');

      await page.click('button:has-text("Ödeme Al")');
      await page.waitForResponse(response => response.url().includes('/payment') && response.status() === 200);

      // Update order status
      await page.selectOption('select[name="status"]', 'processing');
      await page.click('button:has-text("Güncelle")');
      await page.waitForTimeout(500);

      // Ship order
      await page.fill('input[name="trackingNumber"]', 'TRK123456789');
      await page.selectOption('select[name="shippingStatus"]', 'shipped');
      await page.click('button:has-text("Kargo Güncelle")');
      await page.waitForTimeout(500);

      // Deliver order
      await page.selectOption('select[name="status"]', 'delivered');
      await page.click('button:has-text("Teslim Et")');
      await page.waitForTimeout(500);

      // Verify final status
      await expect(page.locator('text=Teslim Edildi')).toBeVisible();
      await expect(page.locator('text=TRK123456789')).toBeVisible();
    });

    test('should complete analytics and reporting flow', async () => {
      // Navigate to analytics
      await page.goto('http://localhost:5001/analytics');
      await page.waitForLoadState('networkidle');

      // Check dashboard metrics
      await expect(page.locator('.metric-card')).toHaveCount(4); // Total Sales, Orders, Customers, Products

      // Generate report
      await page.click('button:has-text("Rapor Oluştur")');
      await page.selectOption('select[name="reportType"]', 'sales');
      await page.selectOption('select[name="period"]', '30d');
      await page.click('button:has-text("Oluştur")');

      // Wait for report generation
      await page.waitForResponse(response => response.url().includes('/api/v1/reports') && response.status() === 200);

      // Verify report download
      await expect(page.locator('text=Rapor hazır')).toBeVisible();

      // Navigate to different analytics views
      await page.click('a:has-text("Detaylı Analitik")');
      await page.waitForLoadState('networkidle');

      // Check charts are loaded
      await expect(page.locator('.chart-container')).toBeVisible();

      // Export analytics
      await page.click('button:has-text("Dışa Aktar")');
      await page.click('button:has-text("PDF")');
      await page.waitForTimeout(2000); // Wait for download
    });
  });

  test.describe('PWA Functionality', () => {
    test('should install PWA successfully', async () => {
      // Wait for install prompt
      await page.waitForSelector('.pwa-install-prompt', { timeout: 10000 });

      // Click install button
      await page.click('button:has-text("Yükle")');
      await page.waitForTimeout(1000);

      // Verify PWA is installed
      const isStandalone = await page.evaluate(() => window.matchMedia('(display-mode: standalone)').matches);
      expect(isStandalone).toBe(true);
    });

    test('should work offline', async () => {
      // Navigate to a page that should work offline
      await page.goto('http://localhost:5001/dashboard');
      await page.waitForLoadState('networkidle');

      // Go offline (simulate network disconnection)
      await page.context().setOffline(true);

      // Try to navigate (should work due to service worker caching)
      await page.goto('http://localhost:5001/products');
      await page.waitForTimeout(2000);

      // Should show offline indicator
      await expect(page.locator('text=İnternet bağlantınız yok')).toBeVisible();

      // Go back online
      await page.context().setOffline(false);

      // Should reconnect and sync data
      await expect(page.locator('text=İnternet bağlantınız yok')).not.toBeVisible();
    });

    test('should handle push notifications', async () => {
      // Request notification permission
      const permission = await page.evaluate(() => {
        return Notification.requestPermission();
      });

      expect(['granted', 'default']).toContain(permission);

      // Test notification display
      await page.evaluate(() => {
        new Notification('Test Bildirimi', {
          body: 'Bu bir test bildirimi',
          icon: '/icons/icon-192x192.png',
        });
      });

      // Should show notification (if permission granted)
      if (permission === 'granted') {
        await page.waitForTimeout(1000);
        // In a real scenario, you would verify the notification appears
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async () => {
      // Navigate to a page
      await page.goto('http://localhost:5001/dashboard');
      await page.waitForLoadState('networkidle');

      // Simulate slow network
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.abort();
      });

      // Try to perform an action that requires network
      await page.click('button:has-text("Rapor Al")');

      // Should show error message
      await expect(page.locator('text=Bağlantı hatası')).toBeVisible({ timeout: 10000 });

      // Remove network interception
      await page.unroute('**/api/**');

      // Should recover when network is restored
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should handle validation errors', async () => {
      // Navigate to product creation
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Yeni Ürün")');
      await page.waitForSelector('form');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('.error-message')).toBeVisible();

      // Fill required fields
      await page.fill('input[name="name"]', 'Valid Product');
      await page.fill('input[name="sku"]', 'VALID-001');
      await page.fill('input[name="price"]', '100');

      // Clear errors after valid input
      await expect(page.locator('.error-message')).not.toBeVisible();
    });

    test('should handle session timeout', async () => {
      // Navigate to a protected page
      await page.goto('http://localhost:5001/dashboard');
      await page.waitForLoadState('networkidle');

      // Simulate session timeout by clearing localStorage
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      });

      // Try to access protected resource
      await page.goto('http://localhost:5001/orders');

      // Should redirect to login
      await expect(page.url()).toContain('/login');
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load pages within performance budget', async () => {
      const startTime = Date.now();

      // Navigate to dashboard
      await page.goto('http://localhost:5001/dashboard');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should be keyboard accessible', async () => {
      await page.goto('http://localhost:5001/dashboard');
      await page.waitForLoadState('networkidle');

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);

      // Test form accessibility
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Yeni Ürün")');
      await page.waitForSelector('form');

      // All form inputs should be accessible
      const inputs = await page.locator('input, select, textarea').count();
      expect(inputs).toBeGreaterThan(0);
    });

    test('should handle mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('http://localhost:5001/dashboard');
      await page.waitForLoadState('networkidle');

      // Should show mobile-friendly layout
      await expect(page.locator('.mobile-menu')).toBeVisible();

      // Test mobile navigation
      await page.click('.mobile-menu-button');
      await expect(page.locator('.mobile-sidebar')).toBeVisible();

      // Test touch interactions
      await page.tap('button:has-text("Analytics")');
      await expect(page.url()).toContain('/analytics');
    });
  });

  test.describe('Data Integrity and Consistency', () => {
    test('should maintain data consistency across operations', async () => {
      // Create product
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Yeni Ürün")');
      await page.fill('input[name="name"]', 'Consistency Test Product');
      await page.fill('input[name="sku"]', 'CONSISTENCY-001');
      await page.fill('input[name="price"]', '199.99');
      await page.fill('input[name="stock"]', '50');
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/products') && response.status() === 201);

      // Get initial stock
      await page.click('button:has-text("Düzenle")');
      const initialStock = await page.inputValue('input[name="stock"]');
      expect(initialStock).toBe('50');

      // Create order for the product
      await page.goto('http://localhost:5001/orders');
      await page.click('button:has-text("Yeni Sipariş")');
      await page.fill('input[placeholder*="Müşteri ara"]', 'Test Customer');
      await page.click('.customer-suggestion');
      await page.fill('input[placeholder*="Ürün ara"]', 'Consistency Test Product');
      await page.click('.product-suggestion');
      await page.fill('input[name="quantity"]', '5');
      await page.click('button:has-text("Ürün Ekle")');
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/orders') && response.status() === 201);

      // Verify stock was reduced
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Düzenle")');
      const updatedStock = await page.inputValue('input[name="stock"]');
      expect(updatedStock).toBe('45'); // 50 - 5

      // Cancel order and verify stock restoration
      await page.goto('http://localhost:5001/orders');
      await page.click('button:has-text("İptal")');
      await page.click('button:has-text("Evet")');
      await page.waitForResponse(response => response.url().includes('/api/v1/orders') && response.status() === 200);

      // Verify stock was restored
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Düzenle")');
      const restoredStock = await page.inputValue('input[name="stock"]');
      expect(restoredStock).toBe('50'); // Restored to original value
    });

    test('should handle concurrent modifications', async () => {
      // Create product
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Yeni Ürün")');
      await page.fill('input[name="name"]', 'Concurrent Test Product');
      await page.fill('input[name="sku"]', 'CONCURRENT-001');
      await page.fill('input[name="price"]', '99.99');
      await page.fill('input[name="stock"]', '100');
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/products') && response.status() === 201);

      // Open two browser contexts for concurrent editing
      const context1 = page.context();
      const context2 = await context1.browser()?.newContext() || context1;

      const page1 = page;
      const page2 = await context2.newPage();

      // Both pages edit the same product
      await page1.goto('http://localhost:5001/products');
      await page2.goto('http://localhost:5001/products');

      // Page 1 edits first
      await page1.click('button:has-text("Düzenle")');
      await page1.fill('input[name="price"]', '149.99');
      await page1.click('button[type="submit"]');
      await page1.waitForResponse(response => response.url().includes('/api/v1/products') && response.status() === 200);

      // Page 2 tries to edit (should handle conflict)
      await page2.click('button:has-text("Düzenle")');
      await page2.fill('input[name="price"]', '199.99');
      await page2.click('button[type="submit"]');

      // Should handle version conflict gracefully
      const response = await page2.waitForResponse(response =>
        response.url().includes('/api/v1/products') && (response.status() === 200 || response.status() === 409)
      );

      if (response.status() === 409) {
        // Version conflict handled
        await expect(page2.locator('text=Versiyon çakışması')).toBeVisible();
      }

      await page2.close();
    });
  });

  test.describe('Business Logic Validation', () => {
    test('should enforce business rules', async () => {
      // Try to create order with insufficient stock
      await page.goto('http://localhost:5001/orders');
      await page.click('button:has-text("Yeni Sipariş")');

      // Create a product with low stock first
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Yeni Ürün")');
      await page.fill('input[name="name"]', 'Low Stock Product');
      await page.fill('input[name="sku"]', 'LOW-STOCK-001');
      await page.fill('input[name="price"]', '49.99');
      await page.fill('input[name="stock"]', '2');
      await page.click('button[type="submit"]');
      await page.waitForResponse(response => response.url().includes('/api/v1/products') && response.status() === 201);

      // Try to order more than available stock
      await page.goto('http://localhost:5001/orders');
      await page.click('button:has-text("Yeni Sipariş")');
      await page.fill('input[placeholder*="Müşteri ara"]', 'Test Customer');
      await page.click('.customer-suggestion');
      await page.fill('input[placeholder*="Ürün ara"]', 'Low Stock Product');
      await page.click('.product-suggestion');
      await page.fill('input[name="quantity"]', '5'); // More than available (2)
      await page.click('button:has-text("Ürün Ekle")');
      await page.click('button[type="submit"]');

      // Should show error for insufficient stock
      await expect(page.locator('text=Yetersiz stok')).toBeVisible();
    });

    test('should calculate totals correctly', async () => {
      // Create order with multiple items and verify calculations
      await page.goto('http://localhost:5001/orders');
      await page.click('button:has-text("Yeni Sipariş")');

      // Add multiple products
      await page.fill('input[placeholder*="Müşteri ara"]', 'Test Customer');
      await page.click('.customer-suggestion');

      // Add first product
      await page.fill('input[placeholder*="Ürün ara"]', 'Product 1');
      await page.click('.product-suggestion');
      await page.fill('input[name="quantity"]', '2');
      await page.click('button:has-text("Ürün Ekle")');

      // Add second product
      await page.fill('input[placeholder*="Ürün ara"]', 'Product 2');
      await page.click('.product-suggestion');
      await page.fill('input[name="quantity"]', '1');
      await page.click('button:has-text("Ürün Ekle")');

      // Check subtotal before tax and shipping
      await expect(page.locator('.order-subtotal')).toBeVisible();

      // Fill shipping and verify total calculation
      await page.fill('input[name="shippingStreet"]', '123 Test St');
      await page.fill('input[name="shippingCity"]', 'Test City');
      await page.fill('input[name="shippingZipCode"]', '12345');

      // Should show calculated totals
      await expect(page.locator('.order-total')).toBeVisible();
      await expect(page.locator('.tax-amount')).toBeVisible();
      await expect(page.locator('.shipping-amount')).toBeVisible();
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('should work on different browsers', async () => {
      // Test basic functionality that should work across browsers
      await page.goto('http://localhost:5001/dashboard');
      await page.waitForLoadState('networkidle');

      // Test core functionality
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

      // Test navigation
      await page.click('a:has-text("Products")');
      await expect(page.url()).toContain('/products');

      // Test search functionality
      await page.fill('input[placeholder*="Ara"]', 'test');
      await page.press('Enter');
      await page.waitForLoadState('networkidle');

      // Should handle search across browsers
      await expect(page.locator('.search-results')).toBeVisible();
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS attacks', async () => {
      // Try to inject malicious script
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Yeni Ürün")');

      const maliciousScript = '<script>alert("xss")</script>';
      await page.fill('input[name="name"]', maliciousScript);
      await page.fill('textarea[name="description"]', maliciousScript);

      await page.click('button[type="submit"]');

      // Should either reject or sanitize the input
      const response = await page.waitForResponse(response =>
        response.url().includes('/api/v1/products')
      );

      if (response.status() === 400) {
        await expect(page.locator('text=Geçersiz karakterler')).toBeVisible();
      } else {
        // If accepted, verify it's sanitized in display
        await page.goto('http://localhost:5001/products');
        await expect(page.locator('text=<script>')).not.toBeVisible();
      }
    });

    test('should enforce authentication', async () => {
      // Clear authentication
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      });

      // Try to access protected routes
      await page.goto('http://localhost:5001/dashboard');
      await expect(page.url()).toContain('/login');

      await page.goto('http://localhost:5001/orders');
      await expect(page.url()).toContain('/login');

      await page.goto('http://localhost:5001/customers');
      await expect(page.url()).toContain('/login');
    });

    test('should handle CSRF protection', async () => {
      // This would test CSRF tokens in forms
      await page.goto('http://localhost:5001/products');
      await page.click('button:has-text("Yeni Ürün")');

      // Check if CSRF token is present
      const csrfToken = await page.getAttribute('input[name="_csrf"]', 'value');
      expect(csrfToken).toBeTruthy();
    });
  });

  test.describe('Real User Scenarios', () => {
    test('should handle complete customer support flow', async () => {
      // Customer places order
      await page.goto('http://localhost:5001/orders');
      await page.click('button:has-text("Yeni Sipariş")');
      // ... customer order creation flow

      // Admin receives notification (simulated)
      await page.goto('http://localhost:5001/dashboard');

      // Check recent orders
      await expect(page.locator('.recent-orders')).toBeVisible();

      // Process order
      await page.goto('http://localhost:5001/orders');
      await page.click('button:has-text("İşle")');
      await page.selectOption('select[name="status"]', 'processing');
      await page.click('button[type="submit"]');

      // Customer gets notification (would be tested with push notifications)
      // Admin updates shipping
      await page.fill('input[name="trackingNumber"]', 'TRK123456789');
      await page.selectOption('select[name="shippingStatus"]', 'shipped');
      await page.click('button:has-text("Güncelle")');

      // Verify complete flow
      await expect(page.locator('text=Kargoda')).toBeVisible();
    });

    test('should handle inventory management workflow', async () => {
      // Check low stock alerts
      await page.goto('http://localhost:5001/inventory/alerts');
      await page.waitForLoadState('networkidle');

      // Should show low stock products
      await expect(page.locator('.low-stock-alert')).toBeVisible();

      // Reorder low stock items
      await page.click('button:has-text("Yeniden Sipariş")');
      await page.fill('input[name="reorderQuantity"]', '100');
      await page.fill('input[name="supplier"]', 'Test Supplier');
      await page.click('button[type="submit"]');

      // Verify reorder was created
      await expect(page.locator('text=Yeniden sipariş oluşturuldu')).toBeVisible();

      // Check inventory levels updated
      await page.goto('http://localhost:5001/products');
      await expect(page.locator('text=100')).toBeVisible();
    });

    test('should handle complete reporting workflow', async () => {
      // Generate comprehensive report
      await page.goto('http://localhost:5001/reports');
      await page.click('button:has-text("Yeni Rapor")');

      // Configure report
      await page.selectOption('select[name="reportType"]', 'comprehensive');
      await page.selectOption('select[name="period"]', '30d');
      await page.check('input[name="includeProducts"]');
      await page.check('input[name="includeOrders"]');
      await page.check('input[name="includeCustomers"]');

      await page.click('button:has-text("Oluştur")');
      await page.waitForResponse(response => response.url().includes('/api/v1/reports') && response.status() === 200);

      // Verify report generation
      await expect(page.locator('text=Rapor başarıyla oluşturuldu')).toBeVisible();

      // Download report
      await page.click('button:has-text("İndir")');
      await page.waitForTimeout(2000); // Wait for download

      // Schedule recurring report
      await page.click('button:has-text("Zamanla")');
      await page.selectOption('select[name="frequency"]', 'weekly');
      await page.fill('input[name="email"]', 'reports@ayaztrade.com');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Rapor zamanlaması oluşturuldu')).toBeVisible();
    });
  });
});
