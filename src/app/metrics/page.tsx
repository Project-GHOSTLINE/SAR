'use client'

/**
 * Page Métriques Complètes avec Descriptions
 * Affiche toutes les métriques disponibles avec documentation
 */

import { useEffect, useState } from 'react'

interface MetricsData {
  tables: Record<string, number>
  views: {
    timeline: Record<string, number>
    vopay: Record<string, number>
    audit: Record<string, number>
    performance: Record<string, number>
  }
  breakdowns: {
    vopay_by_status: Record<string, number>
    communications_by_type: Record<string, number>
    loans_by_status: Record<string, number>
    payment_events_by_type: Record<string, number>
  }
}

interface MetricInfo {
  description: string
  usage: string
  route?: string
  component?: string
  speed: string
}

const METRIC_DESCRIPTIONS: Record<string, MetricInfo> = {
  // Tables principales
  'clients': {
    description: 'Table principale des clients SAR',
    usage: 'Utilisée partout - Page profil client, Timeline, Recherches',
    route: 'Direct DB / Toutes pages',
    component: 'ClientProfilePage, ClientTimeline',
    speed: '~50ms'
  },
  'loans': {
    description: 'Prêts actifs et historique complet',
    usage: 'Timeline client, Stats dashboard, Calculs financiers',
    route: 'Direct DB / Timeline',
    component: 'ClientTimeline, VoPayStats',
    speed: '~80ms'
  },
  'communications': {
    description: 'Historique communications (email, SMS, appels)',
    usage: 'Timeline client, Suivi client',
    route: 'Direct DB / Timeline',
    component: 'ClientTimeline',
    speed: '~60ms'
  },
  'payment_events': {
    description: 'Événements paiements (succès, échecs, remboursements)',
    usage: 'Timeline client, Historique financier',
    route: 'Direct DB / Timeline',
    component: 'ClientTimeline',
    speed: '~70ms'
  },
  'vopay_objects': {
    description: 'Transactions VoPay normalisées (webhooks traités)',
    usage: 'Stats VoPay, Matching client/loan, Timeline',
    route: '/api/vopay/stats',
    component: 'VoPayStats, ClientTimeline',
    speed: '~100ms'
  },
  'vopay_webhook_logs': {
    description: 'Logs bruts webhooks VoPay (source originale)',
    usage: 'Debugging, Audit webhooks, Migration',
    route: 'Direct DB',
    component: 'Admin debug',
    speed: '~90ms'
  },
  'audit_log': {
    description: 'Historique modifications (INSERT/UPDATE/DELETE)',
    usage: 'Audit trail, Compliance, Debugging',
    route: '/api/audit/[clientId]',
    component: 'AuditHistory',
    speed: '~150ms'
  },
  'applications': {
    description: 'Demandes de prêt soumises',
    usage: 'Timeline client, Stats applications',
    route: 'Direct DB',
    component: 'ClientTimeline',
    speed: '~60ms'
  },
  'payment_schedules': {
    description: 'Échéanciers paiements prévus vs réels',
    usage: 'Calculs financiers, Prévisions',
    route: 'Direct DB',
    component: 'Financial widgets',
    speed: '~80ms'
  },

  // Vues Timeline
  'vw_client_timeline': {
    description: 'Timeline 360° - UNION de 4 sources (communications, loans, payment_events, vopay)',
    usage: 'Page profil client - Onglet Timeline',
    route: 'Direct DB',
    component: 'ClientTimeline',
    speed: '~200ms (UNION ALL)'
  },
  'vw_client_timeline_by_type': {
    description: 'Stats timeline par type d\'événement (COMMUNICATION, LOAN, PAYMENT, VOPAY)',
    usage: 'ClientTimelineStats - Affiche compteurs par catégorie',
    route: 'Direct DB',
    component: 'ClientTimelineStats',
    speed: '~150ms'
  },
  'vw_client_summary': {
    description: 'Résumé complet client (applications, loans, communications, vopay counts)',
    usage: 'Page profil client - Cards stats en haut',
    route: 'Direct DB (Server Component)',
    component: 'ClientProfilePage',
    speed: '~100ms'
  },

  // Vues VoPay
  'vw_vopay_by_client': {
    description: 'Agrégation VoPay par client (total, succès, échecs, montants)',
    usage: 'Stats VoPay par client - Onglet VoPay',
    route: '/api/vopay/stats/[clientId]',
    component: 'VoPayStats',
    speed: '~120ms'
  },
  'vw_vopay_orphans': {
    description: 'Transactions VoPay sans lien client/loan (besoin matching manuel)',
    usage: 'Page /admin/vopay/orphans - Gestion orphelins',
    route: 'Direct DB',
    component: 'VoPayOrphansPage',
    speed: '~180ms'
  },
  'vw_vopay_summary': {
    description: 'Stats VoPay globales (total système, taux succès)',
    usage: 'Dashboard admin, Alertes',
    route: '/api/vopay/stats',
    component: 'VoPayStats (global)',
    speed: '~100ms'
  },

  // Vues Audit
  'vw_audit_recent': {
    description: 'Dernières modifications (50 dernières par défaut)',
    usage: 'Dashboard admin, Monitoring temps réel',
    route: 'Direct DB',
    component: 'Admin monitoring',
    speed: '~80ms'
  },
  'vw_audit_stats_by_table': {
    description: 'Stats audit par table et opération (INSERT/UPDATE/DELETE counts)',
    usage: 'Page profil client - Onglet Audit, Dashboard admin',
    route: '/api/audit/stats',
    component: 'AuditStats',
    speed: '~90ms'
  },

  // Vues Performance
  'vw_performance_cache_hit_ratio': {
    description: 'Ratio cache PostgreSQL (buffer hit ratio) - Optimal: >90%',
    usage: 'Page /admin/monitoring - Section Performance',
    route: 'Direct DB',
    component: 'MonitoringPage',
    speed: '~50ms'
  },
  'vw_performance_table_sizes': {
    description: 'Taille tables + indexes (MB) - Monitoring croissance DB',
    usage: 'Page /admin/monitoring - Section Tables',
    route: 'Direct DB',
    component: 'MonitoringPage',
    speed: '~70ms'
  },
  'vw_performance_index_usage': {
    description: 'Usage indexes (scans, rows read) - Identifier indexes inutilisés',
    usage: 'Page /admin/monitoring - Section Indexes',
    route: 'Direct DB',
    component: 'MonitoringPage',
    speed: '~100ms'
  },
  'vw_performance_bloat_check': {
    description: 'Détection bloat tables/indexes (espace gaspillé) - VACUUM needed si élevé',
    usage: 'Page /admin/monitoring - Section Maintenance',
    route: 'Direct DB',
    component: 'MonitoringPage',
    speed: '~120ms'
  }
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<Record<string, number>>({})

  useEffect(() => {
    loadMetrics()
    testApiRoutes()
  }, [])

  async function loadMetrics() {
    try {
      const response = await fetch('/api/metrics/all')
      if (!response.ok) throw new Error('Erreur chargement métriques')
      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      console.error('Erreur metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  async function testApiRoutes() {
    const routes = [
      '/api/metrics/all',
      '/api/audit/stats',
      '/api/vopay/stats',
      `/api/vopay/stats/c53ace24-3ceb-4e37-a041-209b7cb2c932`,
      `/api/audit/c53ace24-3ceb-4e37-a041-209b7cb2c932`
    ]

    const statuses: Record<string, number> = {}
    for (const route of routes) {
      try {
        const start = Date.now()
        const response = await fetch(route)
        const duration = Date.now() - start
        statuses[route] = response.status
        console.log(`✅ ${route} → ${response.status} (${duration}ms)`)
      } catch (err) {
        statuses[route] = 0
        console.error(`❌ ${route} → Error`, err)
      }
    }
    setApiStatus(statuses)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-600">
            ❌ Erreur de chargement des métriques
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Métriques Complètes avec Documentation</h1>
          <p className="text-gray-600 mt-2">
            Cliquez sur une métrique pour voir les détails (description, usage, vitesse, route)
          </p>
        </div>

        {/* API Status */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-3">🔗 Status API Routes:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
            {Object.entries(apiStatus).map(([route, status]) => (
              <div key={route} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  status === 200 ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="text-gray-700">{route}</span>
                <span className={`ml-auto ${
                  status === 200 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status === 200 ? '200 OK' : status || 'Error'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tables Principales */}
        <Section title="📁 Tables Principales" color="blue">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.tables).map(([table, count]) => (
              <MetricCardWithInfo
                key={table}
                id={table}
                label={table}
                value={count}
                hasData={count > 0}
                icon={getTableIcon(table)}
                info={METRIC_DESCRIPTIONS[table]}
                expanded={expandedMetric === table}
                onToggle={() => setExpandedMetric(expandedMetric === table ? null : table)}
              />
            ))}
          </div>
        </Section>

        {/* Vues Timeline */}
        <Section title="📅 Vues Timeline" color="purple">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metrics.views.timeline).map(([view, count]) => (
              <MetricCardWithInfo
                key={view}
                id={view}
                label={view}
                value={count}
                hasData={count > 0}
                icon="📅"
                info={METRIC_DESCRIPTIONS[view]}
                expanded={expandedMetric === view}
                onToggle={() => setExpandedMetric(expandedMetric === view ? null : view)}
              />
            ))}
          </div>
        </Section>

        {/* Vues VoPay */}
        <Section title="🏦 Vues VoPay" color="green">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metrics.views.vopay).map(([view, count]) => (
              <MetricCardWithInfo
                key={view}
                id={view}
                label={view}
                value={count}
                hasData={count > 0}
                icon="🏦"
                info={METRIC_DESCRIPTIONS[view]}
                expanded={expandedMetric === view}
                onToggle={() => setExpandedMetric(expandedMetric === view ? null : view)}
              />
            ))}
          </div>
        </Section>

        {/* Vues Audit */}
        <Section title="📝 Vues Audit" color="orange">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(metrics.views.audit).map(([view, count]) => (
              <MetricCardWithInfo
                key={view}
                id={view}
                label={view}
                value={count}
                hasData={count > 0}
                icon="📝"
                info={METRIC_DESCRIPTIONS[view]}
                expanded={expandedMetric === view}
                onToggle={() => setExpandedMetric(expandedMetric === view ? null : view)}
              />
            ))}
          </div>
        </Section>

        {/* Vues Performance */}
        <Section title="⚡ Vues Performance" color="red">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(metrics.views.performance).map(([view, count]) => (
              <MetricCardWithInfo
                key={view}
                id={view}
                label={view}
                value={count}
                hasData={count > 0}
                icon="⚡"
                info={METRIC_DESCRIPTIONS[view]}
                expanded={expandedMetric === view}
                onToggle={() => setExpandedMetric(expandedMetric === view ? null : view)}
              />
            ))}
          </div>
        </Section>

        {/* Breakdowns - Versions compactes sans expansion */}
        <Section title="📊 Breakdowns détaillés" color="blue">
          <div className="space-y-6">
            <BreakdownSection
              title="🏦 VoPay par Status"
              data={metrics.breakdowns.vopay_by_status}
            />
            <BreakdownSection
              title="📧 Communications par Type"
              data={metrics.breakdowns.communications_by_type}
            />
            <BreakdownSection
              title="💰 Loans par Status"
              data={metrics.breakdowns.loans_by_status}
            />
            <BreakdownSection
              title="💳 Payment Events par Type"
              data={metrics.breakdowns.payment_events_by_type}
            />
          </div>
        </Section>

        {/* Légende */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-3">📖 Légende:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-700">Vert = Contient des données (prêt à utiliser)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span className="text-gray-700">Gris = Structure prête, 0 données</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-mono text-xs">~XXms</span>
              <span className="text-gray-700">Vitesse typique de la requête</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-600 font-mono text-xs">/api/...</span>
              <span className="text-gray-700">Route API utilisée</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => window.location.href = '/admin/monitoring'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            📊 Monitoring
          </button>
          <button
            onClick={() => window.location.href = '/admin/vopay/orphans'}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
          >
            🔍 Orphelins VoPay
          </button>
          <button
            onClick={() => window.location.href = `/clients/c53ace24-3ceb-4e37-a041-209b7cb2c932`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            👤 Profil Client Test
          </button>
          <button
            onClick={() => { loadMetrics(); testApiRoutes(); }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            🔄 Rafraîchir
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, color, children }: {
  title: string
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red'
  children: React.ReactNode
}) {
  const colorClasses = {
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    green: 'border-l-green-500',
    orange: 'border-l-orange-500',
    red: 'border-l-red-500'
  }

  return (
    <div className={`bg-white border-l-4 ${colorClasses[color]} rounded-lg p-6`}>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function MetricCardWithInfo({ id, label, value, hasData, icon, info, expanded, onToggle }: {
  id: string
  label: string
  value: number
  hasData: boolean
  icon: string
  info?: MetricInfo
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className={`rounded-lg border-2 transition-all ${
      hasData
        ? 'bg-green-50 border-green-200'
        : 'bg-gray-50 border-gray-200'
    } ${expanded ? 'ring-2 ring-blue-400' : ''}`}>
      {/* Card Header - Clickable */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-opacity-80"
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <div className="flex gap-1">
            {!hasData && (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                Vide
              </span>
            )}
            <button className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200">
              {expanded ? '🔼' : 'ℹ️'}
            </button>
          </div>
        </div>
        <div className={`text-3xl font-bold mb-1 ${
          hasData ? 'text-green-900' : 'text-gray-400'
        }`}>
          {value.toLocaleString()}
        </div>
        <div className={`text-xs font-medium ${
          hasData ? 'text-green-800' : 'text-gray-500'
        }`}>
          {label}
        </div>
      </div>

      {/* Expanded Info */}
      {expanded && info && (
        <div className="border-t px-4 py-3 bg-white space-y-2 text-xs">
          <div>
            <span className="font-bold text-gray-700">Description:</span>
            <p className="text-gray-600 mt-1">{info.description}</p>
          </div>
          <div>
            <span className="font-bold text-gray-700">Usage:</span>
            <p className="text-gray-600 mt-1">{info.usage}</p>
          </div>
          {info.route && (
            <div>
              <span className="font-bold text-gray-700">Route:</span>
              <code className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded ml-2">
                {info.route}
              </code>
            </div>
          )}
          {info.component && (
            <div>
              <span className="font-bold text-gray-700">Composant:</span>
              <code className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2">
                {info.component}
              </code>
            </div>
          )}
          <div>
            <span className="font-bold text-gray-700">Vitesse:</span>
            <span className="text-green-600 font-mono ml-2">{info.speed}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BreakdownSection({ title, data }: {
  title: string
  data: Record<string, number>
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(data).map(([key, count]) => (
          <div
            key={key}
            className={`rounded p-3 text-center ${
              count > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className={`text-2xl font-bold ${count > 0 ? 'text-green-900' : 'text-gray-400'}`}>
              {count}
            </div>
            <div className={`text-xs mt-1 ${count > 0 ? 'text-green-700' : 'text-gray-500'}`}>
              {key}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getTableIcon(table: string): string {
  const icons: Record<string, string> = {
    clients: '👥',
    loans: '💰',
    communications: '📧',
    payment_events: '💳',
    vopay_objects: '🏦',
    vopay_webhook_logs: '📨',
    audit_log: '📝',
    applications: '📋',
    payment_schedules: '📅'
  }
  return icons[table] || '📊'
}
