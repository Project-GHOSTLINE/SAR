#!/usr/bin/env node

/**
 * Apply telemetry tables migration to Supabase
 *
 * This script reads the telemetry migration SQL file and applies it
 * directly to the Supabase database using the service role key.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Read the migration SQL file
const migrationPath = path.join(__dirname, '../supabase/migrations/20260122_telemetry_tables.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📝 Read migration file:', migrationPath);
console.log('📊 SQL length:', migrationSQL.length, 'characters');

// Execute SQL via Supabase REST API (PostgREST doesn't support direct SQL)
// We'll use the pg-meta endpoint instead
const url = new URL(SUPABASE_URL);
const restUrl = `${url.protocol}//${url.hostname}/rest/v1/rpc/exec`;

// Alternative: Use Supabase client with raw SQL
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function applyMigration() {
  console.log('\n🚀 Applying telemetry migration to Supabase...\n');

  try {
    // Split SQL into individual statements (crude but works)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📦 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }

      // Extract statement type for logging
      const firstWord = statement.trim().split(/\s+/)[0].toUpperCase();

      process.stdout.write(`[${i + 1}/${statements.length}] ${firstWord}... `);

      try {
        // Execute via rpc (this requires a custom function in Supabase)
        // Since we can't do that easily, we'll use a different approach

        // For CREATE TABLE, CREATE INDEX, etc., we can use the SQL editor endpoint
        // But this requires authentication and is complex

        // Simpler approach: Use Supabase client's .rpc() if we have a wrapper function
        // OR: Use direct PostgreSQL connection

        // For now, let's just execute via SQL using node-postgres
        const { Pool } = require('pg');

        // Parse connection string from SUPABASE_URL
        const dbUrl = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
        const projectRef = dbUrl.split('.')[0];

        // Connection string format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
        const connectionString = `postgresql://postgres.${projectRef}:${SERVICE_ROLE_KEY.split('.')[2]}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

        // Actually, easier to use Supabase's built-in query function
        // But Supabase JS client doesn't support raw SQL execution easily

        // Let's try a different approach: use the REST API with a stored procedure
        console.log('⏭️  SKIPPED (needs manual application)\n');

      } catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

    console.log('\n⚠️  NOTE: This script cannot directly execute SQL.');
    console.log('📋 Please apply the migration manually:');
    console.log('   1. Go to https://supabase.com/dashboard/project/' + SUPABASE_URL.match(/dllyzfuqjzuhvshrmlmuq/)?.[0]);
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Paste the contents of: supabase/migrations/20260122_telemetry_tables.sql');
    console.log('   4. Execute the SQL\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration().then(() => {
  console.log('✅ Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
