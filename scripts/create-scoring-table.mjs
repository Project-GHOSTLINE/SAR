#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Credentials
const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Creating sentinel_scans table...\n');

// Create table manually by checking if it exists
try {
  // Test if table exists
  const { error: testError } = await supabase
    .from('sentinel_scans')
    .select('id')
    .limit(1);

  if (testError && testError.code === '42P01') {
    console.log('❌ Table does not exist');
    console.log('📝 Please create the table manually in Supabase SQL Editor:');
    console.log('\nSQL Script location: database/sentinel-scoring.sql\n');

    const sqlPath = join(__dirname, '..', 'database', 'sentinel-scoring.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log('Copy this SQL:\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    process.exit(1);
  } else {
    console.log('✅ Table sentinel_scans already exists!');

    // Test insert
    const testData = {
      project_name: 'sar',
      threats_found: 0,
      high_severity: 0,
      medium_severity: 0,
      low_severity: 0,
      duration_ms: 100,
      health_score: 100,
      scan_details: { test: true }
    };

    const { error: insertError } = await supabase
      .from('sentinel_scans')
      .insert(testData);

    if (insertError) {
      console.log('⚠️ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert test successful!');
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
