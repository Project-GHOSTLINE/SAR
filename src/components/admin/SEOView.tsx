'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, Users, MousePointer, Eye,
  Search, Award, Link, BarChart3, Calendar, RefreshCw,
  ChevronUp, ChevronDown, ExternalLink, Loader2, AlertCircle
} from 'lucide-react'

interface SEOMetrics {
  ga4?: {
    records: number
    summary: any
    latest: any
    trend: string
  }
  gsc?: {
    records: number
    summary: any
    latest: any
    trend: string
  }
  semrush?: {
    records: number
    summary: any
    latest: any
    trend: string
  }
  keywords?: {
    total: number
    top10: number
    improved: number
    declined: number
    topKeywords: any[]
  }
}

export default function SEOView() {
  const [metrics, setMetrics] = useState<SEOMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  const fetchMetrics = async () => {
    try {
      setRefreshing(true)
      const res = await fetch(`/api/seo/metrics?period=${period}&source=all`, {
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
  }, [period])

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

  const ga4 = metrics?.ga4
  const gsc = metrics?.gsc
  const semrush = metrics?.semrush
  const keywords = metrics?.keywords

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
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>

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
      {ga4 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 size={24} className="text-[#10B981]" />
              Google Analytics 4
            </h2>
            <span className="text-sm text-gray-500">{ga4.records} jours de données</span>
          </div>

          {ga4.summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Utilisateurs"
                value={ga4.summary.total_users?.toLocaleString() || '0'}
                icon={Users}
                trend={ga4.trend}
                color="blue"
              />
              <MetricCard
                title="Sessions"
                value={ga4.summary.total_sessions?.toLocaleString() || '0'}
                icon={MousePointer}
                trend={ga4.trend}
                color="green"
              />
              <MetricCard
                title="Taux d'engagement"
                value={`${(ga4.summary.avg_engagement_rate || 0).toFixed(1)}%`}
                icon={TrendingUp}
                trend={ga4.trend}
                color="purple"
              />
              <MetricCard
                title="Conversions"
                value={ga4.summary.total_conversions?.toLocaleString() || '0'}
                icon={Award}
                trend={ga4.trend}
                color="orange"
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
          )}
        </div>
      )}

      {/* Google Search Console Section */}
      {gsc && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Search size={24} className="text-[#4285F4]" />
              Google Search Console
            </h2>
            <span className="text-sm text-gray-500">{gsc.records} jours de données</span>
          </div>

          {gsc.summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Clics"
                value={gsc.summary.total_clicks?.toLocaleString() || '0'}
                icon={MousePointer}
                trend={gsc.trend}
                color="blue"
              />
              <MetricCard
                title="Impressions"
                value={gsc.summary.total_impressions?.toLocaleString() || '0'}
                icon={Eye}
                trend={gsc.trend}
                color="green"
              />
              <MetricCard
                title="CTR Moyen"
                value={`${(gsc.summary.avg_ctr || 0).toFixed(2)}%`}
                icon={TrendingUp}
                trend={gsc.trend}
                color="purple"
              />
              <MetricCard
                title="Position Moyenne"
                value={(gsc.summary.avg_position || 0).toFixed(1)}
                icon={Award}
                trend={gsc.trend === 'up' ? 'down' : gsc.trend === 'down' ? 'up' : 'stable'} // Inversé car position plus basse = meilleur
                color="orange"
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">Aucune donnée disponible</p>
              <p className="text-sm text-gray-400">Configurez Google Search Console pour commencer la collecte</p>
              <a
                href="/docs/GOOGLE-SEARCH-CONSOLE-SETUP.md"
                target="_blank"
                className="inline-flex items-center gap-2 mt-3 text-[#10B981] hover:text-[#059669] text-sm font-medium"
              >
                Guide de configuration
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Semrush Section */}
      {semrush && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Link size={24} className="text-[#FF642D]" />
              Semrush
            </h2>
            <span className="text-sm text-gray-500">{semrush.records} jours de données</span>
          </div>

          {semrush.summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Keywords Organiques"
                value={semrush.summary.current_organic_keywords?.toLocaleString() || '0'}
                icon={Search}
                trend={semrush.trend}
                color="blue"
              />
              <MetricCard
                title="Traffic Organique"
                value={semrush.summary.avg_organic_traffic?.toLocaleString() || '0'}
                icon={Users}
                trend={semrush.trend}
                color="green"
              />
              <MetricCard
                title="Backlinks"
                value={semrush.summary.total_backlinks?.toLocaleString() || '0'}
                icon={Link}
                trend={semrush.trend}
                color="purple"
              />
              <MetricCard
                title="Authority Score"
                value={semrush.summary.current_authority_score || '0'}
                icon={Award}
                trend={semrush.trend}
                color="orange"
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">Aucune donnée disponible</p>
              <p className="text-sm text-gray-400">Configurez Semrush API pour commencer la collecte ($200/mois)</p>
              <a
                href="/docs/SEMRUSH-API-SETUP.md"
                target="_blank"
                className="inline-flex items-center gap-2 mt-3 text-[#10B981] hover:text-[#059669] text-sm font-medium"
              >
                Guide de configuration
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Keywords Tracking Section */}
      {keywords && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Search size={24} className="text-[#10B981]" />
              Suivi des Mots-Clés
            </h2>
            <span className="text-sm text-gray-500">{keywords.total} keywords actifs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Top 10</p>
                  <p className="text-2xl font-bold text-green-900">{keywords.top10}</p>
                </div>
                <ChevronUp size={24} className="text-green-600" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">En progression</p>
                  <p className="text-2xl font-bold text-blue-900">{keywords.improved}</p>
                </div>
                <TrendingUp size={24} className="text-blue-600" />
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">En baisse</p>
                  <p className="text-2xl font-bold text-red-900">{keywords.declined}</p>
                </div>
                <TrendingDown size={24} className="text-red-600" />
              </div>
            </div>
          </div>

          {/* Top Keywords Table */}
          {keywords.topKeywords && keywords.topKeywords.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Mot-clé</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Priorité</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Changement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {keywords.topKeywords.slice(0, 10).map((keyword) => (
                    <tr key={keyword.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{keyword.keyword}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {keyword.current_position || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {keyword.search_volume?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          keyword.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          keyword.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          keyword.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {keyword.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {keyword.position_change !== 0 && (
                          <div className="flex items-center gap-1">
                            {keyword.position_change > 0 ? (
                              <ChevronUp size={16} className="text-green-600" />
                            ) : (
                              <ChevronDown size={16} className="text-red-600" />
                            )}
                            <span className={keyword.position_change > 0 ? 'text-green-600' : 'text-red-600'}>
                              {Math.abs(keyword.position_change)}
                            </span>
                          </div>
                        )}
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
}

function MetricCard({ title, value, icon: Icon, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
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
