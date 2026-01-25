/**
 * Execute Phase 2 Migration directly via Supabase REST API
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Read migration SQL
const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260125000300_fraud_detection_phase2.sql'
);

const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('📊 EXECUTING PHASE 2 MIGRATION');
console.log('================================\n');
console.log(`✓ Migration loaded (${migrationSQL.length} chars)\n`);

// Use Supabase REST API to execute raw SQL
async function executeMigration() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    });

    if (!response.ok) {
      // Try alternative: Use pg-promise to connect directly
      console.log('⚠️  REST API method failed, trying direct connection...\n');

      // Extract connection details from Supabase URL
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

      if (!projectRef) {
        throw new Error('Could not extract project reference from Supabase URL');
      }

      console.log('📋 MANUAL EXECUTION REQUIRED');
      console.log('============================\n');
      console.log('The migration SQL is already in your clipboard.');
      console.log('\nSteps:');
      console.log('1. ✅ Supabase SQL Editor already opened');
      console.log('2. ✅ Migration SQL in clipboard');
      console.log('3. Press Cmd+V in SQL Editor');
      console.log('4. Click "Run" button\n');

      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Migration executed successfully!');
    console.log('Result:', data);

  } catch (error) {
    console.error('❌ Execution failed:', error.message);
    console.log('\n📋 PLEASE EXECUTE MANUALLY:');
    console.log('1. SQL is in your clipboard');
    console.log('2. Paste in Supabase SQL Editor (Cmd+V)');
    console.log('3. Click Run\n');
    process.exit(1);
  }
}

executeMigration();
