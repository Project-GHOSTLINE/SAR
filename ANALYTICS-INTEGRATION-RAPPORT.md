# 📊 Rapport d'Intégration Analytics - SAR

**Date**: 13 janvier 2026
**Analysé par**: Claude Sonnet 4.5

---

## 🔍 État Actuel

### ✅ Ce qui est en place:
1. **CSP (Content Security Policy)** autorise Google Analytics
   - `https://www.google-analytics.com` dans `connect-src`
   - `https://www.googletagmanager.com` dans `script-src`

2. **Politique de cookies** mentionne Google Analytics
   - Cookie `_ga` (2 ans)
   - Cookie `_gid` (24 heures)
   - Documentation utilisateur conforme RGPD

3. **Axeptio** pour le consentement cookies
   - Bandeau de consentement
   - Gestion des préférences utilisateur

### ❌ Ce qui manque:
1. **Aucun code de tracking Google Analytics installé**
   - Pas de gtag.js dans le layout
   - Pas de Google Tag Manager
   - Pas de Measurement ID configuré

2. **Aucune variable d'environnement Analytics**
   - Pas de `NEXT_PUBLIC_GA_ID`
   - Pas de clés API configurées

3. **Aucun appel API Analytics Data**
   - Pas d'intégration backend pour récupérer les données

---

## 🎯 Google Analytics 4 (GA4) - Possibilités

### 📊 Métriques Device Disponibles via API

Google Analytics 4 Data API permet de récupérer **TOUTES** ces métriques par device:

#### 1. **Informations Device**
```javascript
{
  deviceCategory: 'mobile' | 'desktop' | 'tablet',
  operatingSystem: 'iOS', 'Android', 'Windows', 'macOS', 'Linux',
  operatingSystemVersion: '15.2', '11', etc.,
  browser: 'Chrome', 'Safari', 'Firefox', 'Edge',
  browserVersion: '120.0.6099.109',
  screenResolution: '1920x1080', '375x667',
  mobileDeviceBranding: 'Apple', 'Samsung', 'Google',
  mobileDeviceModel: 'iPhone 13', 'Galaxy S21',
  platform: 'web', 'iOS app', 'Android app'
}
```

#### 2. **Métriques de Session**
```javascript
{
  sessions: 1234,                    // Nombre de sessions
  totalUsers: 890,                   // Utilisateurs uniques
  newUsers: 567,                     // Nouveaux utilisateurs
  activeUsers: 345,                  // Utilisateurs actifs
  engagementRate: 0.75,              // Taux d'engagement
  averageSessionDuration: 180,       // Durée moyenne (secondes)
  bounceRate: 0.45,                  // Taux de rebond
  sessionsPerUser: 1.5               // Sessions par utilisateur
}
```

#### 3. **Métriques de Navigation**
```javascript
{
  pageViews: 5678,                   // Pages vues
  screenPageViews: 5678,             // Vues d'écran
  uniquePageViews: 4321,             // Vues uniques
  timeOnPage: 120,                   // Temps sur page
  scrollDepth: 0.75,                 // Profondeur de scroll
  exitRate: 0.35                     // Taux de sortie
}
```

#### 4. **Géolocalisation**
```javascript
{
  country: 'Canada',
  region: 'Quebec',
  city: 'Montreal',
  latitude: 45.5017,
  longitude: -73.5673,
  continentId: '019',
  subContinent: 'Northern America'
}
```

#### 5. **Acquisition & Trafic**
```javascript
{
  sessionSource: 'google', 'direct', 'facebook',
  sessionMedium: 'organic', 'cpc', 'referral',
  sessionCampaignName: 'summer-promo',
  firstUserSource: 'google',
  firstUserMedium: 'organic',
  landingPage: '/demande-de-pret-en-ligne-formulaire'
}
```

#### 6. **Événements & Conversions**
```javascript
{
  eventCount: 234,                   // Nombre d'événements
  eventName: 'form_submit', 'click', 'scroll',
  eventValue: 100,                   // Valeur de l'événement
  conversions: 45,                   // Conversions
  totalRevenue: 12500.00            // Revenu total
}
```

#### 7. **Comportement Utilisateur**
```javascript
{
  userEngagementDuration: 450,      // Temps d'engagement
  engagedSessions: 890,             // Sessions engagées
  eventCountPerSession: 12.5,       // Événements par session
  eventsPerSessionPerUser: 15.3,    // Événements par session/user
  sessionKeyEventRate: 0.12         // Taux d'événements clés
}
```

---

## 🚀 Implémentation Complète

### Étape 1: Configuration Google Analytics 4

