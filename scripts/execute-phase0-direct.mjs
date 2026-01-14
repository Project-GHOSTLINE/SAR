#!/usr/bin/env node
import fetch from 'node-fetch';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                     🗄️  PHASE 0 - BASELINE SNAPSHOT                        ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

const queries = [
  { name: 'Timestamp', sql: "SELECT now() AS executed_at" },
  { name: 'Table Statistics', sql: "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC" },
  { name: 'RLS Status', sql: "SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind='r' AND n.nspname='public' ORDER BY c.relname" },
  { name: 'loan_applications count', sql: "SELECT COUNT(*) AS loan_applications FROM public.loan_applications" },
  { name: 'client_accounts count', sql: "SELECT COUNT(*) AS client_accounts FROM public.client_accounts" },
  { name: 'client_transactions count', sql: "SELECT COUNT(*) AS client_transactions FROM public.client_transactions" },
  { name: 'client_analyses count', sql: "SELECT COUNT(*) AS client_analyses FROM public.client_analyses" },
  { name: 'emails_envoyes count', sql: "SELECT COUNT(*) AS emails_envoyes FROM public.emails_envoyes" },
  { name: 'contact_messages count', sql: "SELECT COUNT(*) AS contact_messages FROM public.contact_messages" },
  { name: 'support_tickets count', sql: "SELECT COUNT(*) AS support_tickets FROM public.support_tickets" },
  { name: 'vopay_webhook_logs count', sql: "SELECT COUNT(*) AS vopay_webhook_logs FROM public.vopay_webhook_logs" },
  { name: 'fraud_cases count', sql: "SELECT COUNT(*) AS fraud_cases FROM public.fraud_cases" },
];

const results = [];

for (let i = 0; i < queries.length; i++) {
  const query = queries[i];
  console.log(`\n📌 Query ${i + 1}/${queries.length}: ${query.name}`);
  console.log('─'.repeat(80));

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: query.sql })
    });

    if (!response.ok) {
      // Try alternative: direct query endpoint
      console.log('⚠️  RPC not available, trying PostgREST...');

      // For counts, we can use PostgREST directly
      if (query.sql.includes('COUNT(*)')) {
        const tableName = query.sql.match(/FROM public\.(\w+)/)[1];
        const countResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=count`, {
          method: 'GET',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'count=exact'
          }
        });

        const count = countResponse.headers.get('content-range')?.split('/')[1] || '0';
        console.log(`✅ ${tableName}: ${count} rows`);
        results.push({ query: query.name, result: { [tableName]: count } });
        continue;
      }
    }

    const data = await response.json();
    console.log('✅ Result:', JSON.stringify(data, null, 2));
    results.push({ query: query.name, result: data });

  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    results.push({ query: query.name, error: err.message });
  }
}

console.log('\n═'.repeat(80));
console.log('\n📊 SUMMARY\n');
console.log(JSON.stringify(results, null, 2));
console.log('\n═'.repeat(80));
