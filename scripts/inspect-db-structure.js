#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dllyzfuqjzuhvshrlmuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'
)

async function inspectDatabase() {
  console.log('📋 INSPECTION DE LA BASE DE DONNÉES\n')

  // 1. audit_log structure
  console.log('=== AUDIT_LOG ===')
  const { data: auditSample } = await supabase
    .from('audit_log')
    .select('*')
    .limit(1)
  if (auditSample && auditSample[0]) {
    console.log('Colonnes:', Object.keys(auditSample[0]).join(', '))
  }
  console.log('')

  // 2. client_sessions structure
  console.log('=== CLIENT_SESSIONS ===')
  const { data: sessionSample } = await supabase
    .from('client_sessions')
    .select('*')
    .limit(1)
  if (sessionSample && sessionSample[0]) {
    console.log('Colonnes:', Object.keys(sessionSample[0]).join(', '))
    console.log('Has client_id?', 'client_id' in sessionSample[0] ? '✅ OUI' : '❌ NON')
  }
  console.log('')

  // 3. clients structure
  console.log('=== CLIENTS ===')
  const { data: clientSample } = await supabase
    .from('clients')
    .select('*')
    .limit(1)
  if (clientSample && clientSample[0]) {
    console.log('Colonnes:', Object.keys(clientSample[0]).join(', '))
    console.log('Has id?', 'id' in clientSample[0] ? '✅ OUI' : '❌ NON')
  }
  console.log('')

  // 4. Check if foreign key exists
  console.log('=== FOREIGN KEYS CHECK ===')
  const { data: fkeys } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT constraint_name, table_name, column_name
      FROM information_schema.key_column_usage
      WHERE constraint_name LIKE '%client_sessions%'
        AND constraint_name LIKE '%fkey%'
    `
  }).catch(() => ({ data: null }))

  if (fkeys) {
    console.log('Foreign keys found:', fkeys)
  } else {
    console.log('⚠️  Cannot query foreign keys (exec_sql not available)')
  }
  console.log('')

  // 5. Check existing views
  console.log('=== VIEWS CHECK ===')
  const { data: views } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name LIKE '%audit%'
    `
  }).catch(() => ({ data: null }))

  if (views) {
    console.log('Audit views found:', views)
  } else {
    console.log('⚠️  Cannot query views (exec_sql not available)')
  }
}

inspectDatabase().catch(console.error)
