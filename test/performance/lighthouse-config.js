module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: [
        'http://localhost:5001',
        'http://localhost:5001/dashboard',
        'http://localhost:5001/products',
        'http://localhost:5001/orders',
        'http://localhost:5001/customers',
        'http://localhost:5001/analytics',
      ],
      startServerCommand: 'npm run start:prod',
      startServerReadyPattern: 'Server listening on',
    },
    assert: {
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.8 }],

        // Individual audits
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Accessibility
        'color-contrast': 'off',
        'image-alt': 'off',

        // Best practices
        'uses-http2': 'off',
        'uses-rel-preconnect': 'off',

        // SEO
        'meta-description': 'off',
        'link-text': 'off',
      },
    },
    server: {
      command: 'npm run start:prod',
      port: 5001,
    },
    wizard: {
      ci: true,
    },
  },
  extends: 'lighthouse:default',
  settings: {
    emulatedFormFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    skipAudits: [
      'is-on-https',
      'uses-http2',
      'redirects-http',
      'service-worker',
      'works-offline',
      'offline-start-url',
      'is-installable',
    ],
  },
};
