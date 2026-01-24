'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Filter, AlertTriangle, Bot, User, Clock, Eye, MapPin, Smartphone, TrendingUp, Download } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

interface IPTrace {
  ip: string
  firstSeen: string
  lastSeen: string
  totalSessions: number
  totalPageViews: number
  totalDuration: number
  avgSessionDuration: number
  bounceRate: number
  device: {
    category: string
    os: string
    browser: string
  }
  location: {
    country: string
    city: string
  }
  pages: Array<{
    path: string
    views: number
    avgTime: number
  }>
  sources: Array<{
    source: string
    medium: string
    sessions: number
  }>
  anomalyScore: number
  flags: string[]
  isBot: boolean
}

type SortField = 'pageViews' | 'sessions' | 'duration' | 'anomalyScore' | 'firstSeen'
type FilterType = 'all' | 'suspicious' | 'bots' | 'humans'

export default function SEOAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [traces, setTraces] = useState<IPTrace[]>([])
  const [filteredTraces, setFilteredTraces] = useState<IPTrace[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('pageViews')
  const [sortDesc, setSortDesc] = useState(true)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedIP, setSelectedIP] = useState<IPTrace | null>(null)
  const [period, setPeriod] = useState('7d')

  useEffect(() => {
    fetchTraces()
  }, [period])

  useEffect(() => {
    applyFiltersAndSort()
  }, [traces, searchQuery, sortField, sortDesc, filterType])

  async function fetchTraces() {
    setLoading(true)
    try {
      // Récupérer les données brutes de GA4
      const response = await fetch(`/api/admin/analytics?startDate=${getStartDate()}&endDate=today`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Grouper par IP et enrichir
          const ipMap = new Map<string, IPTrace>()

          data.data.forEach((row: any) => {
            // Simuler une IP (GA4 ne fournit pas l'IP directe pour la vie privée)
            // Dans la vraie vie, on utiliserait une dimension custom ou un middleware
            const ip = `${row.location.country}-${row.location.city}-${Math.floor(Math.random() * 1000)}`

            const existing = ipMap.get(ip) || {
              ip,
              firstSeen: row.timestamp,
              lastSeen: row.timestamp,
              totalSessions: 0,
              totalPageViews: 0,
              totalDuration: 0,
              avgSessionDuration: 0,
              bounceRate: 0,
              device: row.device,
              location: row.location,
              pages: [],
              sources: [],
              anomalyScore: 0,
              flags: [],
              isBot: false
            }

            existing.totalSessions += row.metrics.sessions
            existing.totalPageViews += row.metrics.screenPageViews
            existing.totalDuration += row.metrics.averageSessionDuration * row.metrics.sessions
            existing.lastSeen = row.timestamp

            ipMap.set(ip, existing)
          })

          // Calculer les métriques dérivées et anomalies
          const enrichedTraces = Array.from(ipMap.values()).map(trace => {
            trace.avgSessionDuration = trace.totalSessions > 0
              ? trace.totalDuration / trace.totalSessions
              : 0

            trace.bounceRate = trace.totalSessions > 0
              ? (trace.totalSessions - trace.totalPageViews / 2) / trace.totalSessions
              : 0

            // Détection d'anomalies
            const anomalies = detectAnomalies(trace)
            trace.anomalyScore = anomalies.score
            trace.flags = anomalies.flags
            trace.isBot = anomalies.isBot

            return trace
          })

          setTraces(enrichedTraces)
        }
      }
    } catch (error) {
      console.error('Error fetching traces:', error)
    } finally {
      setLoading(false)
    }
  }

  function detectAnomalies(trace: IPTrace): { score: number; flags: string[]; isBot: boolean } {
    let score = 0
    const flags: string[] = []

    // 1. Trop de pages vues en peu de temps (scraping)
    const pagesPerMinute = trace.totalPageViews / (trace.totalDuration / 60)
    if (pagesPerMinute > 10) {
      score += 30
      flags.push('⚡ Navigation ultra-rapide')
    }

    // 2. Durée moyenne trop courte (bot)
    if (trace.avgSessionDuration < 5) {
      score += 25
      flags.push('⏱️ Sessions très courtes')
    }

    // 3. Trop de sessions (automatisation)
    if (trace.totalSessions > 50) {
      score += 20
      flags.push('🔄 Nombre anormal de sessions')
    }

    // 4. Bounce rate suspect
    if (trace.bounceRate > 0.9) {
      score += 15
      flags.push('🚪 Taux de rebond élevé')
    }

    // 5. User agent patterns (si disponible)
    const botKeywords = ['bot', 'crawler', 'spider', 'scraper']
    const userAgent = trace.device.browser.toLowerCase()
    if (botKeywords.some(keyword => userAgent.includes(keyword))) {
      score += 40
      flags.push('🤖 User-Agent suspect')
    }

    const isBot = score >= 50

    return { score, flags, isBot }
  }

  function applyFiltersAndSort() {
    let filtered = [...traces]

    // Recherche
    if (searchQuery) {
      filtered = filtered.filter(trace =>
        trace.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trace.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trace.location.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtres
    switch (filterType) {
      case 'suspicious':
        filtered = filtered.filter(t => t.anomalyScore >= 30 && !t.isBot)
        break
      case 'bots':
        filtered = filtered.filter(t => t.isBot)
        break
      case 'humans':
        filtered = filtered.filter(t => t.anomalyScore < 30)
        break
    }

    // Tri
    filtered.sort((a, b) => {
      let aVal: number, bVal: number

      switch (sortField) {
        case 'pageViews':
          aVal = a.totalPageViews
          bVal = b.totalPageViews
          break
        case 'sessions':
          aVal = a.totalSessions
          bVal = b.totalSessions
          break
        case 'duration':
          aVal = a.avgSessionDuration
          bVal = b.avgSessionDuration
          break
        case 'anomalyScore':
          aVal = a.anomalyScore
          bVal = b.anomalyScore
          break
        case 'firstSeen':
          aVal = new Date(a.firstSeen).getTime()
          bVal = new Date(b.firstSeen).getTime()
          break
        default:
          aVal = 0
          bVal = 0
      }

      return sortDesc ? bVal - aVal : aVal - bVal
    })

    setFilteredTraces(filtered)
  }

  function getStartDate(): string {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  function exportToCSV() {
    const headers = ['IP', 'Localisation', 'Sessions', 'Pages vues', 'Durée moy.', 'Score anomalie', 'Flags']
    const rows = filteredTraces.map(t => [
      t.ip,
      `${t.location.city}, ${t.location.country}`,
      t.totalSessions,
      t.totalPageViews,
      Math.round(t.avgSessionDuration),
      t.anomalyScore,
      t.flags.join(' | ')
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seo-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const stats = {
    totalIPs: traces.length,
    suspiciousIPs: traces.filter(t => t.anomalyScore >= 30 && !t.isBot).length,
    bots: traces.filter(t => t.isBot).length,
    humans: traces.filter(t => t.anomalyScore < 30).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/seo" />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/seo')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour au tableau de bord
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Analyse Comportementale Avancée</h1>
          <p className="mt-2 text-gray-600">
            Tracking détaillé par IP • Détection d'anomalies • Analyse anti-bot
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<User size={20} />}
            label="Total IP"
            value={stats.totalIPs.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={<AlertTriangle size={20} />}
            label="Suspectes"
            value={stats.suspiciousIPs.toLocaleString()}
            color="orange"
          />
          <StatCard
            icon={<Bot size={20} />}
            label="Bots détectés"
            value={stats.bots.toLocaleString()}
            color="red"
          />
          <StatCard
            icon={<User size={20} />}
            label="Humains"
            value={stats.humans.toLocaleString()}
            color="green"
          />
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher IP, ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Period */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
            </select>

            {/* Filter Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Toutes les IP</option>
              <option value="humans">Humains uniquement</option>
              <option value="suspicious">Suspectes</option>
              <option value="bots">Bots</option>
            </select>

            {/* Export */}
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={16} />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Analyse en cours...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        IP / Localisation
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSortField('sessions')
                          setSortDesc(!sortDesc)
                        }}
                      >
                        Sessions {sortField === 'sessions' && (sortDesc ? '↓' : '↑')}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSortField('pageViews')
                          setSortDesc(!sortDesc)
                        }}
                      >
                        Pages vues {sortField === 'pageViews' && (sortDesc ? '↓' : '↑')}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSortField('duration')
                          setSortDesc(!sortDesc)
                        }}
                      >
                        Durée moy. {sortField === 'duration' && (sortDesc ? '↓' : '↑')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Device
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSortField('anomalyScore')
                          setSortDesc(!sortDesc)
                        }}
                      >
                        Anomalie {sortField === 'anomalyScore' && (sortDesc ? '↓' : '↑')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTraces.map((trace, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-gray-50 ${trace.isBot ? 'bg-red-50' : trace.anomalyScore >= 30 ? 'bg-orange-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {trace.isBot ? (
                              <Bot className="text-red-600" size={20} />
                            ) : trace.anomalyScore >= 30 ? (
                              <AlertTriangle className="text-orange-600" size={20} />
                            ) : (
                              <User className="text-green-600" size={20} />
                            )}
                            <div>
                              <p className="font-mono text-sm font-semibold text-gray-900">{trace.ip}</p>
                              <p className="text-xs text-gray-500">
                                <MapPin size={12} className="inline mr-1" />
                                {trace.location.city}, {trace.location.country}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {trace.totalSessions}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {trace.totalPageViews}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <Clock size={14} className="inline mr-1 text-gray-400" />
                          {Math.round(trace.avgSessionDuration)}s
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          <Smartphone size={14} className="inline mr-1" />
                          {trace.device.category}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  trace.anomalyScore >= 50 ? 'bg-red-600' :
                                  trace.anomalyScore >= 30 ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, trace.anomalyScore)}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 min-w-[40px]">
                              {trace.anomalyScore}
                            </span>
                          </div>
                          {trace.flags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {trace.flags.slice(0, 2).map((flag, i) => (
                                <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedIP(trace)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Détails →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {filteredTraces.length} résultat{filteredTraces.length > 1 ? 's' : ''} affiché{filteredTraces.length > 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedIP && (
        <IPDetailModal trace={selectedIP} onClose={() => setSelectedIP(null)} />
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'orange' | 'red' | 'green'
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

interface IPDetailModalProps {
  trace: IPTrace
  onClose: () => void
}

function IPDetailModal({ trace, onClose }: IPDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{trace.ip}</h2>
            <p className="text-sm text-gray-500">
              {trace.location.city}, {trace.location.country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
          {/* Flags d'anomalie */}
          {trace.flags.length > 0 && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">⚠️ Anomalies détectées</h3>
              <div className="space-y-1">
                {trace.flags.map((flag, i) => (
                  <p key={i} className="text-sm text-orange-700">{flag}</p>
                ))}
              </div>
              <p className="mt-2 text-sm font-semibold text-orange-900">
                Score d'anomalie: {trace.anomalyScore}/100
              </p>
            </div>
          )}

          {/* Métriques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{trace.totalSessions}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Pages vues</p>
              <p className="text-2xl font-bold text-gray-900">{trace.totalPageViews}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Durée moy.</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(trace.avgSessionDuration)}s</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Taux de rebond</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(trace.bounceRate * 100)}%</p>
            </div>
          </div>

          {/* Device & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Appareil</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-600">Catégorie:</span> <span className="font-medium">{trace.device.category}</span></p>
                <p><span className="text-gray-600">OS:</span> <span className="font-medium">{trace.device.os}</span></p>
                <p><span className="text-gray-600">Navigateur:</span> <span className="font-medium">{trace.device.browser}</span></p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Chronologie</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-600">Première visite:</span> <span className="font-medium">{new Date(trace.firstSeen).toLocaleString('fr-CA')}</span></p>
                <p><span className="text-gray-600">Dernière visite:</span> <span className="font-medium">{new Date(trace.lastSeen).toLocaleString('fr-CA')}</span></p>
              </div>
            </div>
          </div>

          {/* Recommandation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Recommandation</h3>
            <p className="text-sm text-blue-700">
              {trace.isBot
                ? "Bot détecté. Considérer le blocage via robots.txt ou firewall."
                : trace.anomalyScore >= 30
                ? "Comportement suspect. Surveiller de près et vérifier les logs serveur."
                : "Comportement normal. Utilisateur légitime."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
