import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '2m', target: 200 }, // Ramp up to 200 users over 2 minutes
    { duration: '5m', target: 200 }, // Stay at 200 users for 5 minutes
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    errors: ['rate<0.1'], // Error rate should be below 10%
    response_time: ['p95<2000'], // 95% of requests should be below 2 seconds
    http_req_duration: ['p99<3000'], // 99% of requests should be below 3 seconds
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test scenarios
const scenarios = {
  // Product browsing scenario (40% of traffic)
  productBrowsing: {
    executor: 'constant-vus',
    vus: 80,
    duration: '10m',
    exec: 'productBrowsing',
  },

  // Order management scenario (30% of traffic)
  orderManagement: {
    executor: 'constant-vus',
    vus: 60,
    duration: '10m',
    exec: 'orderManagement',
  },

  // Analytics scenario (20% of traffic)
  analytics: {
    executor: 'constant-vus',
    vus: 40,
    duration: '10m',
    exec: 'analytics',
  },

  // Admin operations scenario (10% of traffic)
  adminOperations: {
    executor: 'constant-vus',
    vus: 20,
    duration: '10m',
    exec: 'adminOperations',
  },
};

// Product browsing scenario
export function productBrowsing() {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/v1/products`],
    ['GET', `${BASE_URL}/api/v1/products?limit=20&page=1`],
    ['GET', `${BASE_URL}/api/v1/categories`],
    ['GET', `${BASE_URL}/api/v1/brands`],
  ]);

  check(responses[0], {
    'products list status is 200': (r) => r.status === 200,
  });

  check(responses[1], {
    'products pagination status is 200': (r) => r.status === 200,
  });

  // Search for products
  const searchResponse = http.get(`${BASE_URL}/api/v1/products/search?q=laptop`);
  check(searchResponse, {
    'product search status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

// Order management scenario
export function orderManagement() {
  // Get orders list
  const ordersResponse = http.get(`${BASE_URL}/api/v1/orders`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });

  check(ordersResponse, {
    'orders list status is 200': (r) => r.status === 200,
  });

  // Create new order
  const createOrderPayload = JSON.stringify({
    customerId: 'customer_123',
    items: [
      {
        productId: 'product_123',
        quantity: 2,
        price: 99.99,
      },
    ],
    shippingAddress: {
      street: '123 Test St',
      city: 'Test City',
      zipCode: '12345',
      country: 'Test Country',
    },
    paymentMethod: 'credit_card',
  });

  const createOrderResponse = http.post(`${BASE_URL}/api/v1/orders`, createOrderPayload, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  check(createOrderResponse, {
    'create order status is 201': (r) => r.status === 201,
  });

  // Get order details if creation was successful
  if (createOrderResponse.status === 201) {
    const orderId = createOrderResponse.json().id;
    const orderDetailsResponse = http.get(`${BASE_URL}/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    check(orderDetailsResponse, {
      'order details status is 200': (r) => r.status === 200,
    });

    // Update order status
    const updateStatusPayload = JSON.stringify({ status: 'processing' });
    const updateResponse = http.patch(`${BASE_URL}/api/v1/orders/${orderId}/status`, updateStatusPayload, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    check(updateResponse, {
      'update order status is 200': (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 2 + 1);
}

// Analytics scenario
export function analytics() {
  const analyticsEndpoints = [
    '/api/v1/analytics/dashboard',
    '/api/v1/analytics/revenue',
    '/api/v1/analytics/orders',
    '/api/v1/analytics/customers',
    '/api/v1/analytics/products',
    '/api/v1/analytics/inventory',
  ];

  // Hit multiple analytics endpoints
  const responses = http.batch(
    analyticsEndpoints.map(endpoint => ['GET', `${BASE_URL}${endpoint}`])
  );

  responses.forEach((response, index) => {
    check(response, {
      [`analytics ${analyticsEndpoints[index]} status is 200`]: (r) => r.status === 200,
    });
  });

  // Generate report
  const reportPayload = JSON.stringify({
    type: 'comprehensive',
    period: '30d',
    format: 'json',
  });

  const reportResponse = http.post(`${BASE_URL}/api/v1/reports`, reportPayload, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  check(reportResponse, {
    'generate report status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 5 + 2); // Longer sleep for analytics
}

// Admin operations scenario
export function adminOperations() {
  // Bulk operations
  const bulkUpdatePayload = JSON.stringify({
    productIds: ['product_1', 'product_2', 'product_3'],
    updates: { status: 'active' },
  });

  const bulkUpdateResponse = http.patch(`${BASE_URL}/api/v1/admin/products/bulk`, bulkUpdatePayload, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  check(bulkUpdateResponse, {
    'bulk update status is 200': (r) => r.status === 200,
  });

  // User management
  const userResponse = http.get(`${BASE_URL}/api/v1/admin/users`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });

  check(userResponse, {
    'admin users status is 200': (r) => r.status === 200,
  });

  // System health check
  const healthResponse = http.get(`${BASE_URL}/api/v1/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 3 + 1);
}

// Setup function - runs before the test
export function setup() {
  console.log('🚀 Setting up load test...');

  // Login to get auth token
  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'admin@ayaztrade.com',
    password: 'admin123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginResponse.status !== 200) {
    console.error('❌ Login failed:', loginResponse.status, loginResponse.body);
    return {};
  }

  const authToken = loginResponse.json().accessToken;

  console.log('✅ Login successful');
  console.log(`📊 Test configuration:`);
  console.log(`   - Base URL: ${BASE_URL}`);
  console.log(`   - Virtual Users: ${Object.values(scenarios).reduce((sum, scenario) => sum + scenario.vus, 0)}`);
  console.log(`   - Test Duration: 16 minutes`);

  return { authToken };
}

// Teardown function - runs after the test
export function teardown(data) {
  console.log('🧹 Cleaning up after load test...');

  if (data.authToken) {
    // Logout
    http.post(`${BASE_URL}/api/v1/auth/logout`, JSON.stringify({}), {
      headers: {
        Authorization: `Bearer ${data.authToken}`,
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle summary - runs after the test completes
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-summary.json': JSON.stringify(data, null, 2),
    'load-test-report.html': htmlReport(data),
  };

  // Send results to monitoring system (optional)
  if (__ENV.MONITORING_URL) {
    http.post(__ENV.MONITORING_URL, JSON.stringify({
      testName: 'AyazTrade Load Test',
      timestamp: new Date().toISOString(),
      results: data,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return summary;
}

// Default function - runs for each VU iteration
export default function () {
  // Randomly select scenario based on probability
  const scenario = selectRandomScenario();

  switch (scenario) {
    case 'productBrowsing':
      productBrowsing();
      break;
    case 'orderManagement':
      orderManagement();
      break;
    case 'analytics':
      analytics();
      break;
    case 'adminOperations':
      adminOperations();
      break;
    default:
      productBrowsing();
  }
}

function selectRandomScenario() {
  const random = Math.random();
  if (random < 0.4) return 'productBrowsing';
  if (random < 0.7) return 'orderManagement';
  if (random < 0.9) return 'analytics';
  return 'adminOperations';
}

// Custom summary function
function textSummary(data, options) {
  return `
📊 K6 Load Test Summary
=======================

Test completed: ${new Date().toISOString()}

🎯 HTTP Requests
   - Total: ${data.metrics.http_reqs.values.count}
   - Failed: ${data.metrics.http_req_failed.values.rate * 100}%

⏱️  Response Times
   - Average: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
   - Min: ${Math.round(data.metrics.http_req_duration.values.min)}ms
   - Max: ${Math.round(data.metrics.http_req_duration.values.max)}ms
   - P95: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
   - P99: ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms

📈 Throughput
   - Requests/sec: ${Math.round(data.metrics.http_reqs.values.rate)}

🔥 Errors
   - Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

📊 Custom Metrics
   - Response Time Trend: ${responseTimeTrend.values}
   - Error Rate: ${errorRate.values}

${options.enableColors ? '✅ Test completed successfully!' : 'Test completed successfully!'}
  `;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>AyazTrade Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .error { color: red; }
        .success { color: green; }
        h1, h2 { color: #333; }
    </style>
</head>
<body>
    <h1>🚀 AyazTrade Load Test Report</h1>
    <p><strong>Test completed:</strong> ${new Date().toISOString()}</p>

    <h2>📊 Key Metrics</h2>
    <div class="metric">
        <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}<br>
        <strong>Error Rate:</strong> <span class="${data.metrics.http_req_failed.values.rate < 0.1 ? 'success' : 'error'}">${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</span><br>
        <strong>Average Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values.avg)}ms<br>
        <strong>P95 Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms<br>
        <strong>Requests/Second:</strong> ${Math.round(data.metrics.http_reqs.values.rate)}
    </div>

    <h2>📈 Response Times</h2>
    <div class="metric">
        <strong>Min:</strong> ${Math.round(data.metrics.http_req_duration.values.min)}ms<br>
        <strong>Max:</strong> ${Math.round(data.metrics.http_req_duration.values.max)}ms<br>
        <strong>P99:</strong> ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms
    </div>

    ${data.metrics.http_req_failed.values.rate < 0.1 ?
      '<h2 class="success">✅ Test Passed - Performance meets requirements!</h2>' :
      '<h2 class="error">❌ Test Failed - Performance below requirements!</h2>'}
</body>
</html>
  `;
}
