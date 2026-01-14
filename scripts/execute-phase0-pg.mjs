#!/usr/bin/env node
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PostgreSQL connection via Supabase (direct connection)
const pool = new Pool({
  host: 'db.dllyzfuqjzuhvshrlmuq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Solution%99',
  ssl: { rejectUnauthorized: false }
});

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                     🗄️  PHASE 0 - BASELINE SNAPSHOT                        ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('⏰ Started:', new Date().toISOString());
console.log('🔒 Mode: READ-ONLY (100% safe on production)');
console.log('📦 Database: dllyzfuqjzuhvshrlmuq.supabase.co');
console.log('');

// Read the SQL file
const sqlFilePath = join(__dirname, '../database/migrations/restructure/000_baseline_snapshot.sql');
let sqlContent = readFileSync(sqlFilePath, 'utf8');

// Remove comments and split by semicolon
const queries = sqlContent
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(q => q.trim())
  .filter(q => q.length > 0);

console.log(`📝 Found ${queries.length} queries to execute\n`);
console.log('═'.repeat(80));
console.log('');

const results = [];
let successCount = 0;
let errorCount = 0;

try {
  const client = await pool.connect();
  console.log('✅ Connected to database\n');

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n📌 Query ${i + 1}/${queries.length}`);
    console.log('─'.repeat(80));

    const preview = query.length > 100 ? query.substring(0, 100) + '...' : query;
    console.log(`SQL: ${preview}`);

    try {
      const startTime = Date.now();
      const result = await client.query(query);
      const duration = Date.now() - startTime;

      console.log(`✅ Success (${duration}ms)`);

      if (result.rows && result.rows.length > 0) {
        console.log(`📊 Rows returned: ${result.rows.length}`);

        // Store first row for logging
        if (result.rows.length <= 5) {
          console.log('Result:', JSON.stringify(result.rows, null, 2));
        } else {
          console.log('First 3 rows:', JSON.stringify(result.rows.slice(0, 3), null, 2));
          console.log(`... and ${result.rows.length - 3} more rows`);
        }

        results.push({
          query: i + 1,
          success: true,
          rows: result.rows,
          rowCount: result.rowCount,
          duration
        });
      } else if (result.rowCount !== null) {
        console.log(`✅ Affected rows: ${result.rowCount}`);
        results.push({
          query: i + 1,
          success: true,
          rowCount: result.rowCount,
          duration
        });
      }

      successCount++;
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
      results.push({
        query: i + 1,
        success: false,
        error: err.message
      });
    }
  }

  client.release();

  console.log('');
  console.log('═'.repeat(80));
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                            📊 EXECUTION SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Successful queries: ${successCount}`);
  console.log(`❌ Failed queries: ${errorCount}`);
  console.log(`⏰ Completed: ${new Date().toISOString()}`);
  console.log('');

  if (errorCount === 0) {
    console.log('✨ PHASE 0 COMPLETED SUCCESSFULLY');
    console.log('');
    console.log('📋 Baseline snapshot captured. Key metrics:');

    // Extract key metrics from results
    results.forEach(result => {
      if (result.success && result.rows) {
        const firstRow = result.rows[0];
        if (firstRow) {
          Object.entries(firstRow).forEach(([key, value]) => {
            if (key.includes('count') || key.includes('COUNT')) {
              console.log(`   • ${key}: ${value}`);
            }
          });
        }
      }
    });

    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Update JOURNAL/LOGBOOK.md with these results');
    console.log('   2. Mark Phase 0 as complete in STATUS-BOARD.md');
    console.log('   3. Await human validation before proceeding to Phase 1');
  } else {
    console.log('⚠️  PHASE 0 COMPLETED WITH ERRORS');
    console.log('');
    console.log('Please review errors above and address before proceeding.');
  }

  console.log('');
  console.log('═'.repeat(80));

} catch (err) {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
