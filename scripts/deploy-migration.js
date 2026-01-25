#!/usr/bin/env node
/**
 * Deploy Client Sessions & Telemetry Migration
 * Executes migration SQL on Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployMigration() {
  console.log('🚀 Deploying Client Sessions & Telemetry Migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260125000200_client_sessions_telemetry.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded:', migrationPath);
  console.log('📏 Size:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log('📦 Total SQL statements:', statements.length, '\n');

  let successCount = 0;
  let errorCount = 0;

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Extract statement type for logging
    const match = statement.match(/^(CREATE|ALTER|DROP|COMMENT|INSERT|UPDATE|DELETE)/i);
    const type = match ? match[1].toUpperCase() : 'QUERY';

    // Get table/function name if available
    let target = '';
    if (statement.includes('TABLE')) {
      const tableMatch = statement.match(/TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:public\.)?(\w+)/i);
      if (tableMatch) target = tableMatch[1];
    } else if (statement.includes('FUNCTION')) {
      const funcMatch = statement.match(/FUNCTION\s+(?:public\.)?(\w+)/i);
      if (funcMatch) target = funcMatch[1];
    } else if (statement.includes('INDEX')) {
      const indexMatch = statement.match(/INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (indexMatch) target = indexMatch[1];
    } else if (statement.includes('POLICY')) {
      const policyMatch = statement.match(/POLICY\s+"([^"]+)"/i);
      if (policyMatch) target = policyMatch[1];
    }

    const label = target ? `${type} ${target}` : type;
    process.stdout.write(`[${i + 1}/${statements.length}] ${label}... `);

    try {
      const { error } = await supabase.rpc('exec_sql', { query: statement });

      if (error) {
        // Try direct query as fallback
        const { error: directError } = await supabase.from('_pg_stat_statements').select('*').limit(0);

        // If no RPC, execute via raw query
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        console.log('✅');
        successCount++;
      } else {
        console.log('✅');
        successCount++;
      }
    } catch (err) {
      console.log('❌');
      console.error(`   Error: ${err.message}`);
      console.error(`   Statement preview: ${statement.substring(0, 100)}...\n`);
      errorCount++;

      // Don't stop on error, continue with next statement
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('   ✅ Successful:', successCount);
  console.log('   ❌ Failed:', errorCount);
  console.log('   📦 Total:', statements.length);
  console.log('='.repeat(60) + '\n');

  if (errorCount === 0) {
    console.log('🎉 Migration deployed successfully!\n');

    console.log('✅ Next steps:');
    console.log('   1. Verify tables created:');
    console.log('      SELECT table_name FROM information_schema.tables');
    console.log('      WHERE table_schema = \'public\'');
    console.log('      AND table_name IN (\'client_sessions\', \'client_telemetry_events\');\n');

    console.log('   2. Test cleanup function:');
    console.log('      SELECT * FROM cleanup_client_sessions();\n');

    console.log('   3. Run verification checklist:');
    console.log('      ./audit_artifacts/telemetry/SECURITY_PASS_VERIFICATION.sh\n');

    return true;
  } else {
    console.log('⚠️  Migration completed with errors. Check output above.\n');
    return false;
  }
}

// Run migration
deployMigration()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
