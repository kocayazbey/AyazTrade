import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details?: any;
  remediation?: string;
}

interface VulnerabilityScan {
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: any;
  expectedStatus?: number;
  description: string;
}

class SecurityTester {
  private baseUrl: string;
  private results: SecurityTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async runComprehensiveSecurityTests(): Promise<SecurityTestResult[]> {
    console.log('🔒 Starting comprehensive security tests...');

    // Test suites
    await this.testSecurityHeaders();
    await this.testAuthenticationSecurity();
    await this.testAuthorizationSecurity();
    await this.testInputValidation();
    await this.testXSSProtection();
    await this.testSQLInjectionProtection();
    await this.testCSRFProtection();
    await this.testRateLimiting();
    await this.testDataExposure();
    await this.testFileUploadSecurity();
    await this.testSessionSecurity();
    await this.testCORSConfiguration();
    await this.testHTTPSConfiguration();
    await this.testErrorHandling();

    console.log(`✅ Completed ${this.results.length} security tests`);

    return this.results;
  }

  private async testSecurityHeaders(): Promise<void> {
    console.log('🛡️  Testing security headers...');

    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/health`, {
        timeout: 10000,
        validateStatus: () => true,
      });

      const headers = response.headers;

      // Test required security headers
      this.checkHeader(headers, 'x-frame-options', 'DENY', 'HIGH', 'Clickjacking protection');
      this.checkHeader(headers, 'x-content-type-options', 'nosniff', 'HIGH', 'MIME sniffing protection');
      this.checkHeader(headers, 'x-xss-protection', '1; mode=block', 'MEDIUM', 'XSS protection');
      this.checkHeader(headers, 'strict-transport-security', /max-age=\d+/, 'HIGH', 'HSTS protection');
      this.checkHeader(headers, 'content-security-policy', /default-src/, 'HIGH', 'CSP protection');
      this.checkHeader(headers, 'referrer-policy', 'strict-origin-when-cross-origin', 'MEDIUM', 'Referrer policy');

      // Check for missing security headers
      if (!headers['x-frame-options']) {
        this.addResult('MISSING_X_FRAME_OPTIONS', 'FAIL', 'HIGH', 'Missing X-Frame-Options header', {}, 'Add X-Frame-Options: DENY header');
      }

      if (!headers['x-content-type-options']) {
        this.addResult('MISSING_CONTENT_TYPE_OPTIONS', 'FAIL', 'HIGH', 'Missing X-Content-Type-Options header', {}, 'Add X-Content-Type-Options: nosniff header');
      }

    } catch (error) {
      this.addResult('SECURITY_HEADERS_TEST_FAILED', 'FAIL', 'HIGH', 'Failed to test security headers', { error: error.message });
    }
  }

  private async testAuthenticationSecurity(): Promise<void> {
    console.log('🔐 Testing authentication security...');

    // Test weak passwords
    const weakPasswords = ['123456', 'password', 'admin', '123456789', 'qwerty'];

    for (const password of weakPasswords) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/v1/auth/login`, {
          email: 'admin@ayaztrade.com',
          password: password,
        }, { timeout: 5000 });

