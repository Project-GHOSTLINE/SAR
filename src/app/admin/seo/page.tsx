'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, MousePointer, Search, Link2, RefreshCw } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

interface GA4Data {
  overview: {
    totalUsers: number
    totalSessions: number
    totalPageViews: number
    totalConversions: number
    bounceRate: number
    engagementRate?: number
  }
  devices: Array<{
    category: string
    users: number
    sessions: number
  }>
}

interface SemrushData {
  domain: string
  date: string
  organic_keywords: number
  organic_traffic: number
  authority_score: number
  total_backlinks: number
}

export default function SEOPage() {
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null)
  const [semrushData, setSemrushData] = useState<SemrushData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    setLoading(true)
    setError(null)

    try {
      // Fetch Google Analytics 4 data
      const ga4Response = await fetch(`/api/admin/analytics/dashboard?period=${period}`)
      if (ga4Response.ok) {
        const ga4Json = await ga4Response.json()
        if (ga4Json.success) {
          setGA4Data(ga4Json.data)
        }
      }

      // Fetch Semrush data (dernière collecte)
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const semrushResponse = await fetch(`/api/seo/collect/semrush?startDate=${startDate}&endDate=${endDate}`)
      if (semrushResponse.ok) {
        const semrushJson = await semrushResponse.json()
        if (semrushJson.success && semrushJson.data.length > 0) {
          // Prendre la donnée la plus récente
          setSemrushData(semrushJson.data[0])
        }
      }
    } catch (err) {
      setError('Erreur lors du chargement des données')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const mobilePercentage = ga4Data?.devices
    ? Math.round((ga4Data.devices.find(d => d.category === 'mobile')?.users || 0) /
      ga4Data.overview.totalUsers * 100)
    : null

  const organicTraffic = ga4Data?.overview.totalSessions
    ? Math.round(ga4Data.overview.totalSessions * 0.4) // Estimation
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/seo" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Métriques SEO</h1>
            <p className="mt-2 text-gray-600">
              Tableau de bord complet des performances SEO de Solution Argent Rapide
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Actualiser
          </button>
        </div>

        {/* Google Analytics 4 Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Google Analytics 4</h2>
                <p className="text-sm text-gray-500">
                  Données des {period === '7d' ? '7' : period === '30d' ? '30' : '90'} derniers jours
                </p>
              </div>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
            </select>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Chargement...</p>
            </div>
          ) : ga4Data ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <MetricCard
                  icon={<Users size={20} />}
                  label="Utilisateurs"
                  value={ga4Data.overview.totalUsers.toLocaleString()}
                  trend={null}
                  color="blue"
                />
                <MetricCard
                  icon={<MousePointer size={20} />}
                  label="Sessions"
                  value={ga4Data.overview.totalSessions.toLocaleString()}
                  trend={null}
                  color="green"
                />
                <MetricCard
                  icon={<TrendingUp size={20} />}
                  label="Taux d'engagement"
                  value={`${Math.round((ga4Data.overview.engagementRate || 0) * 100)}%`}
                  trend={null}
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  icon={<TrendingUp size={20} />}
                  label="Conversions"
                  value={ga4Data.overview.totalConversions.toLocaleString()}
                  trend={null}
                  color="orange"
                />
                <MetricCard
                  icon={<Search size={20} />}
                  label="Trafic organique (est.)"
                  value={organicTraffic?.toLocaleString() || 'N/A'}
                  trend={null}
                  color="indigo"
                />
                <MetricCard
                  icon={<MousePointer size={20} />}
                  label="Mobile"
                  value={mobilePercentage ? `${mobilePercentage}%` : 'N/A'}
                  trend={null}
                  color="green"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  ✅ Données en temps réel via Google Analytics 4 API
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              <p className="text-sm text-gray-500 mt-2">
                ⚠️ Credentials Google Analytics non configurés
              </p>
            </div>
          )}
        </div>

        {/* Google Search Console Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Search className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Google Search Console</h2>
                <p className="text-sm text-gray-500">Données agrégées des 30 derniers jours</p>
              </div>
            </div>
          </div>

          <div className="py-12 text-center">
            <Search className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-600 font-medium">Aucune donnée disponible pour cette période</p>
            <p className="text-sm text-gray-500 mt-2">
              API Google Search Console non configurée
            </p>
          </div>
        </div>

        {/* Semrush Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Link2 className="text-orange-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Semrush</h2>
                <p className="text-sm text-gray-500">
                  Données du {semrushData?.date || '...'}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Chargement...</p>
            </div>
          ) : semrushData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={<Search size={20} />}
                  label="Mots-clés organiques"
                  value={semrushData.organic_keywords.toLocaleString()}
                  trend={null}
                  color="blue"
                />
                <MetricCard
                  icon={<TrendingUp size={20} />}
                  label="Authority Score"
                  value={semrushData.authority_score.toString()}
                  trend={null}
                  color="purple"
                />
                <MetricCard
                  icon={<BarChart3 size={20} />}
                  label="Trafic organique"
                  value={semrushData.organic_traffic.toLocaleString()}
                  trend={null}
                  color="green"
                />
                <MetricCard
                  icon={<Link2 size={20} />}
                  label="Backlinks"
                  value={semrushData.total_backlinks.toLocaleString()}
                  trend={null}
                  color="orange"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  ✅ Données en temps réel via Semrush API
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <Link2 className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
              <p className="text-sm text-gray-500 mt-2">
                ⚠️ API Semrush non configurée
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </main>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend: number | null
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo'
}

function MetricCard({ icon, label, value, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend !== null && (
          <span className={`text-xs flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}
