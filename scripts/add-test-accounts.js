#!/usr/bin/env node

/**
 * Add Test Accounts Script
 * Creates test user accounts in Supabase for testing the application
 *
 * Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/add-test-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function encryptToken(token, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(encryptionKey, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

async function addTestAccounts() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║          TEST ACCOUNT CREATION SCRIPT                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!supabaseUrl || !supabaseKey || !encryptionKey) {
    log('\n✗ Missing required environment variables:', 'red');
    if (!supabaseUrl) log('  - NEXT_PUBLIC_SUPABASE_URL', 'red');
    if (!supabaseKey) log('  - SUPABASE_SERVICE_ROLE_KEY', 'red');
    if (!encryptionKey) log('  - ENCRYPTION_KEY', 'red');
    log('\nPlease set these in your .env.local file\n', 'yellow');
    process.exit(1);
  }

  log('\n✓ Environment variables loaded', 'green');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  log('✓ Supabase client initialized\n', 'green');

  // Test account data
  const testAccounts = [
    {
      user_id: 'test-user-1',
      clickup_token: 'pk_test_clickup_token_123456789',
      monday_token: 'test_monday_token_abcdefghijk',
    },
    {
      user_id: 'test-user-2',
      clickup_token: 'pk_demo_clickup_987654321',
      monday_token: 'demo_monday_zyxwvutsrqp',
    },
  ];

  log('Creating test accounts...\n', 'blue');

  for (const account of testAccounts) {
    log(`Processing: ${account.user_id}`, 'cyan');

    try {
      // Add ClickUp credentials
      const { error: clickupError } = await supabase
        .from('api_credentials')
        .upsert(
          {
            user_id: account.user_id,
            service: 'clickup',
            access_token: encryptToken(account.clickup_token, encryptionKey),
            refresh_token: null,
            expires_at: null,
            workspace_id: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,service',
          }
        );

      if (clickupError) {
        log(`  ✗ ClickUp credentials failed: ${clickupError.message}`, 'red');
      } else {
        log('  ✓ ClickUp credentials saved', 'green');
      }

      // Add Monday credentials
      const { error: mondayError } = await supabase
        .from('api_credentials')
        .upsert(
          {
            user_id: account.user_id,
            service: 'monday',
            access_token: encryptToken(account.monday_token, encryptionKey),
            refresh_token: null,
            expires_at: null,
            workspace_id: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,service',
          }
        );

      if (mondayError) {
        log(`  ✗ Monday credentials failed: ${mondayError.message}`, 'red');
      } else {
        log('  ✓ Monday credentials saved', 'green');
      }

      log('', 'reset');
    } catch (error) {
      log(`  ✗ Error: ${error.message}`, 'red');
    }
  }

  log('╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║                   SETUP COMPLETE                       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  log('\nTest accounts created successfully!', 'green');
  log('\nYou can now test the API with user_id: "test-user-1" or "test-user-2"', 'blue');
  log('\nNote: These are mock tokens for testing purposes only.\n', 'yellow');
}

// Run
addTestAccounts().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}\n`, 'red');
  process.exit(1);
});
