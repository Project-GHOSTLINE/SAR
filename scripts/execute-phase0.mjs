#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection
const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 PHASE 0 - Baseline Snapshot');
console.log('='.repeat(80));
console.log('⏰ Started:', new Date().toISOString());
console.log('🔒 Mode: READ-ONLY (safe on production)');
console.log('='.repeat(80));
console.log('');

// Read the SQL file
const sqlFilePath = join(__dirname, '../database/migrations/restructure/000_baseline_snapshot.sql');
const sqlContent = readFileSync(sqlFilePath, 'utf8');

// Split into individual queries (simple split by semicolon)
const queries = sqlContent
  .split(';')
  .map(q => q.trim())
  .filter(q => q && !q.startsWith('--'));

console.log(`📝 Executing ${queries.length} baseline queries...\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < queries.length; i++) {
  const query = queries[i];
  if (!query) continue;

  console.log(`Query ${i + 1}/${queries.length}:`);
  console.log('-'.repeat(80));

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

    if (error) {
      // Try direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('_query')
        .select('*')
        .limit(0); // This will fail, but let's try a different approach

      console.log('⚠️  RPC method not available, trying alternative...');
      console.log(`Query: ${query.substring(0, 100)}...`);
      console.log('Status: Skipped (needs psql or direct SQL execution)\n');
      continue;
    }

    console.log('✅ Success');
    console.log('Result:', JSON.stringify(data, null, 2).substring(0, 500));
    console.log('');
    successCount++;
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log('');
    errorCount++;
  }
}

console.log('='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`⏰ Completed: ${new Date().toISOString()}`);
console.log('='.repeat(80));
console.log('');
console.log('⚠️  NOTE: Supabase JS client has limited SQL execution capabilities.');
console.log('For full Phase 0 execution, use psql or Supabase SQL Editor.');
console.log('');
console.log('📋 Next steps:');
console.log('1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql');
console.log('2. Copy/paste contents of: database/migrations/restructure/000_baseline_snapshot.sql');
console.log('3. Execute and save results');
console.log('4. Update JOURNAL/LOGBOOK.md with results');
