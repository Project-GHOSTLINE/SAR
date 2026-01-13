'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  Copy,
  ChevronDown,
  ChevronRight,
  Code,
  TrendingUp,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react'
// AdminNav removed - this page is now included in data-explorer

interface Metric {
  id: string
  metric_key: string
  label: string
  description: string
  section_key: string
  value_type: string
  unit: string | null
  format: string | null
  entity_types: string[]
  supports_period: boolean
  display_order: number
  is_highlighted: boolean
  color_scheme: string
  tags: string[]
  has_values: boolean
  value_count: number
}

interface Section {
  id: string
  section_key: string
  label: string
  description: string
  icon_name: string
  route_path: string
  is_active: boolean
  metrics_total: number
  metrics_with_values: number
  metrics: Metric[]
}

interface InspectionData {
  sections: Section[]
  total_sections: number
  total_metrics: number
  stats: {
    total_values: number
    global_values: number
    analysis_values: number
    fraud_case_values: number
    sections_count: number
    metrics_count: number
  }
  source_data_counts: {
    client_analyses: number
    client_transactions: number
    client_accounts: number
    fraud_cases: number
    contact_messages: number
    support_tickets: number
    vopay_webhook_logs: number
  }
  recent_values: any[]
  timestamp: string
}

export default function MetricInspectorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InspectionData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    fetchInspectionData()
  }, [])

  const fetchInspectionData = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/metrics/inspect', {
        credentials: 'include'
      })

      if (res.status === 401) {
        router.push('/admin')
        return
      }

      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || 'Erreur de chargement')
      }

      setData(result.data)
    } catch (err: any) {
      console.error('Inspection error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey)
    } else {
      newExpanded.add(sectionKey)
    }
    setExpandedSections(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getColorClass = (color: string) => {
    const colors: { [key: string]: string } = {
      red: 'bg-red-100 text-red-800 border-red-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    return colors[color] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Chargement de l'inspection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Erreur de chargement</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchInspectionData}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const completionRate = data.total_metrics > 0
    ? Math.round((data.sections.reduce((acc, s) => acc + s.metrics_with_values, 0) / data.total_metrics) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Metric Engine Inspector</h1>
              <p className="text-gray-600 mt-1">Visualisation complète de l'architecture modulaire</p>
            </div>
            <button
              onClick={fetchInspectionData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </button>
          </div>

          {/* Stats globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sections</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{data.total_sections}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Métriques Définies</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{data.total_metrics}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valeurs Calculées</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.total_values}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux Completion</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{completionRate}%</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats par entity type */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Valeurs par Type d'Entité</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{data.stats.global_values}</p>
                <p className="text-sm text-gray-600 mt-1">Global</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{data.stats.analysis_values}</p>
                <p className="text-sm text-gray-600 mt-1">Analyses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{data.stats.fraud_case_values}</p>
                <p className="text-sm text-gray-600 mt-1">Fraude</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{data.stats.total_values}</p>
                <p className="text-sm text-gray-600 mt-1">Total</p>
              </div>
            </div>
          </div>

          {/* Données Sources (Tables Réelles) */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Données Sources (Tables)</h2>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                EN TEMPS RÉEL
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">
                  {data.source_data_counts?.client_analyses?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1 font-medium">Analyses</p>
                <p className="text-[10px] text-gray-400 mt-0.5">client_analyses</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-2xl font-bold text-purple-600">
                  {data.source_data_counts?.client_transactions?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1 font-medium">Transactions</p>
                <p className="text-[10px] text-gray-400 mt-0.5">client_transactions</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-600">
                  {data.source_data_counts?.client_accounts?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1 font-medium">Comptes</p>
                <p className="text-[10px] text-gray-400 mt-0.5">client_accounts</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-2xl font-bold text-red-600">
                  {data.source_data_counts?.fraud_cases?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1 font-medium">Fraudes</p>
                <p className="text-[10px] text-gray-400 mt-0.5">fraud_cases</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-600">
                  {data.source_data_counts?.contact_messages?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1 font-medium">Messages</p>
                <p className="text-[10px] text-gray-400 mt-0.5">contact_messages</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">
                  {data.source_data_counts?.support_tickets?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1 font-medium">Support</p>
                <p className="text-[10px] text-gray-400 mt-0.5">support_tickets</p>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-2xl font-bold text-indigo-600">
                  {data.source_data_counts?.vopay_webhook_logs?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1 font-medium">VoPay</p>
                <p className="text-[10px] text-gray-400 mt-0.5">vopay_webhook_logs</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">Ces compteurs montrent le nombre de lignes dans chaque table source.</p>
                  <p>Si une valeur est à <strong>0</strong>, cela signifie qu'aucune donnée n'existe pour calculer les métriques associées.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sections avec métriques */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Sections et Métriques</h2>

            {data.sections.map((section) => {
              const isExpanded = expandedSections.has(section.section_key)
              const completionPercentage = section.metrics_total > 0
                ? Math.round((section.metrics_with_values / section.metrics_total) * 100)
                : 0

              return (
                <div key={section.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Section Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection(section.section_key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-gray-900">{section.label}</h3>
                            <span className={`
                              px-2 py-1 rounded text-xs font-semibold
                              ${section.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                            `}>
                              {section.is_active ? 'ACTIF' : 'INACTIF'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                              {section.section_key}
                            </code>
                            <span className="text-xs text-gray-500">{section.route_path}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-2xl font-bold text-gray-900">
                            {section.metrics_with_values}/{section.metrics_total}
                          </span>
                          <span className={`
                            text-sm font-semibold px-2 py-1 rounded
                            ${completionPercentage === 100 ? 'bg-green-100 text-green-800' :
                              completionPercentage > 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}
                          `}>
                            {completionPercentage}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">métriques avec valeurs</p>
                      </div>
                    </div>
                  </div>

                  {/* Métriques de la section */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      {section.metrics.length === 0 ? (
                        <div className="p-6 text-center">
                          <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">Aucune métrique définie pour cette section</p>
                        </div>
                      ) : (
                        <div className="p-6 space-y-3">
                          {section.metrics.map((metric) => (
                            <div
                              key={metric.id}
                              className={`
                                p-4 rounded-lg border-2 transition-all
                                ${metric.has_values
                                  ? 'bg-white border-green-200'
                                  : 'bg-red-50 border-red-200'}
                              `}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {metric.has_values ? (
                                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                    )}
                                    <h4 className="font-semibold text-gray-900">{metric.label}</h4>
                                    {metric.is_highlighted && (
                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                                        ⭐ HIGHLIGHT
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-sm text-gray-600 mt-1">{metric.description}</p>

                                  <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {/* Shortcode principal */}
                                    <button
                                      onClick={() => copyToClipboard(metric.metric_key)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-md transition-colors group"
                                      title="Cliquer pour copier"
                                    >
                                      <Code className="w-4 h-4" />
                                      <code className="text-xs font-mono font-semibold">{metric.metric_key}</code>
                                      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      {copiedKey === metric.metric_key && (
                                        <span className="text-xs ml-1">✓</span>
                                      )}
                                    </button>

                                    {/* Type de valeur */}
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      Type: {metric.value_type}
                                    </span>

                                    {/* Format */}
                                    {metric.format && (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                        Format: {metric.format}
                                      </span>
                                    )}

                                    {/* Unit */}
                                    {metric.unit && (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                        Unit: {metric.unit}
                                      </span>
                                    )}

                                    {/* Entity types supportés */}
                                    <div className="flex items-center gap-1">
                                      {metric.entity_types.map((entityType) => (
                                        <span
                                          key={entityType}
                                          className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded"
                                        >
                                          {entityType}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Support période */}
                                    {metric.supports_period && (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                                        📅 Périodes
                                      </span>
                                    )}

                                    {/* Color scheme */}
                                    {metric.color_scheme && (
                                      <span className={`px-2 py-1 text-xs rounded border ${getColorClass(metric.color_scheme)}`}>
                                        {metric.color_scheme}
                                      </span>
                                    )}
                                  </div>

                                  {/* Tags */}
                                  {metric.tags && metric.tags.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1 mt-2">
                                      {metric.tags.map((tag, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Statut valeurs */}
                                <div className="text-right flex-shrink-0">
                                  {metric.has_values ? (
                                    <div>
                                      <p className="text-2xl font-bold text-green-600">{metric.value_count}</p>
                                      <p className="text-xs text-gray-500">valeur(s)</p>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-sm font-semibold text-red-600">NON CALCULÉ</p>
                                      <p className="text-xs text-gray-500">0 valeur</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Guide d'utilisation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Guide d'Utilisation des Shortcodes</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>Copier le shortcode:</strong> Cliquez sur le bouton bleu avec le code (ex: <code className="bg-white px-2 py-0.5 rounded">nsf_count_90d</code>)</p>
              <p>• <strong>Usage en React:</strong> <code className="bg-white px-2 py-0.5 rounded">{`<DynamicSection sectionKey="analyses" entityType="analysis" entityId={analysisId} />`}</code></p>
              <p>• <strong>Usage RPC Supabase:</strong> <code className="bg-white px-2 py-0.5 rounded">supabase.rpc('get_metrics_by_section', {'{'} p_section_key: 'analyses' {'}'})</code></p>
              <p>• <strong>Calcul manuel:</strong> <code className="bg-white px-2 py-0.5 rounded">supabase.rpc('compute_analysis_metrics', {'{'} p_analysis_id: uuid {'}'})</code></p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-center text-sm text-gray-500">
            Dernière mise à jour: {new Date(data.timestamp).toLocaleString('fr-CA')}
          </div>

        </div>
      </div>
    </div>
  )
}
