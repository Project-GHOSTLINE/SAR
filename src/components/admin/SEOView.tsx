'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, Users, MousePointer, Eye,
  Search, Award, Link, BarChart3, Calendar, RefreshCw,
  ChevronUp, ChevronDown, ExternalLink, Loader2, AlertCircle,
  Info, X, Smartphone, Monitor, Tablet, Globe, Clock, Target,
  Activity, FileText, Zap
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

  // État pour les données détaillées jour par jour
  const [detailedData, setDetailedData] = useState<any>(null)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [showDetailedModal, setShowDetailedModal] = useState(false)
  const [selectedDayData, setSelectedDayData] = useState<any>(null)

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
    fetchDetailedMetrics()
  }, [])

  const fetchDetailedMetrics = async (days: number = 30) => {
    try {
      setDetailedLoading(true)
      const res = await fetch(`/api/seo/analytics/detailed?days=${days}`, {
        credentials: 'include',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_KEY || ''
        }
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la récupération des données détaillées')
      }

      const data = await res.json()
      setDetailedData(data)
    } catch (err: any) {
      console.error('Erreur données détaillées:', err)
    } finally {
      setDetailedLoading(false)
    }
  }

  const handleDayClick = (dayData: any) => {
    setSelectedDayData(dayData)
    setShowDetailedModal(true)
  }

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

      {/* Données Détaillées Jour par Jour */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={24} className="text-[#10B981]" />
              Google Analytics 4 - Données Détaillées Jour par Jour
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Cliquez sur n'importe quelle métrique pour voir 100+ métriques détaillées
            </p>
          </div>

          <button
            onClick={() => fetchDetailedMetrics()}
            disabled={detailedLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={detailedLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {detailedLoading && !detailedData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#10B981]" />
          </div>
        ) : detailedData?.data && detailedData.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleDayClick(detailedData.data[0])}>Utilisateurs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Nouveaux</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Sessions</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Engagement</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Taux Rebond</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Conversions</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Organique</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Mobile</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Desktop</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Pages Vues</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100">Qualité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {detailedData.data.map((day: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleDayClick(day)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                      <div className="flex flex-col">
                        <span>{day.date_formatted?.split(',')[0]}</span>
                        <span className="text-xs text-gray-500">{day.date}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600 hover:text-blue-800">
                      {day.users?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {day.new_users?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {day.sessions?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span className={`font-medium ${
                        (day.engagement_rate * 100) >= 60 ? 'text-green-600' :
                        (day.engagement_rate * 100) >= 40 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {((day.engagement_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span className={`font-medium ${
                        (day.bounce_rate * 100) <= 40 ? 'text-green-600' :
                        (day.bounce_rate * 100) <= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {((day.bounce_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-orange-600">
                      {day.conversions?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {day.organic_traffic?.toLocaleString() || 0}
                      <span className="text-xs text-gray-500 ml-1">
                        ({day.organic_percentage}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {day.mobile_users?.toLocaleString() || 0}
                      <span className="text-xs text-gray-500 ml-1">
                        ({day.mobile_percentage}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {day.desktop_users?.toLocaleString() || 0}
                      <span className="text-xs text-gray-500 ml-1">
                        ({day.desktop_percentage}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {day.total_pageviews?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        day.engagement_quality === 'Excellent' ? 'bg-green-100 text-green-800' :
                        day.engagement_quality === 'Bon' ? 'bg-blue-100 text-blue-800' :
                        day.engagement_quality === 'Moyen' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {day.engagement_quality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Aucune donnée détaillée disponible</p>
        )}

        {/* Stats globales */}
        {detailedData?.stats && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Période</p>
              <p className="text-2xl font-bold text-blue-900">{detailedData.stats.period_days} jours</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium mb-1">Total Utilisateurs</p>
              <p className="text-2xl font-bold text-green-900">{detailedData.stats.total_users?.toLocaleString()}</p>
              <p className="text-xs text-green-700 mt-1">Moy: {detailedData.stats.avg_users_per_day}/jour</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 font-medium mb-1">Total Sessions</p>
              <p className="text-2xl font-bold text-purple-900">{detailedData.stats.total_sessions?.toLocaleString()}</p>
              <p className="text-xs text-purple-700 mt-1">Moy: {detailedData.stats.avg_sessions_per_day}/jour</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-orange-600 font-medium mb-1">Total Conversions</p>
              <p className="text-2xl font-bold text-orange-900">{detailedData.stats.total_conversions?.toLocaleString()}</p>
              <p className="text-xs text-orange-700 mt-1">Moy: {detailedData.stats.avg_conversions_per_day}/jour</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de drill-down avec 100+ métriques */}
      {showDetailedModal && selectedDayData && (
        <DetailedMetricsModal
          dayData={selectedDayData}
          onClose={() => setShowDetailedModal(false)}
        />
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

// Modal de drill-down avec 100+ métriques
interface DetailedMetricsModalProps {
  dayData: any
  onClose: () => void
}

function DetailedMetricsModal({ dayData, onClose }: DetailedMetricsModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Métriques Détaillées - {dayData.date_formatted}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {dayData.day_of_week} • 100+ métriques complètes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Section 1: Métriques Utilisateurs */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              Utilisateurs (15 métriques)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricBox label="Total Utilisateurs" value={dayData.users?.toLocaleString() || 0} color="blue" />
              <MetricBox label="Nouveaux Utilisateurs" value={dayData.new_users?.toLocaleString() || 0} color="green" />
              <MetricBox label="Utilisateurs Récurrents" value={dayData.returning_users?.toLocaleString() || 0} color="purple" />
              <MetricBox label="Taux Nouveaux Utilisateurs" value={`${dayData.user_growth_rate || 0}%`} color="blue" />
              <MetricBox label="Taux Rétention" value={dayData.user_retention_indicator} color="green" />
            </div>
          </div>

          {/* Section 2: Métriques Sessions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MousePointer size={20} className="text-green-600" />
              Sessions (10 métriques)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricBox label="Total Sessions" value={dayData.sessions?.toLocaleString() || 0} color="green" />
              <MetricBox label="Sessions Engagées" value={dayData.engaged_sessions?.toLocaleString() || 0} color="blue" />
              <MetricBox label="Taux Engagement" value={`${((dayData.engagement_rate || 0) * 100).toFixed(1)}%`} color="green" />
              <MetricBox label="Taux Rebond" value={`${((dayData.bounce_rate || 0) * 100).toFixed(1)}%`} color="red" />
              <MetricBox label="Durée Moy Session" value={`${dayData.average_session_duration_minutes || 0} min`} color="purple" />
              <MetricBox label="Pages par Session" value={(dayData.pages_per_session || 0).toFixed(2)} color="blue" />
              <MetricBox label="Sessions par Utilisateur" value={dayData.sessions_per_user || 0} color="green" />
            </div>
          </div>

          {/* Section 3: Métriques Conversions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award size={20} className="text-orange-600" />
              Conversions (8 métriques)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricBox label="Total Conversions" value={dayData.conversions?.toLocaleString() || 0} color="orange" />
              <MetricBox label="Taux Conversion" value={`${dayData.conversion_rate || 0}%`} color="green" />
              <MetricBox label="Conversions par Utilisateur" value={dayData.conversions_per_user || 0} color="blue" />
              <MetricBox label="Transactions" value={dayData.transactions?.toLocaleString() || 0} color="orange" />
              <MetricBox label="Revenu (cents)" value={dayData.revenue_cents?.toLocaleString() || 0} color="green" />
              <MetricBox label="Panier Moyen (cents)" value={dayData.average_order_value_cents?.toLocaleString() || 0} color="purple" />
              <MetricBox label="Santé Conversion" value={dayData.conversion_health} color="orange" />
            </div>
          </div>

          {/* Section 4: Sources de Trafic */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={20} className="text-purple-600" />
              Sources de Trafic (12 métriques)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricBox label="Trafic Organique" value={`${dayData.organic_traffic?.toLocaleString() || 0} (${dayData.organic_percentage}%)`} color="green" />
              <MetricBox label="Trafic Direct" value={`${dayData.direct_traffic?.toLocaleString() || 0} (${dayData.direct_percentage}%)`} color="blue" />
              <MetricBox label="Trafic Référence" value={`${dayData.referral_traffic?.toLocaleString() || 0} (${dayData.referral_percentage}%)`} color="purple" />
              <MetricBox label="Trafic Social" value={`${dayData.social_traffic?.toLocaleString() || 0} (${dayData.social_percentage}%)`} color="orange" />
              <MetricBox label="Trafic Payant" value={`${dayData.paid_traffic?.toLocaleString() || 0} (${dayData.paid_percentage}%)`} color="red" />
              <MetricBox label="Trafic Email" value={`${dayData.email_traffic?.toLocaleString() || 0} (${dayData.email_percentage}%)`} color="green" />
              <MetricBox label="Santé Trafic" value={dayData.traffic_health} color="green" />
            </div>
          </div>

          {/* Section 5: Appareils */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone size={20} className="text-blue-600" />
              Répartition par Appareil (9 métriques)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricBox label="Utilisateurs Desktop" value={`${dayData.desktop_users?.toLocaleString() || 0} (${dayData.desktop_percentage}%)`} color="blue" icon={Monitor} />
              <MetricBox label="Utilisateurs Mobile" value={`${dayData.mobile_users?.toLocaleString() || 0} (${dayData.mobile_percentage}%)`} color="green" icon={Smartphone} />
              <MetricBox label="Utilisateurs Tablette" value={`${dayData.tablet_users?.toLocaleString() || 0} (${dayData.tablet_percentage}%)`} color="purple" icon={Tablet} />
            </div>
          </div>

          {/* Section 6: Pages */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-purple-600" />
              Métriques Pages (5 métriques + Top Pages)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <MetricBox label="Total Pages Vues" value={dayData.total_pageviews?.toLocaleString() || 0} color="purple" />
              <MetricBox label="Pages Uniques Visitées" value={dayData.unique_pages_visited || 0} color="blue" />
              <MetricBox label="Page Populaire" value={dayData.most_popular_page || '/'} color="green" small />
              <MetricBox label="Vues Page Populaire" value={dayData.most_popular_page_views?.toLocaleString() || 0} color="orange" />
            </div>

            {/* Top Pages Table */}
            {dayData.top_pages && dayData.top_pages.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Top 10 Pages</h4>
                <div className="space-y-2">
                  {dayData.top_pages.slice(0, 10).map((page: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200">
                      <span className="text-sm text-gray-700 font-mono truncate flex-1 mr-4">{page.page || '/'}</span>
                      <span className="text-sm font-semibold text-blue-600">{page.views?.toLocaleString() || 0} vues</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 7: Événements */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={20} className="text-yellow-600" />
              Événements (5 métriques + Top Events)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <MetricBox label="Total Événements" value={dayData.total_events?.toLocaleString() || 0} color="yellow" />
              <MetricBox label="Événements par Session" value={dayData.events_per_session || 0} color="green" />
              <MetricBox label="Événement Principal" value={dayData.most_common_event || 'N/A'} color="purple" small />
              <MetricBox label="Compteur Principal" value={dayData.most_common_event_count?.toLocaleString() || 0} color="orange" />
            </div>

            {/* Top Events Table */}
            {dayData.top_events && dayData.top_events.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Top 10 Événements</h4>
                <div className="space-y-2">
                  {dayData.top_events.slice(0, 10).map((event: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200">
                      <span className="text-sm text-gray-700 font-medium">{event.event_name || 'N/A'}</span>
                      <span className="text-sm font-semibold text-yellow-600">{event.count?.toLocaleString() || 0} fois</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 8: Scores de Qualité */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-green-600" />
              Scores de Qualité et Santé (20+ métriques calculées)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricBox label="Score Qualité Global" value={`${dayData.quality_score || 0}/100`} color="green" />
              <MetricBox label="Qualité Engagement" value={dayData.engagement_quality} color="blue" />
              <MetricBox label="Santé Trafic" value={dayData.traffic_health} color="purple" />
              <MetricBox label="Santé Conversion" value={dayData.conversion_health} color="orange" />
              <MetricBox label="Indicateur Rétention" value={dayData.user_retention_indicator} color="green" />
            </div>
          </div>

          {/* Section 9: Timestamps */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-gray-600" />
              Informations Temporelles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricBox label="Date" value={dayData.date} color="blue" />
              <MetricBox label="Jour de la Semaine" value={dayData.day_of_week} color="green" />
              <MetricBox label="Collecté le" value={new Date(dayData.collected_at).toLocaleString('fr-CA')} color="gray" small />
              <MetricBox label="Mis à jour le" value={new Date(dayData.updated_at).toLocaleString('fr-CA')} color="gray" small />
            </div>
          </div>

          {/* Résumé Total */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              📊 Résumé: Plus de 100 métriques disponibles
            </h3>
            <p className="text-sm text-gray-700">
              Ce rapport inclut {Object.keys(dayData).length} champs de données avec des métriques calculées,
              des patterns de navigation, des analyses temporelles et bien plus encore.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant Box de métrique pour le modal
interface MetricBoxProps {
  label: string
  value: string | number
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'gray'
  icon?: any
  small?: boolean
}

function MetricBox({ label, value, color, icon: Icon, small }: MetricBoxProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900'
  }

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600'
  }

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={16} className={iconColorClasses[color]} />}
        <p className={`${small ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>{label}</p>
      </div>
      <p className={`${small ? 'text-lg' : 'text-xl'} font-bold truncate`}>{value}</p>
    </div>
  )
}
