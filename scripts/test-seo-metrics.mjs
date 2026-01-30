#!/usr/bin/env node

/**
 * Test Script: Vérification des métriques SEO
 * - Google Search Console (GSC)
 * - Google Analytics 4 (GA4)
 * - Semrush
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

dotenv.config({ path: join(projectRoot, '.env.local') })

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function section(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

async function testAPI(name, endpoint, method = 'POST', body = {}) {
  log(`\n🔍 Test ${name}...`, 'blue')

  try {
    const url = `http://localhost:3000${endpoint}`
    log(`   URL: ${url}`, 'reset')

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ADMIN_PASSWORD || ''
      }
    }

    if (method === 'POST' && Object.keys(body).length > 0) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json()

    if (response.ok) {
      log(`   ✅ Status: ${response.status} OK`, 'green')

      if (data.success) {
        log(`   ✅ Success: ${data.message || 'Données collectées'}`, 'green')

        // Afficher un résumé des données
        if (data.data) {
          const d = data.data

          if (name === 'Google Search Console') {
            log(`   📊 Clicks: ${d.total_clicks || 0}`, 'reset')
            log(`   📊 Impressions: ${d.total_impressions || 0}`, 'reset')
            log(`   📊 CTR: ${(d.avg_ctr * 100).toFixed(2)}%`, 'reset')
            log(`   📊 Position: ${d.avg_position?.toFixed(1) || 'N/A'}`, 'reset')
            log(`   📊 Top Queries: ${d.top_queries?.length || 0}`, 'reset')
          }

          if (name === 'Google Analytics 4') {
            log(`   📊 Users: ${d.users || 0}`, 'reset')
            log(`   📊 Sessions: ${d.sessions || 0}`, 'reset')
            log(`   📊 Engagement Rate: ${d.engagement_rate?.toFixed(1) || 0}%`, 'reset')
            log(`   📊 Bounce Rate: ${d.bounce_rate?.toFixed(1) || 0}%`, 'reset')
            log(`   📊 Conversions: ${d.conversions || 0}`, 'reset')
          }

          if (name === 'Semrush') {
            log(`   📊 Domain Rank: ${d.domain_rank || 0}`, 'reset')
            log(`   📊 Organic Keywords: ${d.organic_keywords || 0}`, 'reset')
            log(`   📊 Organic Traffic: ${d.organic_traffic || 0}`, 'reset')
            log(`   📊 Backlinks: ${d.total_backlinks || 0}`, 'reset')
            log(`   📊 Referring Domains: ${d.referring_domains || 0}`, 'reset')
            log(`   📊 Authority Score: ${d.authority_score || 0}`, 'reset')
          }
        }

        if (data.mock) {
          log(`   ⚠️  MODE MOCK - Configurez l'API pour vraies données`, 'yellow')
        }

        if (data.existing) {
          log(`   ℹ️  Données déjà existantes`, 'yellow')
        }

        return true
      } else {
        log(`   ❌ Erreur: ${data.error || 'Erreur inconnue'}`, 'red')
        if (data.details) {
          log(`   📝 Détails: ${data.details}`, 'reset')
        }
        return false
      }
    } else {
      log(`   ❌ Status: ${response.status} ${response.statusText}`, 'red')
      log(`   ❌ Erreur: ${data.error || 'Erreur inconnue'}`, 'red')
      return false
    }
  } catch (error) {
    log(`   ❌ Exception: ${error.message}`, 'red')
    return false
  }
}

async function checkCredentials() {
  section('1️⃣  VÉRIFICATION DES CREDENTIALS')

  const checks = [
    {
      name: 'Google Analytics Service Account',
      env: 'GA_SERVICE_ACCOUNT_JSON',
      required: true
    },
    {
      name: 'Google Analytics Property ID',
      env: 'GA_PROPERTY_ID',
      required: true
    },
    {
      name: 'Semrush API Key',
      env: 'SEMRUSH_API_KEY',
      required: true
    },
    {
      name: 'Admin Password',
      env: 'ADMIN_PASSWORD',
      required: true
    }
  ]

  let allGood = true

  for (const check of checks) {
    const value = process.env[check.env]
    const status = value ? '✅' : (check.required ? '❌' : '⚠️')
    const statusText = value ? 'CONFIGURÉ' : (check.required ? 'MANQUANT' : 'OPTIONNEL')

    log(`${status} ${check.name}: ${statusText}`, value ? 'green' : 'red')

    if (!value && check.required) {
      allGood = false
    }
  }

  return allGood
}

async function testGoogleSearchConsole() {
  section('2️⃣  TEST GOOGLE SEARCH CONSOLE')

  // Test collection
  const collectResult = await testAPI(
    'Google Search Console',
    '/api/seo/collect/gsc',
    'POST',
    { date: getYesterday() }
  )

  if (!collectResult) {
    return false
  }

  // Test récupération
  log('\n🔍 Test récupération données GSC...', 'blue')
  const getResult = await testAPI(
    'Google Search Console (GET)',
    `/api/seo/collect/gsc?startDate=${get7DaysAgo()}&endDate=${getYesterday()}`,
    'GET'
  )

  return collectResult && getResult
}

async function testGoogleAnalytics4() {
  section('3️⃣  TEST GOOGLE ANALYTICS 4')

  // Test collection
  const collectResult = await testAPI(
    'Google Analytics 4',
    '/api/seo/collect/ga4',
    'POST',
    { date: getYesterday() }
  )

  if (!collectResult) {
    return false
  }

  // Test récupération
  log('\n🔍 Test récupération données GA4...', 'blue')
  const getResult = await testAPI(
    'Google Analytics 4 (GET)',
    `/api/seo/collect/ga4?startDate=${get7DaysAgo()}&endDate=${getYesterday()}`,
    'GET'
  )

  return collectResult && getResult
}

async function testSemrush() {
  section('4️⃣  TEST SEMRUSH')

  // Test collection
  const collectResult = await testAPI(
    'Semrush',
    '/api/seo/collect/semrush',
    'POST',
    { date: getYesterday() }
  )

  if (!collectResult) {
    return false
  }

  // Test récupération
  log('\n🔍 Test récupération données Semrush...', 'blue')
  const getResult = await testAPI(
    'Semrush (GET)',
    `/api/seo/collect/semrush?startDate=${get7DaysAgo()}&endDate=${getYesterday()}`,
    'GET'
  )

  return collectResult && getResult
}

async function checkDatabase() {
  section('5️⃣  VÉRIFICATION BASE DE DONNÉES')

  log('🔍 Vérification des tables Supabase...', 'blue')

  const tables = [
    'seo_gsc_metrics_daily',
    'seo_ga4_metrics_daily',
    'seo_semrush_domain_daily'
  ]

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let allGood = true

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        log(`❌ ${table}: ${error.message}`, 'red')
        allGood = false
      } else {
        log(`✅ ${table}: ${count} enregistrements`, 'green')
      }
    } catch (error) {
      log(`❌ ${table}: ${error.message}`, 'red')
      allGood = false
    }
  }

  return allGood
}

async function generateReport(results) {
  section('📊 RAPPORT FINAL')

  const total = Object.keys(results).length
  const passed = Object.values(results).filter(r => r).length
  const failed = total - passed

  log(`\nTests passés: ${passed}/${total}`, passed === total ? 'green' : 'yellow')
  log(`Tests échoués: ${failed}/${total}`, failed === 0 ? 'green' : 'red')

  console.log('\nDétails:')
  for (const [name, status] of Object.entries(results)) {
    log(`  ${status ? '✅' : '❌'} ${name}`, status ? 'green' : 'red')
  }

  if (passed === total) {
    log('\n🎉 TOUS LES TESTS SONT PASSÉS!', 'green')
    log('Toutes les intégrations SEO fonctionnent correctement.', 'green')
  } else {
    log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ', 'yellow')
    log('Veuillez vérifier les erreurs ci-dessus.', 'yellow')
  }
}

function getYesterday() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

function get7DaysAgo() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString().split('T')[0]
}

async function main() {
  log('\n' + '█'.repeat(60), 'cyan')
  log('   TEST DES MÉTRIQUES SEO - SOLUTION ARGENT RAPIDE', 'bright')
  log('█'.repeat(60) + '\n', 'cyan')

  log('Date du test: ' + new Date().toLocaleString('fr-CA'), 'reset')
  log('Environment: ' + (process.env.NODE_ENV || 'development'), 'reset')

  const results = {}

  // 1. Vérifier les credentials
  results['Credentials'] = await checkCredentials()

  if (!results['Credentials']) {
    log('\n❌ Credentials manquants - impossible de continuer', 'red')
    process.exit(1)
  }

  // 2. Test Google Search Console
  results['Google Search Console'] = await testGoogleSearchConsole()

  // 3. Test Google Analytics 4
  results['Google Analytics 4'] = await testGoogleAnalytics4()

  // 4. Test Semrush
  results['Semrush'] = await testSemrush()

  // 5. Vérifier la base de données
  results['Database'] = await checkDatabase()

  // 6. Générer le rapport
  await generateReport(results)

  // Exit code
  const allPassed = Object.values(results).every(r => r)
  process.exit(allPassed ? 0 : 1)
}

main().catch(error => {
  log('\n❌ ERREUR FATALE:', 'red')
  log(error.message, 'red')
  if (error.stack) {
    log('\nStack:', 'reset')
    console.log(error.stack)
  }
  process.exit(1)
})
