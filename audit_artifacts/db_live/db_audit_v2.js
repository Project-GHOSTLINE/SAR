#!/usr/bin/env node
/**
 * DB LIVE AUDIT SCRIPT V2
 * Mode: Direct SQL via Supabase RPC
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.log('⚠️  Using anon key (limited permissions)');
}

const supabase = createClient(supabaseUrl, supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const allQueries = [];
const allResults = {};

// Execute SQL query via database function or direct query
async function querySql(name, description, query) {
  console.log(`\n🔍 ${name}: ${description}`);

  allQueries.push({
    name,
    description,
    query,
    timestamp: new Date().toISOString()
  });

  try {
    // Try using a custom RPC function if available
    const { data, error } = await supabase.rpc('exec_readonly_sql', { sql_text: query })
      .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

    if (error && error.message.includes('not available')) {
      console.log('⚠️  Direct SQL not available, skipping');
      allResults[name] = {
        success: false,
        error: 'RPC not available (requires exec_readonly_sql function)',
        query
      };
      return null;
    }

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      allResults[name] = {
        success: false,
        error: error.message,
        query
      };
      return null;
    }

    console.log(`✅ Success: ${data ? data.length : 0} rows`);
    allResults[name] = {
      success: true,
      rowCount: data ? data.length : 0,
      data: data,
      query,
      hash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16)
    };

    return data;
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    allResults[name] = {
      success: false,
      error: err.message,
      query
    };
    return null;
  }
}

// Get table counts using select count
async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { exists: false, count: null, error: error.message };
    }

    return { exists: true, count: count };
  } catch (err) {
    return { exists: false, count: null, error: err.message };
  }
}

// Get column info using API
async function getColumnInfo(tableName) {
  try {
    // Try to get one row to infer structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      return { success: true, columns: columns };
    }

    return { success: true, columns: [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runFullAudit() {
  console.log('🔒 DB LIVE AUDIT V2 - METADATA ONLY');
  console.log('====================================\n');

  // Tables to verify
  const criticalTables = [
    'clients',
    'client_external_ids',
    'client_events',
    'client_addresses',
    'loan_applications',
    'client_analyses',
    'analysis_jobs',
    'analysis_scores',
    'analysis_recommendations',
    'webhook_logs',
    'email_messages',
    'download_logs',
    'quickbooks_invoices',
    'quickbooks_customers',
    'telemetry_requests',
    'telemetry_spans',
    'seo_ga4_metrics_daily',
    'seo_gsc_metrics_daily',
    'seo_semrush_metrics_daily'
  ];

  const tableResults = [];

  console.log('📊 VERIFYING CRITICAL TABLES...\n');

  for (const table of criticalTables) {
    const countResult = await getTableCount(table);
    const columnResult = await getColumnInfo(table);

    const result = {
      table,
      ...countResult,
      columns: columnResult.columns || []
    };

    tableResults.push(result);

    if (countResult.exists) {
      console.log(`✅ ${table}: EXISTS (${countResult.count} rows, ${result.columns.length} columns)`);
    } else {
      console.log(`❌ ${table}: NOT FOUND (${countResult.error})`);
    }
  }

  allResults['table_verification'] = {
    success: true,
    data: tableResults,
    timestamp: new Date().toISOString()
  };

  // Try to call known RPC functions
  console.log('\n📊 TESTING RPC FUNCTIONS...\n');

  const rpcTests = [
    { name: 'get_client_dossier_unified', params: { identifier: 'nonexistent@test.com' } },
    { name: 'get_client_summary', params: { client_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'calculate_overall_health_score', params: {} },
    { name: 'resolve_client_id', params: { identifier: 'test@test.com' } }
  ];

  for (const { name, params } of rpcTests) {
    try {
      console.log(`🔍 Testing RPC: ${name}`);
      const { data, error } = await supabase.rpc(name, params);

      if (error) {
        console.log(`  ❌ ${error.message}`);
        allResults[`rpc_${name}`] = {
          success: false,
          exists: error.message.includes('not find') ? false : 'UNKNOWN',
          error: error.message
        };
      } else {
        console.log(`  ✅ Function exists and executed`);
        allResults[`rpc_${name}`] = {
          success: true,
          exists: true,
          returned_type: typeof data
        };
      }
    } catch (err) {
      console.log(`  ❌ ${err.message}`);
      allResults[`rpc_${name}`] = {
        success: false,
        error: err.message
      };
    }
  }

  // Save all results
  console.log('\n💾 SAVING RESULTS...\n');

  for (const [name, result] of Object.entries(allResults)) {
    const filename = `audit_artifacts/db_live/results/${name}.json`;
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log(`✅ Saved: ${filename}`);
  }

  fs.writeFileSync('audit_artifacts/db_live/queries.json', JSON.stringify(allQueries, null, 2));
  console.log(`✅ Saved queries log`);

  // Generate final summary
  const existingTables = tableResults.filter(t => t.exists);
  const missingTables = tableResults.filter(t => !t.exists);
  const totalRows = existingTables.reduce((sum, t) => sum + (t.count || 0), 0);

  const summary = {
    audit_timestamp: new Date().toISOString(),
    connection_method: 'Supabase Client (service_role or anon)',
    scope: 'public schema only',

    tables: {
      total_verified: criticalTables.length,
      existing: existingTables.length,
      missing: missingTables.length,
      total_rows: totalRows,
      list: tableResults.map(t => ({
        name: t.table,
        exists: t.exists,
        rows: t.count,
        columns: t.columns.length
      }))
    },

    rpc_functions: {
      tested: rpcTests.length,
      existing: Object.values(allResults).filter(r => r.exists === true).length,
      missing: Object.values(allResults).filter(r => r.exists === false).length
    },

    key_findings: {
      clients_table: existingTables.find(t => t.table === 'clients') ? 'EXISTS' : 'NOT FOUND',
      clients_rows: existingTables.find(t => t.table === 'clients')?.count || 0,
      loan_applications_rows: existingTables.find(t => t.table === 'loan_applications')?.count || 0,
      webhook_logs_rows: existingTables.find(t => t.table === 'webhook_logs')?.count || 0,
      orchestration_rpc: allResults['rpc_get_client_dossier_unified']?.exists || false
    }
  };

  fs.writeFileSync('audit_artifacts/db_live/SUMMARY.json', JSON.stringify(summary, null, 2));
  console.log(`✅ Saved summary`);

  console.log('\n✅ DB LIVE AUDIT V2 COMPLETE\n');
  console.log('═══════════════════════════════════');
  console.log(`Tables existing: ${existingTables.length}/${criticalTables.length}`);
  console.log(`Total rows: ${totalRows.toLocaleString()}`);
  console.log(`Clients table: ${summary.key_findings.clients_table} (${summary.key_findings.clients_rows} rows)`);
  console.log(`RPC functions found: ${summary.rpc_functions.existing}/${summary.rpc_functions.tested}`);
  console.log('═══════════════════════════════════\n');

  return summary;
}

runFullAudit().catch(err => {
  console.error('💥 FATAL:', err);
  process.exit(1);
});
