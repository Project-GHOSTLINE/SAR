'use client'

/**
 * Page Monitoring - Dashboard Performance & Santé DB
 *
 * Affiche en temps réel:
 * - Performance base de données
 * - Stats VoPay
 * - Audit récent
 * - Alertes
 */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

interface CacheStats {
  metric: string
  percentage: number
  status: string
}

interface VoPayOrphan {
  id: string
  vopay_id: string
  object_type: string
  status: string
  amount: number
  occurred_at: string
  payload_email: string
}

interface AuditEntry {
  id: string
  table_name: string
  operation: string
  changed_at: string
  changed_by: string | null
  record_summary: string | null
}

interface TableSize {
  table_name: string
  total_size: string
  total_size_bytes: number
}

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

export default function MonitoringPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔍 Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Dashboard de santé et performance de la base de données
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CacheHitRatioCard />
          <VoPayOrphansCard />
          <TableSizesCard />
          <RecentAuditsCard />
        </div>

        {/* Performance Report */}
        <PerformanceReportCard />
      </div>
    </div>
  )
}

// ============================================================================
// CACHE HIT RATIO
// ============================================================================

function CacheHitRatioCard() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCacheStats()
    const interval = setInterval(loadCacheStats, 30000) // Refresh chaque 30s
    return () => clearInterval(interval)
  }, [])

  async function loadCacheStats() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data } = await supabase
        .from('vw_cache_hit_ratio')
        .select('*')
        .single()

      setStats(data)
    } catch (err) {
      console.error('Erreur cache stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return <CardSkeleton title="Cache Performance" />
  }

  const statusColor = stats.status.includes('EXCELLENT') ? 'text-green-600'
    : stats.status.includes('GOOD') ? 'text-yellow-600'
    : 'text-red-600'

  return (
    <Card title="📊 Cache Performance" subtitle="PostgreSQL cache hit ratio">
      <div className="text-center py-4">
        <div className={`text-5xl font-bold ${statusColor}`}>
          {stats.percentage.toFixed(1)}%
        </div>
        <div className="mt-2 text-sm text-gray-600">{stats.status}</div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        {stats.percentage > 99 && '✅ Excellent! Cache performant.'}
        {stats.percentage <= 99 && stats.percentage > 95 && '⚠️ Bon mais peut être amélioré.'}
        {stats.percentage <= 95 && '🔴 Action requise: augmenter shared_buffers.'}
      </div>
    </Card>
  )
}

// ============================================================================
// VOPAY ORPHANS
// ============================================================================

function VoPayOrphansCard() {
  const [orphans, setOrphans] = useState<VoPayOrphan[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrphans()
  }, [])

  async function loadOrphans() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, count: totalCount } = await supabase
        .from('vw_vopay_orphans')
        .select('*', { count: 'exact' })
        .limit(5)

      setOrphans(data || [])
      setCount(totalCount || 0)
    } catch (err) {
      console.error('Erreur orphans:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <CardSkeleton title="VoPay Orphelins" />
  }

  const percentage = count > 0 ? ((count / 1000) * 100).toFixed(1) : '0'
  const statusColor = count === 0 ? 'text-green-600'
    : count < 100 ? 'text-yellow-600'
    : 'text-red-600'

  return (
    <Card title="🏦 VoPay Orphelins" subtitle="Transactions sans liens">
      <div className="text-center py-4">
        <div className={`text-5xl font-bold ${statusColor}`}>
          {count}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {percentage}% du total
        </div>
      </div>

      {orphans.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-gray-700">Derniers orphelins:</div>
          {orphans.map(o => (
            <div key={o.id} className="text-xs bg-gray-50 p-2 rounded">
              <div className="font-medium">{o.vopay_id}</div>
              <div className="text-gray-600">
                {o.object_type} • ${o.amount} • {o.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ============================================================================
// TABLE SIZES
// ============================================================================

function TableSizesCard() {
  const [tables, setTables] = useState<TableSize[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTableSizes()
  }, [])

  async function loadTableSizes() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data } = await supabase
        .from('vw_table_sizes')
        .select('*')
        .limit(10)

      setTables(data || [])
    } catch (err) {
      console.error('Erreur table sizes:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <CardSkeleton title="Tailles Tables" />
  }

  return (
    <Card title="📦 Tailles Tables" subtitle="Top 10 tables par taille">
      <div className="space-y-2">
        {tables.map(t => (
          <div key={t.table_name} className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700">{t.table_name}</span>
            <span className="text-gray-600">{t.total_size}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ============================================================================
// RECENT AUDITS
// ============================================================================

function RecentAuditsCard() {
  const [audits, setAudits] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAudits()
    const interval = setInterval(loadAudits, 60000) // Refresh chaque minute
    return () => clearInterval(interval)
  }, [])

  async function loadAudits() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data } = await supabase
        .from('vw_audit_recent')
        .select('*')
        .limit(10)

      setAudits(data || [])
    } catch (err) {
      console.error('Erreur audits:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <CardSkeleton title="Audit Récent" />
  }

  return (
    <Card title="📝 Audit Récent" subtitle="Dernières modifications">
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {audits.map(a => (
          <div key={a.id} className="text-xs bg-gray-50 p-2 rounded">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-medium ${
                a.operation === 'INSERT' ? 'bg-green-100 text-green-800'
                : a.operation === 'UPDATE' ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
              }`}>
                {a.operation}
              </span>
              <span className="font-medium">{a.table_name}</span>
            </div>
            <div className="mt-1 text-gray-600">
              {a.changed_by || 'Système'} • {new Date(a.changed_at).toLocaleString('fr-CA')}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ============================================================================
// PERFORMANCE REPORT
// ============================================================================

function PerformanceReportCard() {
  const [report, setReport] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [])

  async function loadReport() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data } = await supabase.rpc('generate_performance_report')
      setReport(data || [])
    } catch (err) {
      console.error('Erreur report:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Card title="📈 Rapport Performance" subtitle="Analyse complète">
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    </Card>
  }

  // Grouper par section
  const sections = report.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <Card title="📈 Rapport Performance" subtitle="Analyse complète et recommandations">
      <div className="space-y-6">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <h3 className="font-bold text-sm text-gray-900 mb-2">{section}</h3>
            <div className="space-y-2">
              {(items as any[]).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-xl">{item.status}</span>
                  <div className="flex-1">
                    <div className="font-medium">{item.metric}</div>
                    <div className="text-gray-600">{item.value}</div>
                    {item.recommendation && (
                      <div className="mt-1 text-xs text-blue-600">
                        💡 {item.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ============================================================================
// COMPOSANTS UTILITAIRES
// ============================================================================

function Card({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function CardSkeleton({ title }: { title: string }) {
  return (
    <Card title={title}>
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    </Card>
  )
}
