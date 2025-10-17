#!/usr/bin/env node

/**
 * Deployment Testing Script
 * Tests the deployed application as if we were a user
 *
 * Usage: node scripts/test-deployment.js <deployment-url>
 * Example: node scripts/test-deployment.js https://clickup-monday-sync.vercel.app
 */

const https = require('https');
const http = require('http');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class DeploymentTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.results = [];
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl + path);
      const protocol = url.protocol === 'https:' ? https : http;

      const reqOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Deployment-Tester/1.0',
          'Accept': 'text/html,application/json',
          ...options.headers,
        },
      };

      if (options.body) {
        reqOptions.headers['Content-Type'] = 'application/json';
        reqOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
      }

      const req = protocol.request(reqOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  async testEndpoint(name, path, options = {}) {
    this.log(`\n[TEST] ${name}`, 'cyan');
    this.log(`  → ${options.method || 'GET'} ${this.baseUrl}${path}`, 'blue');

    try {
      const startTime = Date.now();
      const response = await this.makeRequest(path, options);
      const duration = Date.now() - startTime;

      const success = options.expectedStatus
        ? response.statusCode === options.expectedStatus
        : response.statusCode >= 200 && response.statusCode < 400;

      if (success) {
        this.log(`  ✓ Status: ${response.statusCode} (${duration}ms)`, 'green');

        // Check content type
        const contentType = response.headers['content-type'] || '';
        this.log(`  ✓ Content-Type: ${contentType}`, 'green');

        // Parse and display JSON responses
        if (contentType.includes('application/json') && response.body) {
          try {
            const json = JSON.parse(response.body);
            this.log(`  ✓ Valid JSON response`, 'green');
            if (options.expectedFields) {
              for (const field of options.expectedFields) {
                if (json.hasOwnProperty(field)) {
                  this.log(`  ✓ Has field: ${field}`, 'green');
                } else {
                  this.log(`  ✗ Missing field: ${field}`, 'red');
                }
              }
            }
          } catch (e) {
            this.log(`  ✗ Invalid JSON: ${e.message}`, 'red');
          }
        }

        // Check HTML responses
        if (contentType.includes('text/html')) {
          const hasTitle = response.body.includes('<title>');
          const hasBody = response.body.includes('<body');
          this.log(`  ${hasTitle ? '✓' : '✗'} Has <title>`, hasTitle ? 'green' : 'red');
          this.log(`  ${hasBody ? '✓' : '✗'} Has <body>`, hasBody ? 'green' : 'red');
        }

        this.results.push({ name, success: true, statusCode: response.statusCode, duration });
      } else {
        this.log(`  ✗ Status: ${response.statusCode} (expected ${options.expectedStatus || '2xx/3xx'})`, 'red');
        if (response.body) {
          this.log(`  Response: ${response.body.substring(0, 200)}`, 'yellow');
        }
        this.results.push({ name, success: false, statusCode: response.statusCode, duration });
      }

      return response;
    } catch (error) {
      this.log(`  ✗ Error: ${error.message}`, 'red');
      this.results.push({ name, success: false, error: error.message });
      return null;
    }
  }

  async runAllTests() {
    this.log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║          DEPLOYMENT TESTING SUITE                     ║', 'cyan');
    this.log('╚════════════════════════════════════════════════════════╝', 'cyan');
    this.log(`\nTesting: ${this.baseUrl}\n`, 'blue');

    // Test 1: Home page
    await this.testEndpoint(
      'Home Page',
      '/',
      { expectedStatus: 200 }
    );

    // Test 2: Dashboard page
    await this.testEndpoint(
      'Dashboard Page',
      '/dashboard',
      { expectedStatus: 200 }
    );

    // Test 3: API Health Check - Replication Analyze (should fail without auth, but endpoint should exist)
    await this.testEndpoint(
      'API: Replication Analyze (no auth)',
      '/api/replication/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ clickupListId: 'test' }),
        expectedStatus: 401 // Should fail auth
      }
    );

    // Test 4: API Health Check - Sync Status (should fail gracefully)
    await this.testEndpoint(
      'API: Sync Status (invalid ID)',
      '/api/sync/status?jobId=invalid-id',
      { expectedStatus: 404 }
    );

    // Test 5: Check static assets are loading
    await this.testEndpoint(
      'Next.js Build Manifest',
      '/_next/static/chunks/webpack.js',
      { expectedStatus: 200 }
    );

    // Test 6: Verify environment variables are configured (check for error messages)
    await this.testEndpoint(
      'API: Check Environment Config',
      '/api/replication/start',
      {
        method: 'POST',
        body: JSON.stringify({ clickupListId: 'test', mondayBoardName: 'test' }),
        expectedStatus: 401 // Should fail auth, not server error
      }
    );

    this.printSummary();
  }

  printSummary() {
    this.log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║                    TEST SUMMARY                        ║', 'cyan');
    this.log('╚════════════════════════════════════════════════════════╝', 'cyan');

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    this.log(`\nTotal Tests: ${total}`, 'blue');
    this.log(`Passed: ${passed}`, 'green');
    this.log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`, passed === total ? 'green' : 'yellow');

    if (failed > 0) {
      this.log('Failed Tests:', 'red');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          this.log(`  ✗ ${r.name}`, 'red');
          if (r.error) {
            this.log(`    Error: ${r.error}`, 'yellow');
          }
        });
    }

    this.log('\n' + '='.repeat(60) + '\n', 'cyan');

    process.exit(failed > 0 ? 1 : 0);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node scripts/test-deployment.js <deployment-url>');
  console.log('Example: node scripts/test-deployment.js https://clickup-monday-sync.vercel.app');
  process.exit(1);
}

const deploymentUrl = args[0];
const tester = new DeploymentTester(deploymentUrl);
tester.runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
