#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

console.log('🚀 Migration Supabase: Ajout colonnes metadata\n')

// Exécuter via RPC SQL direct
const sql = `
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
ADD COLUMN IF NOT EXISTS client_device VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_browser VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_os VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS client_screen_resolution VARCHAR(50),
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_contact_messages_client_ip ON contact_messages(client_ip);
`

console.log('📝 Exécution du SQL...\n')

// Option 1: Via REST API direct (PostgREST ne supporte pas ALTER TABLE)
// On doit utiliser l'API Management de Supabase
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
})

if (!response.ok) {
  console.log('⚠️  RPC non disponible, tentative via query directe...\n')

  // Tester si les colonnes existent déjà
  const { data: testData, error: testError } = await supabase
    .from('contact_messages')
    .select('*')
    .limit(1)
    .single()

  if (!testError && testData) {
    const columns = Object.keys(testData)
    const hasMetadata = columns.some(col => col.startsWith('client_'))

    if (hasMetadata) {
      console.log('✅ Les colonnes metadata existent déjà!')
      console.log('\n📊 Colonnes trouvées:')
      columns.filter(c => c.startsWith('client_') || c.startsWith('utm_') || c === 'referrer')
        .forEach(col => console.log(`   - ${col}`))
      process.exit(0)
    }
  }

  console.log('\n⚠️  Les colonnes n\'existent pas encore.')
  console.log('\n🔧 Exécution manuelle requise:')
  console.log('   https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new\n')
  console.log('📋 SQL à copier-coller:')
  console.log(sql)
  process.exit(1)
}

console.log('✅ Migration exécutée!\n')

// Vérifier
const { data: verifyData } = await supabase
  .from('contact_messages')
  .select('*')
  .limit(1)
  .single()

if (verifyData) {
  const metadataColumns = Object.keys(verifyData).filter(col =>
    col.startsWith('client_') || col.startsWith('utm_') || col === 'referrer'
  )

  console.log('📊 Colonnes ajoutées:')
  metadataColumns.forEach(col => console.log(`   ✓ ${col}`))
  console.log(`\n✅ Total: ${metadataColumns.length} colonnes\n`)
}
