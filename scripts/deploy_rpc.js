#!/usr/bin/env node
/**
 * Deploy get_client_dossier_unified RPC to Supabase
 * Method: Direct SQL execution via Supabase Client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployRPC() {
  console.log('🚀 Deploying get_client_dossier_unified RPC...');

  // Read migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260124230000_create_get_client_dossier_unified.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute SQL via Supabase (note: this may not work directly, might need pg client)
    // Supabase Client doesn't have .query() for raw SQL
    // We'll need to use a different approach

    console.log('⚠️  Supabase Client does not support raw SQL execution');
    console.log('📝 Manual deployment required:');
    console.log('');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Paste the contents of:');
    console.log('   supabase/migrations/20260124230000_create_get_client_dossier_unified.sql');
    console.log('3. Click "Run"');
    console.log('');
    console.log('Or use psql:');
    console.log(`psql "${supabaseUrl.replace('https://', 'postgresql://postgres:')}@db.${supabaseUrl.split('.')[0].split('//')[1]}.supabase.co:5432/postgres" -f supabase/migrations/20260124230000_create_get_client_dossier_unified.sql`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deployRPC();
