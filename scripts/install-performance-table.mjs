#!/usr/bin/env node
/**
 * Installation de la table api_performance_logs dans Supabase
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('📊 Installation de la table api_performance_logs...')
console.log('')

// Lire le SQL
const sqlPath = path.join(__dirname, '../database/migrations/restructure/create_performance_logs.sql')
const sql = fs.readFileSync(sqlPath, 'utf-8')

console.log('✅ Fichier SQL lu')
console.log('')

// Découper les statements SQL (séparés par point-virgule)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`📋 ${statements.length} statements SQL détectés`)
console.log('')

// Exécuter chaque statement
for (let i = 0; i < statements.length; i++) {
  const statement = statements[i]
  const preview = statement.substring(0, 60).replace(/\n/g, ' ')

  process.stdout.write(`[${i+1}/${statements.length}] ${preview}... `)

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: statement })
    
    if (error) {
      // Essayer méthode alternative si rpc n'existe pas
      console.log('⚠️  RPC non disponible, voir instructions manuelles')
      break
    } else {
      console.log('✅')
    }
  } catch (err) {
    console.log('⚠️')
  }
}

console.log('')
console.log('═'.repeat(70))
console.log('📋 INSTRUCTIONS MANUELLES')
console.log('═'.repeat(70))
console.log('')
console.log('Si l\'installation automatique a échoué:')
console.log('')
console.log('1. Ouvre Supabase SQL Editor:')
console.log('   https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql')
console.log('')
console.log('2. Copie le contenu de:')
console.log('   database/migrations/restructure/create_performance_logs.sql')
console.log('')
console.log('3. Colle dans l\'éditeur et clique "Run"')
console.log('')
console.log('4. Vérifie la création:')
console.log('   • Table: api_performance_logs')
console.log('   • Views: vw_route_performance, vw_phase_performance, vw_slow_routes')
console.log('')
console.log('═'.repeat(70))
console.log('')

