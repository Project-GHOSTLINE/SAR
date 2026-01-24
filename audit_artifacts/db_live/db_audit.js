#!/usr/bin/env node
/**
 * DB LIVE AUDIT SCRIPT
 * Mode: READ-ONLY METADATA ONLY
 * Zero PII, Zero sensitive data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Storage for queries and results
const queries = [];
const results = {};

// Helper to execute and log query
async function executeQuery(name, sql, params = []) {
  console.log(`\n🔍 Executing: ${name}`);

  const query = {
    name,
    sql,
    params,
    timestamp: new Date().toISOString()
  };

  queries.push(query);

  try {
    const { data, error } = await supabase.rpc('exec_sql_readonly', {
      sql_query: sql
    }).catch(async () => {
      // Fallback: try direct query via Supabase
      // This will only work for specific queries
      return await supabase.from('pg_tables').select('*').limit(0);
    });

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      results[name] = {
        success: false,
        error: error.message,
        query: sql
      };
      return null;
    }

    console.log(`✅ Success: ${data ? data.length : 0} rows`);
    results[name] = {
      success: true,
      rowCount: data ? data.length : 0,
      data: data,
      query: sql,
      hash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
    };

    return data;
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    results[name] = {
      success: false,
      error: err.message,
      query: sql
    };
    return null;
  }
}

// Helper for RPC calls
async function executeRPC(name, rpcName, params = {}) {
  console.log(`\n🔍 Calling RPC: ${name} (${rpcName})`);

  const query = {
    name,
    type: 'rpc',
    rpcName,
    params,
    timestamp: new Date().toISOString()
  };

  queries.push(query);

  try {
    const { data, error } = await supabase.rpc(rpcName, params);

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      results[name] = {
        success: false,
        error: error.message,
        rpc: rpcName,
        params
      };
      return null;
    }

    console.log(`✅ Success`);
    results[name] = {
      success: true,
      data: data,
      rpc: rpcName,
      params,
      hash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
    };

    return data;
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    results[name] = {
      success: false,
      error: err.message,
      rpc: rpcName,
      params
    };
    return null;
  }
}

// Main audit
async function runAudit() {
  console.log('🔒 DB LIVE AUDIT - READ-ONLY METADATA');
  console.log('=====================================\n');

  // A) TABLES INVENTORY
  console.log('📊 SECTION A: TABLES INVENTORY\n');

  // Try information_schema first
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name, table_type')
    .eq('table_schema', 'public');

  if (!tablesError && tables) {
    console.log(`✅ Found ${tables.length} tables via information_schema`);
    results['tables_information_schema'] = {
      success: true,
      rowCount: tables.length,
      data: tables
    };
  }

  // B) COLUMNS
  console.log('\n📊 SECTION B: COLUMNS\n');

  const { data: columns, error: columnsError } = await supabase
    .from('information_schema.columns')
    .select('table_name, column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .limit(1000);

  if (!columnsError && columns) {
    console.log(`✅ Found ${columns.length} columns`);
    results['columns_information_schema'] = {
      success: true,
      rowCount: columns.length,
      data: columns.slice(0, 100) // Only keep first 100 for size
    };
  }

  // C) CONSTRAINTS
  console.log('\n📊 SECTION C: CONSTRAINTS\n');

  const { data: constraints, error: constraintsError } = await supabase
    .from('information_schema.table_constraints')
    .select('table_name, constraint_name, constraint_type')
    .eq('table_schema', 'public');

  if (!constraintsError && constraints) {
    console.log(`✅ Found ${constraints.length} constraints`);
    results['constraints_information_schema'] = {
      success: true,
      rowCount: constraints.length,
      data: constraints
    };
  }

  // D) CHECK SPECIFIC TABLES
  console.log('\n📊 SECTION D: VERIFY KEY TABLES\n');

  const keyTables = ['clients', 'client_external_ids', 'client_events', 'loan_applications',
                     'client_analyses', 'analysis_scores', 'webhook_logs'];

  for (const tableName of keyTables) {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`✅ ${tableName}: EXISTS (${count} rows)`);
      results[`table_exists_${tableName}`] = {
        success: true,
        exists: true,
        rowCount: count
      };
    } else {
      console.log(`❌ ${tableName}: ${error.message}`);
      results[`table_exists_${tableName}`] = {
        success: false,
        exists: false,
        error: error.message
      };
    }
  }

  // E) RPC FUNCTIONS
  console.log('\n📊 SECTION E: RPC FUNCTIONS TEST\n');

  // Try to list available RPC functions
  const { data: functions, error: functionsError } = await supabase
    .from('pg_proc')
    .select('proname')
    .limit(100);

  if (!functionsError && functions) {
    console.log(`✅ Found RPC functions (sample)`);
    results['rpc_functions_sample'] = {
      success: true,
      data: functions.slice(0, 20)
    };
  }

  // Try specific RPC calls (safe ones)
  await executeRPC('rpc_test_get_client_dossier', 'get_client_dossier_unified', { identifier: 'test@example.com' });
  await executeRPC('rpc_test_calculate_health', 'calculate_overall_health_score', {});

  // SAVE ALL RESULTS
  console.log('\n💾 SAVING RESULTS...\n');

  // Save individual result files
  for (const [name, result] of Object.entries(results)) {
    const filename = `audit_artifacts/db_live/results/${name}.json`;
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log(`✅ Saved: ${filename}`);
  }

  // Save queries log
  fs.writeFileSync('audit_artifacts/db_live/queries.json', JSON.stringify(queries, null, 2));
  console.log(`✅ Saved: audit_artifacts/db_live/queries.json`);

  // Generate summary
  const summary = {
    timestamp: new Date().toISOString(),
    total_queries: queries.length,
    successful_queries: Object.values(results).filter(r => r.success).length,
    failed_queries: Object.values(results).filter(r => !r.success).length,
    tables_found: results['tables_information_schema']?.rowCount || 'UNKNOWN',
    columns_found: results['columns_information_schema']?.rowCount || 'UNKNOWN',
    constraints_found: results['constraints_information_schema']?.rowCount || 'UNKNOWN',
    key_tables_verified: keyTables.map(t => ({
      table: t,
      exists: results[`table_exists_${t}`]?.exists || false,
      row_count: results[`table_exists_${t}`]?.rowCount || 0
    }))
  };

  fs.writeFileSync('audit_artifacts/db_live/summary.json', JSON.stringify(summary, null, 2));
  console.log(`✅ Saved: audit_artifacts/db_live/summary.json`);

  console.log('\n✅ DB LIVE AUDIT COMPLETE\n');
  console.log('Summary:');
  console.log(`  Total queries: ${summary.total_queries}`);
  console.log(`  Successful: ${summary.successful_queries}`);
  console.log(`  Failed: ${summary.failed_queries}`);
  console.log(`  Tables found: ${summary.tables_found}`);
  console.log(`  Columns found: ${summary.columns_found}`);

  return summary;
}

// Run audit
runAudit().catch(err => {
  console.error('💥 FATAL ERROR:', err);
  process.exit(1);
});