#### A. Créer une propriété GA4
1. Aller sur https://analytics.google.com
2. Créer une propriété GA4 pour "Solution Argent Rapide"
3. Obtenir le **Measurement ID** (format: `G-XXXXXXXXXX`)

#### B. Activer Google Analytics Data API
1. Aller sur https://console.cloud.google.com
2. Activer "Google Analytics Data API"
3. Créer des credentials (Service Account)
4. Télécharger le fichier JSON des credentials

### Étape 2: Variables d'Environnement

Ajouter dans `.env.local`:
```bash
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Analytics Data API (backend)
GA_PROPERTY_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Ou directement le JSON
GA_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

### Étape 3: Installation des Packages

```bash
npm install @analytics/google-analytics
npm install @google-analytics/data
npm install react-ga4
```

### Étape 4: Code de Tracking (Frontend)

Créer `/src/components/GoogleAnalytics.tsx`:

```typescript
'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  useEffect(() => {
    if (!GA_ID) return

    // Track page views
    window.gtag('config', GA_ID, {
      page_path: pathname + searchParams.toString()
    })
  }, [pathname, searchParams, GA_ID])

  if (!GA_ID) return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
              send_page_view: false
            });
          `
        }}
      />
    </>
  )
}
```

Ajouter dans `/src/app/layout.tsx`:
```typescript
import GoogleAnalytics from '@/components/GoogleAnalytics'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}
```

### Étape 5: Tracking d'Événements Personnalisés

Créer `/src/lib/analytics.ts`:

```typescript
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams)
  }
}

// Exemples d'utilisation
export const trackFormSubmit = (formName: string) => {
  trackEvent('form_submit', {
    form_name: formName,
    form_destination: window.location.pathname
  })
}

export const trackButtonClick = (buttonName: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    page_location: window.location.href
  })
}

export const trackConversion = (amount: number) => {
  trackEvent('conversion', {
    value: amount,
    currency: 'CAD'
  })
}
```

### Étape 6: API Backend pour Récupérer les Données

Créer `/src/app/api/admin/analytics/route.ts`:

```typescript
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { NextResponse } from 'next/server'

const propertyId = process.env.GA_PROPERTY_ID!

// Initialize client with service account
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON!)
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || '7daysAgo'
  const endDate = searchParams.get('endDate') || 'today'

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate
        }
      ],
      dimensions: [
        { name: 'deviceCategory' },
        { name: 'operatingSystem' },
        { name: 'browser' },
        { name: 'country' },
        { name: 'city' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' },
        { name: 'totalRevenue' }
      ]
    })

    // Transform data
    const data = response.rows?.map(row => ({
      device: {
        category: row.dimensionValues?.[0]?.value,
        os: row.dimensionValues?.[1]?.value,
        browser: row.dimensionValues?.[2]?.value
      },
      location: {
        country: row.dimensionValues?.[3]?.value,
        city: row.dimensionValues?.[4]?.value
      },
      source: {
        source: row.dimensionValues?.[5]?.value,
        medium: row.dimensionValues?.[6]?.value
      },
      metrics: {
        activeUsers: parseInt(row.metricValues?.[0]?.value || '0'),
        sessions: parseInt(row.metricValues?.[1]?.value || '0'),
        pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
        avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || '0'),
        bounceRate: parseFloat(row.metricValues?.[4]?.value || '0'),
        conversions: parseInt(row.metricValues?.[5]?.value || '0'),
        revenue: parseFloat(row.metricValues?.[6]?.value || '0')
      }
    }))

    return NextResponse.json({
      success: true,
      data,
      totalRows: response.rowCount
    })

  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
```

### Étape 7: Dashboard Analytics Admin

