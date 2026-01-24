#!/usr/bin/env node
/**
 * Deploy get_client_dossier_unified RPC via direct PostgreSQL connection
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl || !supabaseDbPassword) {
  console.error('❌ Missing credentials');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD');
  process.exit(1);
}

// Extract project ID from URL
const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const encodedPassword = encodeURIComponent(supabaseDbPassword);
// Direct connection (not pooler)
const connectionString = `postgresql://postgres:${encodedPassword}@db.${projectId}.supabase.co:5432/postgres`;

async function deployRPC() {
  console.log('🚀 Deploying get_client_dossier_unified RPC...');
  console.log(`📡 Connecting to ${projectId}...`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected');

    // Read migration SQL
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260124230000_create_get_client_dossier_unified.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration...');
    await client.query(sql);

    console.log('✅ RPC function deployed successfully');
    console.log('');
    console.log('Function: public.get_client_dossier_unified(uuid)');
    console.log('Status: READY');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

deployRPC();
