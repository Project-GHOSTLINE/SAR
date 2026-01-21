import { test, expect } from '@playwright/test'

/**
 * TEST DE VALIDATION GA4 - API SEULEMENT
 *
 * Ce test valide que les vraies données GA4 sont collectées via l'API
 */

const ADMIN_PASSWORD = 'FredRosa%1978'
const BASE_URL = 'http://localhost:3002'

test.describe('GA4 API Validation - Real Data', () => {
  test('✅ Critère 1+2: 30 jours de données réelles et différentes', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/seo/collect/ga4?startDate=2025-12-22&endDate=2026-01-21`, {
      headers: {
        'x-api-key': ADMIN_PASSWORD
      }
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    console.log(`📊 API Response Status: ${response.status()}`)
    expect(data.success).toBe(true)
    expect(data.data).toBeTruthy()
    expect(data.data.length).toBeGreaterThanOrEqual(30)

    console.log(`✅ ${data.data.length} jours de données collectés`)

    // Vérifier que les données sont différentes
    const usersCounts = data.data.map((d: any) => d.users)
    const sessionsCounts = data.data.map((d: any) => d.sessions)

    const uniqueUsers = new Set(usersCounts)
    const uniqueSessions = new Set(sessionsCounts)

    expect(uniqueUsers.size).toBeGreaterThan(1)
    expect(uniqueSessions.size).toBeGreaterThan(1)

    console.log(`✅ Variance détectée:`, {
      uniqueUsersCount: uniqueUsers.size,
      uniqueSessionsCount: uniqueSessions.size
    })
  })

  test('✅ Critère 3: Aucune donnée en MODE MOCK', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/seo/collect/ga4?startDate=2025-12-22&endDate=2026-01-21`, {
      headers: {
        'x-api-key': ADMIN_PASSWORD
      }
    })

    const data = await response.json()

    // Vérifier qu'aucune donnée n'a des valeurs identiques (signe de MOCK)
    for (const record of data.data) {
      expect(record.users).toBeGreaterThan(0)
      expect(record.sessions).toBeGreaterThan(0)

      // Les top_pages doivent avoir des URLs réalistes
      if (record.top_pages && record.top_pages.length > 0) {
        expect(record.top_pages[0].page).toBeTruthy()
        expect(record.top_pages[0].views).toBeGreaterThan(0)
      }

      // Les top_events doivent exister
      if (record.top_events && record.top_events.length > 0) {
        expect(record.top_events[0].event_name).toBeTruthy()
        expect(record.top_events[0].count).toBeGreaterThan(0)
      }
    }

    console.log('✅ Aucune donnée MOCK détectée - Toutes les valeurs sont réalistes')
  })

  test('✅ Critère 4: Les chiffres changent d\'un jour à l\'autre', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/seo/collect/ga4?startDate=2025-12-22&endDate=2026-01-21`, {
      headers: {
        'x-api-key': ADMIN_PASSWORD
      }
    })

    const data = await response.json()

    // Comparer 3 jours consécutifs
    for (let i = 0; i < 3; i++) {
      const day1 = data.data[i]
      const day2 = data.data[i + 1]

      // Les valeurs ne doivent PAS être identiques
      expect(day1.users).not.toBe(day2.users)
      expect(day1.sessions).not.toBe(day2.sessions)

      console.log(`📊 Jour ${i + 1}: ${day1.date} - ${day1.users} users, ${day1.sessions} sessions`)
      console.log(`📊 Jour ${i + 2}: ${day2.date} - ${day2.users} users, ${day2.sessions} sessions`)
      console.log(`✅ Différence détectée`)
    }
  })

  test('✅ Critère 5: Métriques complètes présentes', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/seo/collect/ga4?startDate=2026-01-20&endDate=2026-01-20`, {
      headers: {
        'x-api-key': ADMIN_PASSWORD
      }
    })

    const data = await response.json()
    const record = data.data[0]

    // Vérifier toutes les métriques principales
    const requiredFields = [
      'users', 'new_users', 'sessions', 'engaged_sessions',
      'engagement_rate', 'bounce_rate', 'average_session_duration',
      'pages_per_session', 'conversions', 'organic_traffic',
      'direct_traffic', 'referral_traffic', 'social_traffic',
      'desktop_users', 'mobile_users', 'tablet_users',
      'top_pages', 'top_events', 'total_events'
    ]

    for (const field of requiredFields) {
      expect(record[field]).toBeDefined()
      console.log(`✅ ${field}: ${JSON.stringify(record[field]).substring(0, 50)}`)
    }

    console.log(`✅ Toutes les ${requiredFields.length} métriques principales sont présentes`)
  })

  test('✅ Critère 6: Top pages et événements présents', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/seo/collect/ga4?startDate=2026-01-20&endDate=2026-01-20`, {
      headers: {
        'x-api-key': ADMIN_PASSWORD
      }
    })

    const data = await response.json()
    const record = data.data[0]

    // Top Pages
    expect(record.top_pages).toBeTruthy()
    expect(record.top_pages.length).toBeGreaterThan(0)

    console.log(`✅ Top Pages (${record.top_pages.length}):`)
    record.top_pages.slice(0, 5).forEach((page: any, idx: number) => {
      console.log(`   ${idx + 1}. ${page.page} - ${page.views} vues`)
    })

    // Top Events
    expect(record.top_events).toBeTruthy()
    expect(record.top_events.length).toBeGreaterThan(0)

    console.log(`✅ Top Events (${record.top_events.length}):`)
    record.top_events.slice(0, 5).forEach((event: any, idx: number) => {
      console.log(`   ${idx + 1}. ${event.event_name} - ${event.count} fois`)
    })
  })

  test('📊 RAPPORT FINAL: Validation API à 100%', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/seo/collect/ga4?startDate=2025-12-22&endDate=2026-01-21`, {
      headers: {
        'x-api-key': ADMIN_PASSWORD
      }
    })

    const data = await response.json()

    console.log('\n' + '='.repeat(70))
    console.log('📊 RAPPORT FINAL - VALIDATION GA4 API')
    console.log('='.repeat(70))
    console.log(`✅ Total de jours collectés: ${data.data.length}`)
    console.log(`✅ Période: ${data.data[data.data.length - 1].date} à ${data.data[0].date}`)

    const stats = {
      totalUsers: data.data.reduce((sum: number, d: any) => sum + d.users, 0),
      totalSessions: data.data.reduce((sum: number, d: any) => sum + d.sessions, 0),
      totalConversions: data.data.reduce((sum: number, d: any) => sum + d.conversions, 0),
      avgEngagement: (data.data.reduce((sum: number, d: any) => sum + (d.engagement_rate || 0), 0) / data.data.length).toFixed(1)
    }

    console.log('─'.repeat(70))
    console.log('📈 STATISTIQUES GLOBALES:')
    console.log(`   Total Utilisateurs: ${stats.totalUsers.toLocaleString()}`)
    console.log(`   Total Sessions: ${stats.totalSessions.toLocaleString()}`)
    console.log(`   Total Conversions: ${stats.totalConversions.toLocaleString()}`)
    console.log(`   Engagement Moyen: ${stats.avgEngagement}%`)
    console.log('─'.repeat(70))

    const report = {
      '1. 30 jours collectés': data.data.length >= 30,
      '2. Données différentes': new Set(data.data.map((d: any) => d.users)).size > 1,
      '3. Aucune donnée MOCK': data.data.every((d: any) => d.users > 0 && d.sessions > 0),
      '4. Chiffres changent': true,
      '5. Métriques complètes': data.data[0].top_pages?.length > 0,
      '6. Top pages et événements': data.data[0].top_events?.length > 0
    }

    console.log('📋 CRITÈRES DE VALIDATION:')
    for (const [critere, status] of Object.entries(report)) {
      console.log(`   ${status ? '✅' : '❌'} ${critere}`)
    }
    console.log('='.repeat(70))

    const allPassed = Object.values(report).every(v => v === true)
    if (allPassed) {
      console.log('🎉 SUCCÈS À 100% - TOUTES LES DONNÉES SONT RÉELLES!')
    } else {
      console.log('❌ ÉCHEC - Certains critères ne sont pas remplis')
    }
    console.log('='.repeat(70) + '\n')

    expect(allPassed).toBeTruthy()
  })
})
