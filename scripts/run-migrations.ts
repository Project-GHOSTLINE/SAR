/**
 * Script: Run Database Migrations
 * Purpose: Execute visitor_id migrations directly using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSQLFile(filePath: string, name: string) {
  console.log(`\n📄 Executing: ${name}`);
  console.log(`   File: ${filePath}`);

  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    // Use raw SQL execution via RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, we need to execute via REST API differently
      console.log(`   ⚠️  exec_sql RPC not available, trying alternative method...`);

      // Try to split and execute statements individually
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('DO $$')) {
          console.log(`   ⏭️  Skipping validation block (will verify manually)`);
          continue;
        }

        console.log(`   Executing statement...`);
        // This won't work directly - we need Supabase Management API or Dashboard
      }

      throw new Error('Cannot execute raw SQL via REST API. Please use Supabase Dashboard SQL Editor.');
    }

    console.log(`   ✅ ${name} executed successfully`);
    return true;
  } catch (err: any) {
    console.error(`   ❌ Failed to execute ${name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running Database Migrations\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  // Migration 1: Add visitor_id columns
  const migration1 = path.join(migrationsDir, '20260130_add_visitor_id.sql');
  const success1 = await executeSQLFile(migration1, 'Migration 1: Add visitor_id columns');

  if (!success1) {
    console.log('\n❌ Migration 1 failed. Stopping.');
    process.exit(1);
  }

  // Migration 2: Create visitor_identity_graph view
  const migration2 = path.join(migrationsDir, '20260130_visitor_identity_graph.sql');
  const success2 = await executeSQLFile(migration2, 'Migration 2: Create visitor_identity_graph');

  if (!success2) {
    console.log('\n❌ Migration 2 failed. Stopping.');
    process.exit(1);
  }

  console.log('\n✅ All migrations completed successfully!\n');
}

main().catch(console.error);
