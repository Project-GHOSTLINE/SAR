#!/usr/bin/env node

/**
 * Test Device Intelligence API
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const adminPassword = process.env.ADMIN_PASSWORD

async function testDeviceIntelligence() {
  console.log('🧪 Test Device Intelligence API\n')

  try {
    const url = `${baseUrl}/api/seo/device-intelligence?days=30`

    console.log(`📡 Fetching: ${url}`)
    console.log(`🔑 Admin Password: ${adminPassword ? '✅ Set' : '❌ Missing'}\n`)

    const response = await fetch(url, {
      headers: {
        'x-api-key': adminPassword
      }
    })

    console.log(`📊 Status: ${response.status} ${response.statusText}`)

    const data = await response.json()

    if (data.success) {
      console.log('\n✅ SUCCESS\n')

      console.log('📅 Période:')
      console.log(`   ${data.period.startDate} → ${data.period.endDate} (${data.period.days} jours)`)

      console.log('\n📱 Mobile-First Score:')
      console.log(`   ${data.metrics.mobileFirstScore}/100 ${
        data.metrics.mobileFirstScore >= 90 ? '✅ EXCELLENT' :
        data.metrics.mobileFirstScore >= 75 ? '✔️ BON' :
        data.metrics.mobileFirstScore >= 60 ? '⚠️ MOYEN' :
        '❌ CRITIQUE'
      }`)

      console.log('\n📍 Positions Moyennes:')
      console.log(`   📱 Mobile:  #${data.metrics.positionComparison.mobile.toFixed(1)}`)
      console.log(`   💻 Desktop: #${data.metrics.positionComparison.desktop.toFixed(1)}`)
      console.log(`   📊 Gap:     ${data.metrics.positionComparison.mobileAdvantage > 0 ? '+' : ''}${data.metrics.positionComparison.mobileAdvantage.toFixed(1)} ${
        data.metrics.positionComparison.mobileAdvantage > 0 ? '(✅ Mobile meilleur)' : '(⚠️ Desktop meilleur)'
      }`)

      console.log('\n👥 Répartition Trafic:')
      console.log(`   📱 Mobile:  ${data.metrics.trafficShare.mobile.toFixed(0)}% (${data.metrics.summary.totalClicks * data.metrics.trafficShare.mobile / 100 | 0} clics)`)
      console.log(`   💻 Desktop: ${data.metrics.trafficShare.desktop.toFixed(0)}% (${data.metrics.summary.totalClicks * data.metrics.trafficShare.desktop / 100 | 0} clics)`)
      console.log(`   📱 Tablet:  ${data.metrics.trafficShare.tablet.toFixed(0)}% (${data.metrics.summary.totalClicks * data.metrics.trafficShare.tablet / 100 | 0} clics)`)

      console.log('\n⚡ Performance PageSpeed:')
      console.log(`   📱 Mobile:  ${data.metrics.performance.mobile} ${data.metrics.performance.mobileClicksAtRisk > 0 ? `(⚠️ ${data.metrics.performance.mobileClicksAtRisk} clics à risque)` : ''}`)
      console.log(`   💻 Desktop: ${data.metrics.performance.desktop} ${data.metrics.performance.desktopClicksAtRisk > 0 ? `(⚠️ ${data.metrics.performance.desktopClicksAtRisk} clics à risque)` : ''}`)

      console.log('\n🎯 CTR Moyen:')
      console.log(`   📱 Mobile:  ${data.metrics.ctrComparison.mobile.toFixed(2)}%`)
      console.log(`   💻 Desktop: ${data.metrics.ctrComparison.desktop.toFixed(2)}%`)
      console.log(`   📊 Ratio:   ${data.metrics.ctrComparison.mobileDesktopRatio.toFixed(0)}% ${
        data.metrics.ctrComparison.mobileDesktopRatio >= 100 ? '(✅ Mobile meilleur)' : '(⚠️ Desktop meilleur)'
      }`)

      console.log('\n🔄 SEO Conversion (GSC → GA4):')
      console.log(`   📱 Mobile:  ${data.metrics.seoConversion.mobile.toFixed(1)}% ${data.metrics.seoConversion.mobile < 90 ? `(Perte: ${(100 - data.metrics.seoConversion.mobile).toFixed(1)}%)` : ''}`)
      console.log(`   💻 Desktop: ${data.metrics.seoConversion.desktop.toFixed(1)}% ${data.metrics.seoConversion.desktop < 90 ? `(Perte: ${(100 - data.metrics.seoConversion.desktop).toFixed(1)}%)` : ''}`)

      if (data.recommendations && data.recommendations.length > 0) {
        console.log(`\n💡 Recommandations (${data.recommendations.length}):`)
        data.recommendations.forEach((rec, i) => {
          const icon = rec.type === 'alert' ? '⚠️' : rec.type === 'warning' ? '⚡' : rec.type === 'success' ? '✅' : '💡'
          console.log(`   ${icon} [${rec.category}] ${rec.message}`)
        })
      }

      console.log('\n📊 Résumé Global:')
      console.log(`   Total Clics:       ${data.metrics.summary.totalClicks}`)
      console.log(`   Total Impressions: ${data.metrics.summary.totalImpressions}`)
      console.log(`   CTR Global:        ${data.metrics.summary.overallCTR.toFixed(2)}%`)
      console.log(`   Device Dominant:   ${data.metrics.summary.dominantDevice}`)

    } else {
      console.log('\n❌ ERROR')
      console.log(data)
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
  }
}

testDeviceIntelligence()
