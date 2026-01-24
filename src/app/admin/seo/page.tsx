'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { BarChart3, TrendingUp, Users, MousePointer, Search, Link2, RefreshCw, X, MapPin, Smartphone, Globe } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

// Import dynamique pour éviter les erreurs SSR avec Leaflet
const UserMap = dynamic(() => import('@/components/UserMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Chargement de la carte...</p>
    </div>
  )
})

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
  geography: Array<{
    country: string
    city: string
    users: number
    sessions: number
  }>
  trafficSources: Array<{
    source: string
    medium: string
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

type DetailView = 'users' | 'devices' | 'geography' | 'traffic' | null

export default function SEOPage() {
  const [ga4Data, setGA4Data] = useState<GA4Data | null>(null)
  const [semrushData, setSemrushData] = useState<SemrushData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')
  const [detailView, setDetailView] = useState<DetailView>(null)

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
    ? Math.round(ga4Data.overview.totalSessions * 0.4)
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
                  onClick={() => setDetailView('users')}
                  clickable
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
                  onClick={() => setDetailView('traffic')}
                  clickable
                />
                <MetricCard
                  icon={<MousePointer size={20} />}
                  label="Appareils"
                  value={mobilePercentage ? `${mobilePercentage}% mobile` : 'N/A'}
                  trend={null}
                  color="green"
                  onClick={() => setDetailView('devices')}
                  clickable
                />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  ✅ Données en temps réel via Google Analytics 4 API • Cliquez sur une métrique pour voir les détails
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

      {/* Detail Modal */}
      {detailView && ga4Data && (
        <DetailModal
          view={detailView}
          data={ga4Data}
          onClose={() => setDetailView(null)}
        />
      )}
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend: number | null
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo'
  onClick?: () => void
  clickable?: boolean
}

function MetricCard({ icon, label, value, trend, color, onClick, clickable }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  }

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${
        clickable ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''
      }`}
    >
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
      {clickable && (
        <p className="text-xs text-blue-600 mt-2">Cliquer pour voir les détails →</p>
      )}
    </div>
  )
}

interface DetailModalProps {
  view: DetailView
  data: GA4Data
  onClose: () => void
}

function DetailModal({ view, data, onClose }: DetailModalProps) {
  const getTitle = () => {
    switch (view) {
      case 'users':
        return 'Détails des Utilisateurs'
      case 'devices':
        return 'Répartition par Appareil'
      case 'geography':
        return 'Localisation Géographique'
      case 'traffic':
        return 'Sources de Trafic'
      default:
        return 'Détails'
    }
  }

  const getIcon = () => {
    switch (view) {
      case 'users':
        return <Users className="text-blue-600" size={24} />
      case 'devices':
        return <Smartphone className="text-green-600" size={24} />
      case 'geography':
        return <MapPin className="text-purple-600" size={24} />
      case 'traffic':
        return <Globe className="text-indigo-600" size={24} />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              {getIcon()}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)]">
          {view === 'users' && (
            <div className="space-y-6">
              {/* Carte interactive */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Vue Satellite</h3>
                <UserMap locations={data.geography.slice(0, 20)} />
              </div>

              {/* Liste des villes */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Top 10 Villes</h3>
                <div className="space-y-2">
                  {data.geography.slice(0, 10).map((geo, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {geo.city}, {geo.country}
                          </p>
                          <p className="text-sm text-gray-500">{geo.sessions} sessions</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {geo.users.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'devices' && (
            <div className="space-y-4">
              {data.devices.map((device, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Smartphone size={20} className="text-gray-400" />
                      <span className="font-semibold text-gray-900 capitalize">{device.category}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {device.users.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Sessions: {device.sessions.toLocaleString()}</span>
                    <span>
                      Part: {Math.round((device.users / data.overview.totalUsers) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'traffic' && (
            <div className="space-y-4">
              {data.trafficSources.slice(0, 10).map((source, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-900">{source.source}</p>
                        <p className="text-sm text-gray-500">{source.medium}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-indigo-600">
                      {source.users.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Sessions: {source.sessions.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