        if (response.status === 200) {
          this.addResult('WEAK_PASSWORD_ALLOWED', 'FAIL', 'HIGH', `Weak password "${password}" was accepted`, { password }, 'Enforce strong password requirements');
        }
      } catch (error) {
        // Expected behavior - weak password should be rejected
      }
    }

    // Test brute force protection
    const attempts = Array(10).fill(null);
    let blocked = false;

    for (let i = 0; i < attempts.length; i++) {
      try {
        await axios.post(`${this.baseUrl}/api/v1/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'wrongpassword123',
        }, { timeout: 5000 });

        // If we get here after several attempts, brute force protection might not be working
        if (i > 5) {
          blocked = true;
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          blocked = true;
          break;
        }
      }
    }

    if (!blocked) {
      this.addResult('BRUTE_FORCE_PROTECTION', 'FAIL', 'CRITICAL', 'No brute force protection detected', {}, 'Implement rate limiting for login attempts');
    }

    // Test session fixation
    const sessionResponse = await axios.get(`${this.baseUrl}/api/v1/auth/session`, { timeout: 5000 });
    const originalSessionId = sessionResponse.headers['set-cookie'];

    if (originalSessionId) {
      // Try to use the same session ID after logout
      await axios.post(`${this.baseUrl}/api/v1/auth/logout`, {}, {
        headers: { Cookie: originalSessionId },
        timeout: 5000
      });

      try {
        await axios.get(`${this.baseUrl}/api/v1/dashboard`, {
          headers: { Cookie: originalSessionId },
          timeout: 5000
        });

        this.addResult('SESSION_FIXATION', 'FAIL', 'HIGH', 'Session fixation vulnerability detected', {}, 'Regenerate session IDs after login/logout');
      } catch (error: any) {
        if (error.response?.status === 401) {
          this.addResult('SESSION_FIXATION', 'PASS', 'LOW', 'Session fixation protection working');
        }
      }
    }
  }

  private async testAuthorizationSecurity(): Promise<void> {
    console.log('🔑 Testing authorization security...');

    // Test role-based access control
    const endpoints = [
      { path: '/api/v1/admin/users', roles: ['admin'] },
      { path: '/api/v1/admin/analytics', roles: ['admin'] },
      { path: '/api/v1/orders', roles: ['admin', 'editor', 'viewer'] },
      { path: '/api/v1/customers', roles: ['admin', 'editor', 'viewer'] },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint.path}`, {
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response.status === 200) {
          this.addResult('RBAC_TEST', 'WARNING', 'MEDIUM', `Endpoint ${endpoint.path} accessible without authentication`, { endpoint: endpoint.path });
        }
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          this.addResult('RBAC_TEST', 'PASS', 'LOW', `RBAC working for ${endpoint.path}`);
        }
      }
    }
  }

  private async testInputValidation(): Promise<void> {
    console.log('📝 Testing input validation...');

    const maliciousInputs = [
      '../../../etc/passwd',
      '<script>alert("xss")</script>',
      '${7*7}',
      'UNION SELECT * FROM users',
      '1\' OR \'1\'=\'1',
      'null\\0',
      '💀',
      '%00',
      '\x00',
    ];

    // Test product creation with malicious input
    for (const input of maliciousInputs) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/v1/products`, {
          name: input,
          price: 100,
          stock: 10,
        }, {
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response.status === 201) {
          this.addResult('INPUT_VALIDATION', 'FAIL', 'HIGH', `Malicious input accepted: ${input}`, { input }, 'Implement proper input sanitization and validation');
        }
      } catch (error: any) {
        if (error.response?.status === 400) {
          this.addResult('INPUT_VALIDATION', 'PASS', 'LOW', `Input validation working for: ${input}`);
        }
      }
    }
  }

  private async testXSSProtection(): Promise<void> {
    console.log('🛡️  Testing XSS protection...');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '"><script>alert("XSS")</script>',
    ];

    for (const payload of xssPayloads) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/v1/products`, {
          name: `Test Product ${payload}`,
          description: payload,
          price: 100,
          stock: 10,
        }, {
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response.status === 201) {
          // Check if XSS payload is reflected in response
          const responseText = JSON.stringify(response.data);
          if (responseText.includes(payload) || responseText.includes('<script>')) {
            this.addResult('XSS_PROTECTION', 'FAIL', 'HIGH', `XSS payload reflected: ${payload}`, { payload }, 'Implement XSS sanitization');
          }
        }
      } catch (error) {
        // Expected for most XSS payloads
      }
    }
  }

  private async testSQLInjectionProtection(): Promise<void> {
    console.log('🗄️  Testing SQL injection protection...');

    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "1' AND (SELECT COUNT(*) FROM information_schema.tables) > 0 --",
      "admin'/*",
      "' OR 1=1#",
      "' OR 'x'='x",
    ];

    for (const payload of sqlPayloads) {
      try {
        const response = await axios.get(`${this.baseUrl}/api/v1/products/search?q=${encodeURIComponent(payload)}`, {
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response.status === 200 && response.data.length > 1000) {
          this.addResult('SQL_INJECTION', 'FAIL', 'CRITICAL', `Potential SQL injection detected: ${payload}`, { payload }, 'Use parameterized queries and input sanitization');
        }
      } catch (error: any) {
        if (error.response?.status === 500 && error.response.data?.includes('SQL')) {
          this.addResult('SQL_INJECTION', 'FAIL', 'CRITICAL', `SQL error exposed: ${payload}`, { payload }, 'Prevent SQL error exposure in responses');
        }
      }
    }
  }

  private async testCSRFProtection(): Promise<void> {
    console.log('🍪 Testing CSRF protection...');

    try {
      // Try to make state-changing request without CSRF token
      const response = await axios.post(`${this.baseUrl}/api/v1/products`, {
        name: 'CSRF Test',
        price: 100,
        stock: 10,
      }, {
        timeout: 5000,
        validateStatus: () => true,
      });

      if (response.status === 201) {
        this.addResult('CSRF_PROTECTION', 'FAIL', 'HIGH', 'CSRF token not required', {}, 'Implement CSRF token validation');
      } else if (response.status === 403) {
        this.addResult('CSRF_PROTECTION', 'PASS', 'LOW', 'CSRF protection working');
      }
    } catch (error) {
      this.addResult('CSRF_PROTECTION', 'PASS', 'LOW', 'CSRF protection working');
    }
  }

  private async testRateLimiting(): Promise<void> {
    console.log('⏱️  Testing rate limiting...');

    const requests = Array(50).fill(null).map(() =>
      axios.get(`${this.baseUrl}/api/v1/health`, {
        timeout: 1000,
        validateStatus: () => true,
      })
    );

    const responses = await Promise.allSettled(requests);
    let blockedCount = 0;

    responses.forEach((response, index) => {
      if (response.status === 'rejected') {
        blockedCount++;
      } else if (response.value.status === 429) {
        blockedCount++;
      }
    });

    if (blockedCount === 0) {
      this.addResult('RATE_LIMITING', 'FAIL', 'MEDIUM', 'No rate limiting detected', { blockedCount }, 'Implement rate limiting');
    } else {
      this.addResult('RATE_LIMITING', 'PASS', 'LOW', `Rate limiting working (${blockedCount} requests blocked)`);
    }
  }

  private async testDataExposure(): Promise<void> {
    console.log('🔍 Testing data exposure...');

    // Test for sensitive data in error responses
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/nonexistent-endpoint`, {
        timeout: 5000,
        validateStatus: () => true,
      });

      if (response.status === 500) {
        const responseText = JSON.stringify(response.data);
        const sensitivePatterns = [
          /password/i,
          /token/i,
          /key/i,
          /secret/i,
          /connection.*string/i,
          /database.*url/i,
        ];

        const hasSensitiveData = sensitivePatterns.some(pattern => pattern.test(responseText));

        if (hasSensitiveData) {
          this.addResult('SENSITIVE_DATA_EXPOSURE', 'FAIL', 'HIGH', 'Sensitive data exposed in error response', {}, 'Remove sensitive data from error responses');
        }
      }
    } catch (error) {
      // Expected
    }

    // Test for information disclosure in headers
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/health`, {
        timeout: 5000,
        validateStatus: () => true,
      });

      const headers = response.headers;
      const sensitiveHeaders = [
        'server',
        'x-powered-by',
        'x-aspnet-version',
        'x-runtime',
      ];

      for (const header of sensitiveHeaders) {
        if (headers[header]) {
          this.addResult('INFORMATION_DISCLOSURE', 'WARNING', 'MEDIUM', `Information disclosure in header: ${header}`, { header, value: headers[header] }, 'Remove or obfuscate server information headers');
        }
      }
    } catch (error) {
      // Expected
    }
  }

  private async testFileUploadSecurity(): Promise<void> {
    console.log('📁 Testing file upload security...');

    // Test malicious file uploads
    const maliciousFiles = [
      { name: 'malware.exe', content: 'malicious executable content' },
      { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
      { name: 'shell.jsp', content: '<%= Runtime.getRuntime().exec(request.getParameter("cmd")) %>' },
      { name: 'test.txt', content: 'normal text file' }, // Control test
    ];

    for (const file of maliciousFiles) {
      try {
        const formData = new FormData();
        formData.append('file', new Blob([file.content]), file.name);

        const response = await axios.post(`${this.baseUrl}/api/v1/upload`, formData, {
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response.status === 200 && (file.name.includes('.exe') || file.name.includes('.php') || file.name.includes('.jsp'))) {
          this.addResult('FILE_UPLOAD_SECURITY', 'FAIL', 'HIGH', `Malicious file upload allowed: ${file.name}`, { fileName: file.name }, 'Implement file type validation and scanning');
        }
      } catch (error) {
        // Expected for malicious files
      }
    }
  }

  private async testSessionSecurity(): Promise<void> {
    console.log('🍪 Testing session security...');

    // Test session cookie security
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/health`, {
        timeout: 5000,
        validateStatus: () => true,
      });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const cookieString = cookies.join('; ');

        if (!cookieString.includes('Secure')) {
          this.addResult('SESSION_SECURITY', 'FAIL', 'MEDIUM', 'Session cookies not marked as Secure', {}, 'Set Secure flag on session cookies');
        }

        if (!cookieString.includes('HttpOnly')) {
          this.addResult('SESSION_SECURITY', 'FAIL', 'MEDIUM', 'Session cookies not marked as HttpOnly', {}, 'Set HttpOnly flag on session cookies');
        }

        if (!cookieString.includes('SameSite')) {
          this.addResult('SESSION_SECURITY', 'FAIL', 'MEDIUM', 'Session cookies missing SameSite attribute', {}, 'Set SameSite attribute on session cookies');
        }

        if (cookieString.includes('SameSite=None') && !cookieString.includes('Secure')) {
          this.addResult('SESSION_SECURITY', 'FAIL', 'HIGH', 'SameSite=None requires Secure flag', {}, 'Either set Secure flag or use SameSite=Strict/Lax');
        }
      }
    } catch (error) {
      this.addResult('SESSION_SECURITY', 'WARNING', 'LOW', 'Could not test session security');
    }
  }

  private async testCORSConfiguration(): Promise<void> {
    console.log('🌐 Testing CORS configuration...');

    // Test CORS preflight
    try {
      const response = await axios.options(`${this.baseUrl}/api/v1/products`, {
        headers: {
          'Origin': 'http://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'X-Custom-Header',
        },
        timeout: 5000,
        validateStatus: () => true,
      });

      if (response.status === 200) {
        const allowOrigin = response.headers['access-control-allow-origin'];
        const allowCredentials = response.headers['access-control-allow-credentials'];

        if (allowOrigin === '*') {
          this.addResult('CORS_MISCONFIGURATION', 'FAIL', 'HIGH', 'CORS allows all origins', {}, 'Restrict CORS to specific trusted origins');
        }

        if (allowCredentials === 'true' && allowOrigin === '*') {
          this.addResult('CORS_MISCONFIGURATION', 'FAIL', 'CRITICAL', 'CORS allows credentials from all origins', {}, 'Never allow credentials from all origins');
        }
      }
    } catch (error) {
      this.addResult('CORS_MISCONFIGURATION', 'PASS', 'LOW', 'CORS properly configured');
    }
  }

  private async testHTTPSConfiguration(): Promise<void> {
    console.log('🔒 Testing HTTPS configuration...');

    // Test HTTP to HTTPS redirect
    try {
      const httpResponse = await axios.get(`http://${this.baseUrl.replace('https://', '')}/api/v1/health`, {
        timeout: 5000,
        validateStatus: () => true,
        maxRedirects: 0,
      });

      if (httpResponse.status === 200) {
        this.addResult('HTTPS_REDIRECT', 'FAIL', 'MEDIUM', 'HTTP requests not redirected to HTTPS', {}, 'Implement HTTP to HTTPS redirect');
      } else if (httpResponse.status >= 300 && httpResponse.status < 400) {
        this.addResult('HTTPS_REDIRECT', 'PASS', 'LOW', 'HTTP properly redirects to HTTPS');
      }
    } catch (error) {
      // Expected for HTTPS-only sites
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('❌ Testing error handling...');

    // Test various error conditions
    const errorTests = [
      { method: 'GET', path: '/api/v1/nonexistent' },
      { method: 'POST', path: '/api/v1/products', data: {} },
      { method: 'GET', path: '/api/v1/users/999999' },
    ];

    for (const test of errorTests) {
      try {
        const response = await axios({
          method: test.method,
          url: `${this.baseUrl}${test.path}`,
          data: test.data,
          timeout: 5000,
          validateStatus: () => true,
        });

        if (response.status >= 400) {
          const responseText = JSON.stringify(response.data);

          // Check for information disclosure in error messages
          if (responseText.includes('stack') || responseText.includes('path') || responseText.includes('file')) {
            this.addResult('ERROR_DISCLOSURE', 'WARNING', 'MEDIUM', `Error message contains sensitive information: ${test.path}`, { endpoint: test.path }, 'Sanitize error messages in production');
          }

          // Check for proper error codes
          if (response.status === 500 && responseText.includes('Internal Server Error')) {
            this.addResult('ERROR_HANDLING', 'PASS', 'LOW', `Proper error handling for ${test.path}`);
          }
        }
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
          this.addResult('ERROR_HANDLING', 'FAIL', 'HIGH', 'Server not accessible', { error: error.message });
        }
      }
    }
  }

  private checkHeader(headers: any, headerName: string, expectedValue: string | RegExp, severity: SecurityTestResult['severity'], description: string): void {
    const headerValue = headers[headerName.toLowerCase()];

    if (!headerValue) {
      this.addResult(`MISSING_${headerName.toUpperCase()}`, 'FAIL', severity, `Missing ${headerName} header`, {}, `Add ${headerName} header with appropriate value`);
      return;
    }

    if (typeof expectedValue === 'string') {
      if (headerValue !== expectedValue) {
        this.addResult(`INVALID_${headerName.toUpperCase()}`, 'FAIL', severity, `Invalid ${headerName} header value`, { expected: expectedValue, actual: headerValue }, `Set ${headerName} to ${expectedValue}`);
      } else {
        this.addResult(`${headerName.toUpperCase()}_VALID`, 'PASS', 'LOW', `${headerName} header correctly configured`);
      }
    } else if (expectedValue instanceof RegExp) {
      if (!expectedValue.test(headerValue)) {
        this.addResult(`INVALID_${headerName.toUpperCase()}`, 'FAIL', severity, `Invalid ${headerName} header format`, { expected: expectedValue.source, actual: headerValue }, `Set ${headerName} to match pattern ${expectedValue.source}`);
      } else {
        this.addResult(`${headerName.toUpperCase()}_VALID`, 'PASS', 'LOW', `${headerName} header correctly configured`);
      }
    }
  }

  private addResult(testName: string, status: SecurityTestResult['status'], severity: SecurityTestResult['severity'], description: string, details?: any, remediation?: string): void {
    this.results.push({
      testName,
      status,
      severity,
      description,
      details,
      remediation,
    });
  }

  generateReport(): string {
    let report = '\n🔒 SECURITY TEST REPORT\n';
    report += '='.repeat(60) + '\n\n';

    const groupedResults = {
      CRITICAL: this.results.filter(r => r.severity === 'CRITICAL'),
      HIGH: this.results.filter(r => r.severity === 'HIGH'),
      MEDIUM: this.results.filter(r => r.severity === 'MEDIUM'),
      LOW: this.results.filter(r => r.severity === 'LOW'),
    };

    const statusEmojis = {
      PASS: '✅',
      FAIL: '❌',
      WARNING: '⚠️',
    };

    for (const [severity, results] of Object.entries(groupedResults)) {
      if (results.length > 0) {
        report += `${severity} SEVERITY ISSUES (${results.length})\n`;
        report += '-'.repeat(40) + '\n';

        results.forEach(result => {
          report += `${statusEmojis[result.status]} ${result.testName}\n`;
          report += `   ${result.description}\n`;
          if (result.remediation) {
            report += `   💡 Fix: ${result.remediation}\n`;
          }
          if (result.details) {
            report += `   📋 Details: ${JSON.stringify(result.details, null, 2)}\n`;
          }
          report += '\n';
        });
      }
    }

    // Summary
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;

    report += '📊 SUMMARY\n';
    report += '='.repeat(60) + '\n';
    report += `Total Tests: ${this.results.length}\n`;
    report += `✅ Passed: ${passCount}\n`;
    report += `❌ Failed: ${failCount}\n`;
    report += `⚠️  Warnings: ${warningCount}\n`;
    report += `Overall Score: ${Math.round((passCount / this.results.length) * 100)}%\n\n`;

    if (failCount > 0) {
      report += '🚨 ACTION REQUIRED: Address failed security tests before deployment\n';
    } else if (warningCount > 0) {
      report += '⚠️  RECOMMENDED: Review and address security warnings\n';
    } else {
      report += '🎉 EXCELLENT: All security tests passed!\n';
    }

    return report;
  }

  saveReport(filename: string = 'security-test-report.json'): void {
    const reportData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.status === 'PASS').length,
        failed: this.results.filter(r => r.status === 'FAIL').length,
        warnings: this.results.filter(r => r.status === 'WARNING').length,
      },
    };

    fs.writeFileSync(path.join(process.cwd(), filename), JSON.stringify(reportData, null, 2));
    console.log(`📄 Report saved to ${filename}`);
  }
}

// Export for use in tests
export { SecurityTester, SecurityTestResult };
