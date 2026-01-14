#!/usr/bin/env node
import fetch from 'node-fetch';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const tables = [
  'loan_applications',
  'client_accounts',
  'contact_messages',
  'support_tickets',
  'client_analyses'
];

console.log('🔍 Vérification des colonnes existantes...\n');

for (const table of tables) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      console.log(`✅ ${table}:`);
      console.log(`   Colonnes: ${Object.keys(data[0]).join(', ')}\n`);
    } else if (Array.isArray(data) && data.length === 0) {
      console.log(`⚠️  ${table}: Table vide, impossible de lister colonnes\n`);
    } else {
      console.log(`❌ ${table}: ${JSON.stringify(data)}\n`);
    }
  } catch (err) {
    console.log(`❌ ${table}: Erreur - ${err.message}\n`);
  }
}
