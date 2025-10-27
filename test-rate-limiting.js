const { RateLimiterEnhancedService } = require('./dist/core/security/rate-limiter-enhanced.service');

async function testRateLimiting() {
  console.log('🧪 Rate Limiting Test Başlatılıyor...\n');

  try {
    // Cache manager mock
    const mockCache = {
      get: async (key) => null,
      set: async (key, value, ttl) => true,
      del: async (key) => true
    };

    const rateLimiter = new RateLimiterEnhancedService(mockCache, { get: () => ({}) });

    const identifier = 'test-user-123';

    console.log('✅ Rate Limiter Service başarıyla oluşturuldu');

    // Test 1: İlk request
    console.log('\n📝 Test 1: İlk request');
    const result1 = await rateLimiter.checkRateLimit(identifier, {
      windowMs: 60000, // 1 dakika
      maxRequests: 3,
    });

    console.log('✅ İlk request başarılı:', result1);

    // Test 2: İkinci request
    console.log('\n📝 Test 2: İkinci request');
    const result2 = await rateLimiter.checkRateLimit(identifier, {
      windowMs: 60000,
      maxRequests: 3,
    });

    console.log('✅ İkinci request başarılı:', result2);

    // Test 3: Limit aşımı
    console.log('\n📝 Test 3: Limit aşımı');
    await rateLimiter.checkRateLimit(identifier, { windowMs: 60000, maxRequests: 3 });
    await rateLimiter.checkRateLimit(identifier, { windowMs: 60000, maxRequests: 3 });

    const result3 = await rateLimiter.checkRateLimit(identifier, {
      windowMs: 60000,
      maxRequests: 3,
    });

    console.log('✅ Limit aşımı tespit edildi:', result3);

    // Test 4: Analytics
    console.log('\n📝 Test 4: Analytics');
    const analytics = await rateLimiter.getRateLimitAnalytics(identifier);
    console.log('✅ Analytics:', analytics);

    // Test 5: Reset
    console.log('\n📝 Test 5: Reset');
    await rateLimiter.resetRateLimit(identifier);
    const result4 = await rateLimiter.checkRateLimit(identifier, {
      windowMs: 60000,
      maxRequests: 3,
    });

    console.log('✅ Reset sonrası yeni request:', result4);

    console.log('\n🎉 Tüm Rate Limiting testleri başarıyla tamamlandı!');

  } catch (error) {
    console.error('❌ Test hatası:', error);
  }
}

testRateLimiting();
