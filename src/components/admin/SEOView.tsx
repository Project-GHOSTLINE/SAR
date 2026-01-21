'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, Users, MousePointer, Eye,
  Search, Award, Link, BarChart3, Calendar, RefreshCw,
  ChevronUp, ChevronDown, ExternalLink, Loader2, AlertCircle,
  Info
} from 'lucide-react'

interface PeriodData {
  data?: any
  summary?: any
  records?: number
  trend?: 'up' | 'down' | 'stable'
  description?: string
}

interface SEOMetrics {
  ga4?: {
    today: PeriodData
    yesterday: PeriodData
    last_week: PeriodData
    last_month: PeriodData
    last_year: PeriodData
  }
  gsc?: {
    today: PeriodData
    yesterday: PeriodData
    last_week: PeriodData
    last_month: PeriodData
    last_year: PeriodData
  }
  semrush?: {
    today: PeriodData
    yesterday: PeriodData
    last_week: PeriodData
    last_month: PeriodData
    last_year: PeriodData
  }
  keywords?: {
    total: number
    top10: number
    improved: number
    declined: number
    topKeywords: any[]
    description?: string
  }
}

type PeriodKey = 'today' | 'yesterday' | 'last_week' | 'last_month' | 'last_year'

export default function SEOView() {
  const [metrics, setMetrics] = useState<SEOMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Period selectors for each section
  const [ga4Period, setGa4Period] = useState<PeriodKey>('last_month')
  const [gscPeriod, setGscPeriod] = useState<PeriodKey>('last_month')
  const [semrushPeriod, setSemrushPeriod] = useState<PeriodKey>('last_month')

  const fetchMetrics = async () => {
    try {
      setRefreshing(true)
      const res = await fetch(`/api/seo/metrics?source=all&detailed=true`, {
        credentials: 'include',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_KEY || ''
        }
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la récupération des métriques')
      }

      const data = await res.json()
      setMetrics(data)
      setError(null)
    } catch (err: any) {
      console.error('Erreur métriques SEO:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#10B981]" />
          <p className="text-gray-600">Chargement des métriques SEO...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 px-6 py-4 rounded">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h3 className="text-red-800 font-semibold">Erreur</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const periodLabels: Record<PeriodKey, string> = {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    last_week: '7 derniers jours',
    last_month: '30 derniers jours',
    last_year: 'Dernière année'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Métriques SEO
          </h1>
          <p className="text-gray-600 mt-1">
            Tableau de bord complet des performances SEO de Solution Argent Rapide
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Google Analytics 4 Section */}
      {metrics?.ga4 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 size={24} className="text-[#10B981]" />
                Google Analytics 4
              </h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Info size={14} />
                {metrics.ga4[ga4Period]?.description || 'Métriques de performance du site'}
              </p>
            </div>

            {/* Period Selector */}
            <select
              value={ga4Period}
              onChange={(e) => setGa4Period(e.target.value as PeriodKey)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {metrics.ga4[ga4Period]?.summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Utilisateurs"
                value={metrics.ga4[ga4Period].summary.total_users?.toLocaleString() || '0'}
                icon={Users}
                trend={metrics.ga4[ga4Period].trend}
                color="blue"
                description="Nombre total d'utilisateurs uniques"
              />
              <MetricCard
                title="Sessions"
                value={metrics.ga4[ga4Period].summary.total_sessions?.toLocaleString() || '0'}
                icon={MousePointer}
                trend={metrics.ga4[ga4Period].trend}
                color="green"
                description="Nombre total de sessions enregistrées"
              />
              <MetricCard
                title="Taux d'engagement"
                value={`${(metrics.ga4[ga4Period].summary.avg_engagement_rate || 0).toFixed(1)}%`}
                icon={TrendingUp}
                trend={metrics.ga4[ga4Period].trend}
                color="purple"
                description="Pourcentage moyen d'engagement des visiteurs"
              />
              <MetricCard
                title="Conversions"
                value={metrics.ga4[ga4Period].summary.total_conversions?.toLocaleString() || '0'}
                icon={Award}
                trend={metrics.ga4[ga4Period].trend}
                color="orange"
                description="Nombre total de conversions réalisées"
              />
              <MetricCard
                title="Trafic organique"
                value={metrics.ga4[ga4Period].summary.total_organic_traffic?.toLocaleString() || '0'}
                icon={Search}
                trend={metrics.ga4[ga4Period].trend}
                color="blue"
                description="Visiteurs provenant des moteurs de recherche"
              />
              <MetricCard
                title="Mobile"
                value={`${(metrics.ga4[ga4Period].summary.mobile_percentage || 0).toFixed(1)}%`}
                icon={MousePointer}
                trend={metrics.ga4[ga4Period].trend}
                color="green"
                description="Pourcentage de trafic mobile"
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible pour cette période</p>
          )}

          {/* Records info */}
          {metrics.ga4[ga4Period]?.records !== undefined && metrics.ga4[ga4Period].records! > 0 && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Basé sur {metrics.ga4[ga4Period].records} jour{metrics.ga4[ga4Period].records! > 1 ? 's' : ''} de données
            </div>
          )}
        </div>
      )}

      {/* Google Search Console Section */}
      {metrics?.gsc && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Search size={24} className="text-[#4285F4]" />
                Google Search Console
              </h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Info size={14} />
                {metrics.gsc[gscPeriod]?.description || 'Performance dans les résultats de recherche'}
              </p>
            </div>

            {/* Period Selector */}
            <select
              value={gscPeriod}
              onChange={(e) => setGscPeriod(e.target.value as PeriodKey)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {metrics.gsc[gscPeriod]?.summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Clics"
                value={metrics.gsc[gscPeriod].summary.total_clicks?.toLocaleString() || '0'}
                icon={MousePointer}
                trend={metrics.gsc[gscPeriod].trend}
                color="blue"
                description="Nombre total de clics depuis les résultats de recherche"
              />
              <MetricCard
                title="Impressions"
                value={metrics.gsc[gscPeriod].summary.total_impressions?.toLocaleString() || '0'}
                icon={Eye}
                trend={metrics.gsc[gscPeriod].trend}
                color="green"
                description="Nombre de fois où votre site apparaît dans les résultats"
              />
              <MetricCard
                title="CTR"
                value={`${(metrics.gsc[gscPeriod].summary.avg_ctr || 0).toFixed(2)}%`}
                icon={TrendingUp}
                trend={metrics.gsc[gscPeriod].trend}
                color="purple"
                description="Taux de clic moyen (Clics / Impressions)"
              />
              <MetricCard
                title="Position moyenne"
                value={(metrics.gsc[gscPeriod].summary.avg_position || 0).toFixed(1)}
                icon={BarChart3}
                trend={metrics.gsc[gscPeriod].trend === 'up' ? 'down' : metrics.gsc[gscPeriod].trend === 'down' ? 'up' : 'stable'}
                color="orange"
                description="Position moyenne dans les résultats de recherche (plus bas = mieux)"
              />
              <MetricCard
                title="Mobile"
                value={`${(metrics.gsc[gscPeriod].summary.mobile_clicks_percentage || 0).toFixed(1)}%`}
                icon={MousePointer}
                trend={metrics.gsc[gscPeriod].trend}
                color="blue"
                description="Pourcentage de clics depuis mobile"
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible pour cette période</p>
          )}

          {/* Records info */}
          {metrics.gsc[gscPeriod]?.records !== undefined && metrics.gsc[gscPeriod].records! > 0 && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Basé sur {metrics.gsc[gscPeriod].records} jour{metrics.gsc[gscPeriod].records! > 1 ? 's' : ''} de données
            </div>
          )}
        </div>
      )}

      {/* Semrush Section */}
      {metrics?.semrush && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Link size={24} className="text-[#FF642D]" />
                Semrush
              </h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Info size={14} />
                {metrics.semrush[semrushPeriod]?.description || 'Analyse SEO et backlinks'}
              </p>
            </div>

            {/* Period Selector */}
            <select
              value={semrushPeriod}
              onChange={(e) => setSemrushPeriod(e.target.value as PeriodKey)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF642D]"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {metrics.semrush[semrushPeriod]?.summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Mots-clés organiques"
                value={metrics.semrush[semrushPeriod].summary.current_organic_keywords?.toLocaleString() || '0'}
                icon={Search}
                trend={metrics.semrush[semrushPeriod].trend}
                color="blue"
                description="Nombre de mots-clés positionnés dans les résultats organiques"
              />
              <MetricCard
                title="Authority Score"
                value={metrics.semrush[semrushPeriod].summary.current_authority_score?.toString() || '0'}
                icon={Award}
                trend={metrics.semrush[semrushPeriod].trend}
                color="purple"
                description="Score d'autorité du domaine (0-100)"
              />
              <MetricCard
                title="Trafic organique"
                value={Math.round(metrics.semrush[semrushPeriod].summary.avg_organic_traffic || 0).toLocaleString()}
                icon={TrendingUp}
                trend={metrics.semrush[semrushPeriod].trend}
                color="green"
                description="Estimation mensuelle du trafic organique"
              />
              <MetricCard
                title="Backlinks"
                value={metrics.semrush[semrushPeriod].summary.total_backlinks?.toLocaleString() || '0'}
                icon={Link}
                trend={metrics.semrush[semrushPeriod].trend}
                color="orange"
                description="Nombre total de backlinks pointant vers le site"
              />
              <MetricCard
                title="Domaines référents"
                value={metrics.semrush[semrushPeriod].summary.referring_domains?.toLocaleString() || '0'}
                icon={Link}
                trend={metrics.semrush[semrushPeriod].trend}
                color="blue"
                description="Nombre de domaines uniques avec des backlinks"
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible pour cette période</p>
          )}

          {/* Records info */}
          {metrics.semrush[semrushPeriod]?.records !== undefined && metrics.semrush[semrushPeriod].records! > 0 && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Basé sur {metrics.semrush[semrushPeriod].records} jour{metrics.semrush[semrushPeriod].records! > 1 ? 's' : ''} de données
            </div>
          )}
        </div>
      )}

      {/* Keywords Tracking Section */}
      {metrics?.keywords && metrics.keywords.total > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Search size={24} className="text-[#10B981]" />
              Mots-clés suivis
            </h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Info size={14} />
              {metrics.keywords.description || `Suivi de ${metrics.keywords.total} mots-clés stratégiques`}
            </p>
          </div>

          {/* Keywords Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">Total</span>
                <span className="text-2xl font-bold text-blue-900">{metrics.keywords.total}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">Mots-clés suivis</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Top 10</span>
                <span className="text-2xl font-bold text-green-900">{metrics.keywords.top10}</span>
              </div>
              <p className="text-xs text-green-600 mt-1">Positionnés dans le top 10</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-700">En hausse</span>
                <span className="text-2xl font-bold text-emerald-900">{metrics.keywords.improved}</span>
              </div>
              <p className="text-xs text-emerald-600 mt-1">Positions améliorées</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">En baisse</span>
                <span className="text-2xl font-bold text-red-900">{metrics.keywords.declined}</span>
              </div>
              <p className="text-xs text-red-600 mt-1">Positions régressées</p>
            </div>
          </div>

          {/* Keywords Table */}
          {metrics.keywords.topKeywords.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mot-clé</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Position</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Changement</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Volume</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Priorité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metrics.keywords.topKeywords.map((keyword, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {keyword.keyword}
                        <span className="ml-2 text-xs text-gray-500">({keyword.category})</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          keyword.current_position && keyword.current_position <= 10
                            ? 'bg-green-100 text-green-800'
                            : keyword.current_position && keyword.current_position <= 20
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {keyword.current_position || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {keyword.position_change ? (
                          <div className="flex items-center justify-center gap-1">
                            {keyword.position_change > 0 ? (
                              <>
                                <ChevronUp size={16} className="text-green-600" />
                                <span className="text-sm font-medium text-green-600">+{keyword.position_change}</span>
                              </>
                            ) : keyword.position_change < 0 ? (
                              <>
                                <ChevronDown size={16} className="text-red-600" />
                                <span className="text-sm font-medium text-red-600">{keyword.position_change}</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">—</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {keyword.search_volume?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          keyword.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : keyword.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : keyword.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {keyword.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 px-6 py-4 rounded">
        <div className="flex items-start gap-3">
          <Calendar size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-blue-800 font-semibold mb-1">Collecte Automatique</h3>
            <p className="text-blue-700 text-sm">
              Les métriques sont collectées automatiquement tous les jours à 6h UTC (2h EST).
              Prochaine collecte dans environ {getTimeUntilNextCollection()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: any
  trend?: 'up' | 'down' | 'stable'
  color: 'blue' | 'green' | 'purple' | 'orange'
  description: string
}

function MetricCard({ title, value, icon: Icon, trend, color, description }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative group">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {trend && trend !== 'stable' && (
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <TrendingUp size={16} className="text-green-600" />
            ) : (
              <TrendingDown size={16} className="text-red-600" />
            )}
          </div>
        )}
      </div>
      <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {description}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
}

function getTimeUntilNextCollection(): string {
  const now = new Date()
  const nextCollection = new Date()
  nextCollection.setUTCHours(6, 0, 0, 0)

  if (now.getUTCHours() >= 6) {
    nextCollection.setUTCDate(nextCollection.getUTCDate() + 1)
  }

  const diff = nextCollection.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes}min`
}
