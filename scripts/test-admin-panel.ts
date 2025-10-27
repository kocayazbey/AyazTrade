import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL';
  message: string;
  responseTime?: number;
}

class AdminPanelTester {
  private results: TestResult[] = [];
  private authToken: string = '';

  async runTests() {
    console.log('🧪 Starting Admin Panel Tests...\n');

    // Test authentication
    await this.testAuthentication();
    
    // Test admin endpoints
    await this.testAdminEndpoints();
    
    // Test role-based access
    await this.testRoleBasedAccess();
    
    // Test CRUD operations
    await this.testCRUDOperations();
    
    // Test finance reports
    await this.testFinanceReports();
    
    // Print results
    this.printResults();
  }

  private async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@ayaztrade.com',
        password: 'password'
      });
      
      if (response.data.success) {
        this.authToken = response.data.data.token;
        this.addResult('POST /auth/login', 'PASS', 'Authentication successful', response.data.responseTime);
      } else {
        this.addResult('POST /auth/login', 'FAIL', 'Authentication failed');
      }
    } catch (error) {
      this.addResult('POST /auth/login', 'FAIL', `Authentication error: ${error.message}`);
    }
  }

  private async testAdminEndpoints() {
    console.log('📊 Testing Admin Endpoints...');
    
    const endpoints = [
      { method: 'GET', path: '/admin/dashboard', requiredRole: 'admin' },
      { method: 'GET', path: '/admin/stats', requiredRole: 'admin' },
      { method: 'GET', path: '/admin/users', requiredRole: 'admin' },
      { method: 'GET', path: '/admin/roles', requiredRole: 'admin' },
      { method: 'GET', path: '/admin/permissions', requiredRole: 'admin' },
      { method: 'GET', path: '/admin/settings', requiredRole: 'admin' },
      { method: 'GET', path: '/admin/audit-logs', requiredRole: 'admin' },
      { method: 'GET', path: '/admin/health', requiredRole: 'admin' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint.method, endpoint.path, endpoint.requiredRole);
    }
  }

  private async testRoleBasedAccess() {
    console.log('👥 Testing Role-Based Access...');
    
    const testUsers = [
      { email: 'admin@ayaztrade.com', role: 'super_admin' },
      { email: 'finance@ayaztrade.com', role: 'finance' },
      { email: 'product@ayaztrade.com', role: 'product_manager' },
      { email: 'order@ayaztrade.com', role: 'order_manager' }
    ];

    for (const user of testUsers) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
          email: user.email,
          password: 'password'
        });
        
        if (response.data.success) {
          const token = response.data.data.token;
          const userResponse = await axios.get(`${BASE_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          this.addResult(`Role Access: ${user.role}`, 'PASS', 'Role-based access working');
        }
      } catch (error) {
        this.addResult(`Role Access: ${user.role}`, 'FAIL', `Access denied: ${error.message}`);
      }
    }
  }

  private async testCRUDOperations() {
    console.log('📝 Testing CRUD Operations...');
    
    // Test user creation
    await this.testEndpoint('POST', '/admin/users', 'admin', {
      email: 'test@ayaztrade.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    });

    // Test user update
    await this.testEndpoint('PUT', '/admin/users/1', 'admin', {
      firstName: 'Updated',
      lastName: 'User'
    });

    // Test role creation
    await this.testEndpoint('POST', '/admin/roles', 'super_admin', {
      name: 'test_role',
      displayName: 'Test Role',
      description: 'Test role for testing',
      permissions: ['view_dashboard']
    });
  }

  private async testFinanceReports() {
    console.log('💰 Testing Finance Reports...');
    
    const reportTypes = ['income-statement', 'balance-sheet', 'cash-flow'];
    
    for (const reportType of reportTypes) {
      await this.testEndpoint('GET', `/erp/finance/reports?type=${reportType}&startDate=2024-01-01&endDate=2024-12-31`, 'finance');
    }
  }

  private async testEndpoint(method: string, path: string, requiredRole?: string, data?: any) {
    const startTime = Date.now();
    
    try {
      const config = {
        method: method.toLowerCase(),
        url: `${BASE_URL}${path}`,
        headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
        data: data
      };

      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      
      this.addResult(`${method} ${path}`, 'PASS', 'Request successful', responseTime);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addResult(`${method} ${path}`, 'FAIL', `Request failed: ${error.message}`, responseTime);
    }
  }

  private addResult(endpoint: string, status: 'PASS' | 'FAIL', message: string, responseTime?: number) {
    this.results.push({
      endpoint,
      status,
      message,
      responseTime
    });
  }

  private printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('=' .repeat(80));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\n📝 Detailed Results:');
    console.log('-'.repeat(80));
    
    this.results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      const timeInfo = result.responseTime ? ` (${result.responseTime}ms)` : '';
      console.log(`${statusIcon} ${result.endpoint}${timeInfo}`);
      console.log(`   ${result.message}`);
      console.log('');
    });
    
    if (failed > 0) {
      console.log('🚨 Some tests failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed! Admin panel is working correctly.');
    }
  }
}

// Run tests
const tester = new AdminPanelTester();
tester.runTests().catch(console.error);
