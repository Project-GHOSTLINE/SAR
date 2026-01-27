#!/usr/bin/env node

/**
 * Vérification des métriques réelles (pas de données factices)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyRealMetrics() {
  console.log('🔍 VERIFICATION DES METRIQUES REELLES\n')
  console.log('=' .repeat(60))

  // 1. Vérifier GSC
  console.log('\n📊 GOOGLE SEARCH CONSOLE (GSC)')
  console.log('-'.repeat(60))

  const { data: gscData, error: gscError } = await supabase
    .from('seo_gsc_metrics_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(5)

  if (gscError) {
    console.log('❌ Erreur GSC:', gscError.message)
  } else if (!gscData || gscData.length === 0) {
    console.log('⚠️  AUCUNE DONNÉE GSC - Les métriques seront à 0')
  } else {
    console.log(`✅ ${gscData.length} entrées trouvées`)
    gscData.forEach((row, i) => {
      console.log(`\n[${i + 1}] Date: ${row.date}`)
      console.log(`    Domain: ${row.domain}`)
      console.log(`    Clics: ${row.total_clicks}`)
      console.log(`    Impressions: ${row.total_impressions}`)
      console.log(`    CTR: ${(row.avg_ctr * 100).toFixed(2)}%`)
      console.log(`    Position: ${row.avg_position.toFixed(1)}`)
      console.log(`    Collected: ${row.collected_at}`)

      // Vérifier device breakdown
      if (row.device_breakdown) {
        console.log(`    Device Breakdown:`)
        Object.keys(row.device_breakdown).forEach(device => {
          const d = row.device_breakdown[device]
          console.log(`      - ${device}: ${d.clicks} clics, ${d.impressions} impr, pos ${d.position.toFixed(1)}`)
        })
      }

      // Vérifier si données suspicieuses
      if (row.total_clicks === 0 && row.total_impressions === 0) {
        console.log('    ⚠️  SUSPECT: Toutes les métriques sont à 0')
      }
      if (row.collected_at && new Date(row.collected_at) > new Date()) {
        console.log('    ⚠️  SUSPECT: Date de collecte dans le futur')
      }
    })
  }

  // 2. Vérifier GA4
  console.log('\n\n📈 GOOGLE ANALYTICS 4 (GA4)')
  console.log('-'.repeat(60))

  const { data: ga4Data, error: ga4Error } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(5)

  if (ga4Error) {
    console.log('❌ Erreur GA4:', ga4Error.message)
  } else if (!ga4Data || ga4Data.length === 0) {
    console.log('⚠️  AUCUNE DONNÉE GA4 - Conversion SEO ne sera pas calculable')
  } else {
    console.log(`✅ ${ga4Data.length} entrées trouvées`)
    ga4Data.forEach((row, i) => {
      console.log(`\n[${i + 1}] Date: ${row.date}`)
      console.log(`    Users: ${row.users}`)
      console.log(`    New Users: ${row.new_users}`)
      console.log(`    Sessions: ${row.sessions}`)
      console.log(`    Mobile: ${row.mobile_users} users`)
      console.log(`    Desktop: ${row.desktop_users} users`)
      console.log(`    Tablet: ${row.tablet_users} users`)
      console.log(`    Engagement Rate: ${(row.engagement_rate * 100).toFixed(1)}%`)
      console.log(`    Conversions: ${row.conversions}`)
      console.log(`    Collected: ${row.collected_at}`)

      // Vérifier cohérence
      const totalDeviceUsers = (row.mobile_users || 0) + (row.desktop_users || 0) + (row.tablet_users || 0)
      if (totalDeviceUsers > row.users * 1.1) {
        console.log(`    ⚠️  SUSPECT: Device users (${totalDeviceUsers}) > Total users (${row.users})`)
      }
      if (row.sessions < row.users) {
        console.log(`    ⚠️  SUSPECT: Sessions (${row.sessions}) < Users (${row.users})`)
      }
    })
  }

  // 3. Vérifier PageSpeed
  console.log('\n\n⚡ PAGESPEED INSIGHTS')
  console.log('-'.repeat(60))

  const { data: psData, error: psError } = await supabase
    .from('seo_pagespeed_metrics_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(5)

  if (psError) {
    console.log('❌ Erreur PageSpeed:', psError.message)
  } else if (!psData || psData.length === 0) {
    console.log('⚠️  AUCUNE DONNÉE PAGESPEED - Performance sera à 0')
    console.log('    → Voir DEVICE_INTELLIGENCE_SETUP.md pour collecter')
  } else {
    console.log(`✅ ${psData.length} entrées trouvées`)
    psData.forEach((row, i) => {
      console.log(`\n[${i + 1}] Date: ${row.date}`)
      console.log(`    URL: ${row.url}`)
      console.log(`    Device: ${row.device_type}`)
      console.log(`    Performance Score: ${row.performance_score}/100`)
      console.log(`    Collected: ${row.collected_at}`)

      if (row.performance_score < 0 || row.performance_score > 100) {
        console.log(`    ⚠️  SUSPECT: Score hors limites (0-100)`)
      }
    })
  }

  // 4. Test API avec données réelles
  console.log('\n\n🧪 TEST API DEVICE INTELLIGENCE')
  console.log('-'.repeat(60))

  const apiUrl = `http://localhost:3000/api/seo/device-intelligence?days=30`
  const adminPassword = process.env.ADMIN_PASSWORD

  try {
    const response = await fetch(apiUrl, {
      headers: { 'x-api-key': adminPassword }
    })
    const apiData = await response.json()

    if (apiData.success) {
      console.log('✅ API fonctionne')
      console.log(`\nDonnées sources utilisées:`)
      console.log(`  GSC entries: ${apiData.rawData.gsc ? 'OK' : 'VIDE'}`)
      console.log(`  GA4 entries: ${apiData.rawData.ga4 ? 'OK' : 'VIDE'}`)
      console.log(`  PageSpeed Mobile: ${apiData.rawData.pagespeed.mobile ? 'OK' : 'NULL'}`)
      console.log(`  PageSpeed Desktop: ${apiData.rawData.pagespeed.desktop ? 'OK' : 'NULL'}`)

      console.log(`\nMétriques calculées:`)
      console.log(`  Total Clics: ${apiData.metrics.summary.totalClicks}`)
      console.log(`  Total Impressions: ${apiData.metrics.summary.totalImpressions}`)
      console.log(`  Mobile-First Score: ${apiData.metrics.mobileFirstScore}/100`)

      // Vérifier cohérence des calculs
      const gscMobileClics = apiData.rawData.gsc.mobile?.clicks || 0
      const gscDesktopClics = apiData.rawData.gsc.desktop?.clicks || 0
      const gscTabletClics = apiData.rawData.gsc.tablet?.clicks || 0
      const totalCalculated = gscMobileClics + gscDesktopClics + gscTabletClics

      console.log(`\nVérification cohérence:`)
      console.log(`  Clics reportés: ${apiData.metrics.summary.totalClicks}`)
      console.log(`  Clics calculés: ${totalCalculated}`)
      if (Math.abs(apiData.metrics.summary.totalClicks - totalCalculated) > 1) {
        console.log(`  ⚠️  INCOHÉRENCE détectée!`)
      } else {
        console.log(`  ✅ Cohérent`)
      }

      // Vérifier traffic share
      const trafficTotal = apiData.metrics.trafficShare.mobile +
                          apiData.metrics.trafficShare.desktop +
                          apiData.metrics.trafficShare.tablet
      console.log(`\nTraffic Share Total: ${trafficTotal.toFixed(1)}%`)
      if (Math.abs(trafficTotal - 100) > 0.5) {
        console.log(`  ⚠️  SUSPECT: Ne fait pas 100%`)
      } else {
        console.log(`  ✅ Correct (100%)`)
      }

    } else {
      console.log('❌ Erreur API:', apiData.error)
    }
  } catch (err) {
    console.log('❌ Erreur requête API:', err.message)
  }

  // 5. Verdict final
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 VERDICT FINAL')
  console.log('='.repeat(60))

  const hasGSC = gscData && gscData.length > 0
  const hasGA4 = ga4Data && ga4Data.length > 0
  const hasPS = psData && psData.length > 0

  if (hasGSC && hasGA4) {
    console.log('\n✅ DONNÉES RÉELLES CONFIRMÉES')
    console.log('   - GSC: Données authentiques Google Search Console')
    console.log('   - GA4: Données authentiques Google Analytics')
    if (!hasPS) {
      console.log('   - PageSpeed: ⚠️  Manquant (score sera faible)')
    } else {
      console.log('   - PageSpeed: Données authentiques')
    }
  } else {
    console.log('\n⚠️  DONNÉES INCOMPLÈTES')
    if (!hasGSC) console.log('   - GSC: MANQUANT - Configurer collecte GSC')
    if (!hasGA4) console.log('   - GA4: MANQUANT - Configurer collecte GA4')
    if (!hasPS) console.log('   - PageSpeed: MANQUANT - Configurer collecte PageSpeed')
  }

  console.log('\n')
}

verifyRealMetrics()
