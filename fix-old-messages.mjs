#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger .env.local
config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeAndFix() {
  console.log('🔍 Analyse des messages...\n')

  // Récupérer tous les messages du mois
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data: messages, error } = await supabase
    .from('contact_messages')
    .select('id, nom, assigned_to, system_responded, created_at')
    .gte('created_at', firstDayOfMonth.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }

  console.log(`📊 Total messages du mois: ${messages.length}`)

  // Analyser
  const withAssigned = messages.filter(m => m.assigned_to)
  const withResponse = messages.filter(m => m.system_responded)
  const withAssignedButNoResponse = messages.filter(m => m.assigned_to && !m.system_responded)
  const withoutAssigned = messages.filter(m => !m.assigned_to)

  console.log(`✅ Avec assigned_to: ${withAssigned.length}`)
  console.log(`✅ Avec system_responded: ${withResponse.length}`)
  console.log(`⚠️  Avec assigned_to MAIS sans system_responded: ${withAssignedButNoResponse.length}`)
  console.log(`❌ Sans assigned_to: ${withoutAssigned.length}`)

  if (withAssignedButNoResponse.length > 0) {
    console.log('\n⚠️  Messages incohérents:')
    withAssignedButNoResponse.forEach(m => {
      console.log(`   - ID ${m.id}: ${m.nom} → assigné à ${m.assigned_to} mais system_responded = false`)
    })

    console.log('\n🔧 Correction de ces messages...')

    for (const msg of withAssignedButNoResponse) {
      const { error: updateError } = await supabase
        .from('contact_messages')
        .update({ system_responded: true })
        .eq('id', msg.id)

      if (updateError) {
        console.log(`   ❌ Erreur ID ${msg.id}:`, updateError.message)
      } else {
        console.log(`   ✅ ID ${msg.id} corrigé`)
      }
    }
  }

  if (withoutAssigned.length > 0) {
    console.log('\n❌ Messages sans assignation:')
    withoutAssigned.forEach(m => {
      console.log(`   - ID ${m.id}: ${m.nom} (${new Date(m.created_at).toLocaleString('fr-CA')})`)
    })
  }

  console.log('\n✅ Analyse terminée!')
}

analyzeAndFix()
