#!/usr/bin/env node

/**
 * Vérifier les tables SEO dans Supabase
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials manquants')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('🔍 Vérification des tables SEO\n')

  const tables = [
    'seo_gsc_metrics_daily',
    'seo_ga4_metrics_daily',
    'seo_pagespeed_metrics_daily'
  ]

  for (const table of tables) {
    console.log(`\n📊 Table: ${table}`)
    console.log('─'.repeat(50))

    try {
      // Vérifier si la table existe en faisant une requête
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1)

      if (error) {
        console.log(`   ❌ Table n'existe pas ou erreur: ${error.message}`)
      } else {
        console.log(`   ✅ Table existe`)
        console.log(`   📈 Nombre d'entrées: ${count || 0}`)
        if (data && data.length > 0) {
          console.log(`   📄 Exemple de structure:`)
          console.log(`      Colonnes: ${Object.keys(data[0]).join(', ')}`)
        }
      }
    } catch (err) {
      console.log(`   ❌ Erreur: ${err.message}`)
    }
  }

  console.log('\n' + '─'.repeat(50))
}

checkTables()
