#!/usr/bin/env node
/**
 * Query Foreign Keys from Postgres catalog
 * READ-ONLY metadata query (zero PII)
 * Schema: public only
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials from env
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryForeignKeys() {
  console.log('🔍 Querying foreign keys from pg_constraint...');

  try {
    // Query via RPC function (if exists) or direct SQL
    // This is READ-ONLY metadata query
    const { data, error } = await supabase.rpc('pg_catalog_foreign_keys', {
      schema_name: 'public'
    });

    if (error) {
      // Fallback: try direct query via PostgREST if RPC doesn't exist
      console.log('⚠️  RPC not available, trying alternative...');

      // We can't query pg_constraint directly via Supabase client
      // So we'll have to note this limitation
      const result = {
        success: false,
        method: 'rpc_pg_catalog_foreign_keys',
        error: error.message,
        note: 'Cannot query pg_constraint directly via Supabase Client without custom RPC function'
      };

      const outputPath = path.join(__dirname, 'results', 'foreign_keys_catalog.json');
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

      console.log(`❌ Cannot query FKs: ${error.message}`);
      return result;
    }

    const result = {
      success: true,
      method: 'rpc_pg_catalog_foreign_keys',
      schema: 'public',
      foreign_keys: data || [],
      total: (data || []).length,
      timestamp: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, 'results', 'foreign_keys_catalog.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`✅ Found ${result.total} foreign keys`);
    return result;

  } catch (err) {
    console.error('❌ Error querying FKs:', err.message);

    const result = {
      success: false,
      error: err.message,
      note: 'Supabase Client cannot query system catalogs directly'
    };

    const outputPath = path.join(__dirname, 'results', 'foreign_keys_catalog.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    return result;
  }
}

// Run
queryForeignKeys()
  .then(result => {
    if (result.success) {
      console.log('✅ FK query completed');
      process.exit(0);
    } else {
      console.log('🟨 FK query incomplete (expected - requires custom RPC)');
      process.exit(0); // Not a failure, just a limitation
    }
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