Créer `/src/components/admin/AnalyticsDashboard.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Tablet, Globe, TrendingUp } from 'lucide-react'

interface AnalyticsData {
  device: { category: string; os: string; browser: string }
  location: { country: string; city: string }
  source: { source: string; medium: string }
  metrics: {
    activeUsers: number
    sessions: number
    pageViews: number
    avgSessionDuration: number
    bounceRate: number
    conversions: number
    revenue: number
  }
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7daysAgo')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/analytics?startDate=${dateRange}&endDate=today`)
      const result = await res.json()
      setData(result.data || [])
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group by device
  const deviceStats = data.reduce((acc, item) => {
    const category = item.device.category
    if (!acc[category]) {
      acc[category] = {
        users: 0,
        sessions: 0,
        pageViews: 0
      }
    }
    acc[category].users += item.metrics.activeUsers
    acc[category].sessions += item.metrics.sessions
    acc[category].pageViews += item.metrics.pageViews
    return acc
  }, {} as Record<string, any>)

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics - Données en Temps Réel</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="today">Aujourd'hui</option>
          <option value="yesterday">Hier</option>
          <option value="7daysAgo">7 derniers jours</option>
          <option value="30daysAgo">30 derniers jours</option>
          <option value="90daysAgo">90 derniers jours</option>
        </select>
      </div>

      {/* Device Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(deviceStats).map(([device, stats]: [string, any]) => (
          <div key={device} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              {device === 'mobile' && <Smartphone className="w-8 h-8 text-blue-600" />}
              {device === 'desktop' && <Monitor className="w-8 h-8 text-green-600" />}
              {device === 'tablet' && <Tablet className="w-8 h-8 text-purple-600" />}
              <h3 className="text-lg font-semibold capitalize">{device}</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Utilisateurs: <span className="font-bold">{stats.users}</span></p>
              <p className="text-sm text-gray-600">Sessions: <span className="font-bold">{stats.sessions}</span></p>
              <p className="text-sm text-gray-600">Pages vues: <span className="font-bold">{stats.pageViews}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Device</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">OS / Browser</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Users</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Sessions</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Conversions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                      {row.device.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.device.os} / {row.device.browser}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.location.city}, {row.location.country}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.source.source} / {row.source.medium}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {row.metrics.activeUsers}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {row.metrics.sessions}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">
                    {row.metrics.conversions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

---

## 💰 Coûts

- **Google Analytics 4**: **GRATUIT** jusqu'à 10M événements/mois
- **Google Analytics Data API**: **GRATUIT** jusqu'à 50K requêtes/jour

Pour SAR, ce sera **100% gratuit**.

---

## 📋 Checklist d'Implémentation

### Phase 1: Setup Initial (30 min)
- [ ] Créer propriété GA4
- [ ] Obtenir Measurement ID
- [ ] Ajouter variables d'environnement
- [ ] Installer packages npm

### Phase 2: Tracking Frontend (1h)
- [ ] Implémenter GoogleAnalytics component
- [ ] Ajouter au layout principal
- [ ] Tester sur localhost
- [ ] Vérifier dans GA4 Real-Time

### Phase 3: Événements Personnalisés (2h)
- [ ] Créer lib/analytics.ts
- [ ] Tracker soumission formulaire prêt
- [ ] Tracker clics boutons importants
- [ ] Tracker conversions
- [ ] Tracker scroll et engagement

### Phase 4: API Backend (2h)
- [ ] Activer Google Analytics Data API
- [ ] Créer Service Account
- [ ] Implémenter /api/admin/analytics
- [ ] Tester récupération données

### Phase 5: Dashboard Admin (3h)
- [ ] Créer AnalyticsDashboard component
- [ ] Ajouter section dans admin menu
- [ ] Implémenter graphiques
- [ ] Tester données réelles

---

## 🎯 Résultat Final

Avec cette implémentation, tu auras:

✅ **Tracking automatique** de TOUS les visiteurs
✅ **Données complètes** sur chaque device (OS, browser, résolution, etc.)
✅ **Géolocalisation** précise (ville, pays)
✅ **Source de trafic** (Google, Facebook, direct, etc.)
✅ **Conversions** et revenus trackés
✅ **API backend** pour récupérer les données dans ton admin
✅ **Dashboard admin** avec métriques en temps réel
✅ **Conformité RGPD** avec Axeptio

---

## 🚨 Important - RGPD

Avec Axeptio déjà installé, tu dois:

1. **Attendre le consentement** avant d'initialiser GA
2. **Anonymiser les IPs** (GA4 le fait par défaut)
3. **Permettre l'opt-out** (Axeptio le gère)

Modifier GoogleAnalytics.tsx pour respecter le consentement:

```typescript
useEffect(() => {
  // Attendre le consentement Axeptio
  if (typeof window !== 'undefined' && window.axeptioSettings) {
    window._axcb = window._axcb || []
    window._axcb.push((axeptio: any) => {
      axeptio.on('cookies:complete', (choices: any) => {
        if (choices.google_analytics) {
          // User a consenti, initialiser GA
          initializeGA()
        }
      })
    })
  }
}, [])
```

---

## 📞 Prochaine Étape

Tu veux que je commence l'implémentation?

Je peux:
1. **Setup complet GA4** avec tracking frontend
2. **Implémenter l'API backend** pour récupérer les données
3. **Créer un dashboard Analytics** dans l'admin

Dis-moi par où commencer! 🚀
