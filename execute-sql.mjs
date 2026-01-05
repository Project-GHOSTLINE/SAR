/**
 * Exécute le SQL directement via l'API REST de Supabase
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

const sql = readFileSync('./supabase-vopay-webhooks.sql', 'utf8')

console.log('🚀 Exécution du SQL dans Supabase...\n')

// Utiliser l'API REST de Supabase pour exécuter du SQL
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  },
  body: JSON.stringify({ query: sql })
})

if (!response.ok) {
  const error = await response.text()
  console.error('❌ Erreur:', error)
  console.log('\n📋 Veuillez exécuter le SQL manuellement:')
  console.log('   👉 https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new')
  process.exit(1)
}

const result = await response.json()
console.log('✅ SQL exécuté avec succès!')
console.log(result)
