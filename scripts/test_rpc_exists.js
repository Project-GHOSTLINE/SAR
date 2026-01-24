#!/usr/bin/env node
/**
 * Test if get_client_dossier_unified RPC exists
 * If not, provide manual deployment instructions
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  console.log('🔍 Testing if get_client_dossier_unified RPC exists...');

  try {
    // Try calling with a dummy UUID (will fail if function doesn't exist)
    const { data, error } = await supabase.rpc('get_client_dossier_unified', {
      p_client_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.log('❌ RPC does NOT exist');
        console.log('');
        console.log('📝 MANUAL DEPLOYMENT REQUIRED:');
        console.log('');
        console.log('1. Open Supabase Dashboard:');
        console.log(`   ${supabaseUrl.replace('//', '//app.')}/project/_/sql/new`);
        console.log('');
        console.log('2. Copy the SQL from:');
        console.log('   supabase/migrations/20260124230000_create_get_client_dossier_unified.sql');
        console.log('');
        console.log('3. Paste and click "Run"');
        console.log('');
        console.log('4. Re-run this script to verify');
        console.log('');
        process.exit(1);
      } else if (error.message.includes('not found')) {
        // Expected error - function exists but client doesn't
        console.log('✅ RPC EXISTS (test with dummy UUID failed as expected)');
        process.exit(0);
      } else {
        console.log(`⚠️  RPC exists but returned error: ${error.message}`);
        process.exit(0);
      }
    } else {
      console.log('✅ RPC EXISTS and returned data');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testRPC();
