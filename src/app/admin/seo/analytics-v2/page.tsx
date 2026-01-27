'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, Filter, AlertTriangle, Bot, User, Clock, Eye, MapPin,
  Smartphone, TrendingUp, Download, DollarSign, Users, Activity, Target,
  Globe, Monitor, Calendar, BarChart3, PieChart as PieChartIcon
} from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ===== INTERFACES =====

interface GAMetrics {
  activeUsers: number
  newUsers: number
  totalUsers: number
  sessions: number
  sessionsPerUser: number
  screenPageViews: number
  averageSessionDuration: number
  bounceRate: number
  engagementRate: number
  eventCount: number
  conversions: number
  totalRevenue: number
  engagedSessions: number
  userEngagementDuration: number
}

interface IPTrace {
  ip: string
  session_id: string
  client_id: string | null
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
    osVersion: string
    browser: string
    browserVersion: string
    screenResolution: string
    brand?: string
    model?: string
  }
  location: {
    country: string
    region: string
    city: string
  }
  traffic: {
    source: string
    medium: string
    campaign?: string
    term?: string
    content?: string
    referrer?: string
  }
  telemetry: {
    ga4_session_id?: string
    ga4_client_id?: string
    asn?: number
    asn_org?: string
    timezone?: string
    language?: string
    linked_via?: string
    linked_at?: string
  }
  pages: Array<{
    path: string
    views: number
    avgTime: number
  }>
  events: Array<{
    type: string
    count: number
  }>
  anomalyScore: number
  flags: string[]
  isBot: boolean
}

interface UTMCampaign {
  source: string
  medium: string
  campaign: string
  sessions: number
  users: number
  pageViews: number
  conversions: number
  revenue: number
  conversionRate: number
  avgSessionDuration: number
}

interface DeviceBreakdown {
  category: string
  os: string
  browser: string
  sessions: number
  users: number
  pageViews: number
  conversions: number
  avgDuration: number
}

interface GeoBreakdown {
  country: string
  region: string
  city: string
  sessions: number
  users: number
  conversions: number
  revenue: number
}

interface EventAnalysis {
  event_type: string
  event_name: string
  count: number
  unique_sessions: number
  avg_duration_ms: number
  pages: string[]
}

interface TimelineData {
  date: string
  sessions: number
  users: number
  conversions: number
  bots: number
  revenue: number
}

type TabType = 'overview' | 'ip-analysis' | 'utm-campaigns' | 'events' | 'security'
type SortField = 'pageViews' | 'sessions' | 'duration' | 'anomalyScore' | 'firstSeen'
type FilterType = 'all' | 'suspicious' | 'bots' | 'humans'

// ===== MAIN COMPONENT =====

export default function SEOAnalyticsV2Page() {
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')

  // Data
  const [metrics, setMetrics] = useState<GAMetrics | null>(null)
  const [traces, setTraces] = useState<IPTrace[]>([])
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown[]>([])
  const [geoBreakdown, setGeoBreakdown] = useState<GeoBreakdown[]>([])
  const [utmCampaigns, setUtmCampaigns] = useState<UTMCampaign[]>([])
  const [events, setEvents] = useState<EventAnalysis[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('pageViews')
  const [sortDesc, setSortDesc] = useState(true)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedIP, setSelectedIP] = useState<IPTrace | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [period])

  async function fetchAllData() {
    setLoading(true)
    try {
      // Fetch from multiple endpoints in parallel
      const [gaRes, ipRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/analytics?startDate=${getStartDate()}&endDate=today`),
        fetch(`/api/analytics/ip-details`),
        fetch(`/api/analytics/heatmap`) // Reuse heatmap endpoint for event analysis
      ])

      // Process GA4 data
      if (gaRes.ok) {
        const gaData = await gaRes.json()
        if (gaData.success && gaData.data.length > 0) {
          processGA4Data(gaData.data)
        }
      }

      // Process IP traces
      if (ipRes.ok) {
        const ipData = await ipRes.json()
        if (ipData.success) {
          processIPData(ipData.data)
        }
      }

      // Process events
      if (eventsRes.ok) {
        const eventData = await eventsRes.json()
        if (eventData.success) {
          processEventData(eventData.data)
        }
      }

    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function processGA4Data(data: any[]) {
    // Aggregate all GA4 metrics
    const aggregated: GAMetrics = {
      activeUsers: 0,
      newUsers: 0,
      totalUsers: 0,
      sessions: 0,
      sessionsPerUser: 0,
      screenPageViews: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      engagementRate: 0,
      eventCount: 0,
      conversions: 0,
      totalRevenue: 0,
      engagedSessions: 0,
      userEngagementDuration: 0
    }

    data.forEach(row => {
      aggregated.activeUsers += row.metrics.activeUsers || 0
      aggregated.newUsers += row.metrics.newUsers || 0
      aggregated.totalUsers += row.metrics.totalUsers || 0
      aggregated.sessions += row.metrics.sessions || 0
      aggregated.screenPageViews += row.metrics.screenPageViews || 0
      aggregated.averageSessionDuration += row.metrics.averageSessionDuration || 0
      aggregated.bounceRate += row.metrics.bounceRate || 0
      aggregated.engagementRate += row.metrics.engagementRate || 0
      aggregated.eventCount += row.metrics.eventCount || 0
      aggregated.conversions += row.metrics.conversions || 0
      aggregated.totalRevenue += row.metrics.totalRevenue || 0
      aggregated.engagedSessions += row.metrics.engagedSessions || 0
      aggregated.userEngagementDuration += row.metrics.userEngagementDuration || 0
    })

    // Calculate averages
    const count = data.length
    if (count > 0) {
      aggregated.averageSessionDuration /= count
      aggregated.bounceRate /= count
      aggregated.engagementRate /= count
      aggregated.sessionsPerUser = aggregated.totalUsers > 0
        ? aggregated.sessions / aggregated.totalUsers
        : 0
    }

    setMetrics(aggregated)

    // Build timeline
    buildTimeline(data)

    // Build device breakdown
    buildDeviceBreakdown(data)

    // Build geo breakdown
    buildGeoBreakdown(data)

    // Build UTM campaigns
    buildUTMCampaigns(data)
  }

  function buildTimeline(data: any[]) {
    // Group by date
    const dateMap = new Map<string, TimelineData>()

    data.forEach(row => {
      // GA4 returns date in YYYYMMDD format, need to parse
      const date = row.timestamp ? new Date(row.timestamp).toISOString().split('T')[0] : 'unknown'

      const existing = dateMap.get(date) || {
        date,
        sessions: 0,
        users: 0,
        conversions: 0,
        bots: 0,
        revenue: 0
      }

      existing.sessions += row.metrics.sessions || 0
      existing.users += row.metrics.totalUsers || 0
      existing.conversions += row.metrics.conversions || 0
      existing.revenue += row.metrics.totalRevenue || 0
      // Bot detection based on device (simplified)
      if (row.device.category === 'unknown' || row.device.browser.toLowerCase().includes('bot')) {
        existing.bots += row.metrics.sessions || 0
      }

      dateMap.set(date, existing)
    })

    const timelineData = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))

    setTimeline(timelineData)
  }

  function buildDeviceBreakdown(data: any[]) {
    const deviceMap = new Map<string, DeviceBreakdown>()

    data.forEach(row => {
      const key = `${row.device.category}|${row.device.os}|${row.device.browser}`

      const existing = deviceMap.get(key) || {
        category: row.device.category,
        os: row.device.os,
        browser: row.device.browser,
        sessions: 0,
        users: 0,
        pageViews: 0,
        conversions: 0,
        avgDuration: 0
      }

      existing.sessions += row.metrics.sessions || 0
      existing.users += row.metrics.totalUsers || 0
      existing.pageViews += row.metrics.screenPageViews || 0
      existing.conversions += row.metrics.conversions || 0
      existing.avgDuration += row.metrics.averageSessionDuration || 0

      deviceMap.set(key, existing)
    })

    const breakdown = Array.from(deviceMap.values())
      .map(d => ({
        ...d,
        avgDuration: d.sessions > 0 ? d.avgDuration / d.sessions : 0
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 20)

    setDeviceBreakdown(breakdown)
  }

  function buildGeoBreakdown(data: any[]) {
    const geoMap = new Map<string, GeoBreakdown>()

    data.forEach(row => {
      const key = `${row.location.country}|${row.location.region || 'unknown'}|${row.location.city}`

      const existing = geoMap.get(key) || {
        country: row.location.country,
        region: row.location.region || 'unknown',
        city: row.location.city,
        sessions: 0,
        users: 0,
        conversions: 0,
        revenue: 0
      }

      existing.sessions += row.metrics.sessions || 0
      existing.users += row.metrics.totalUsers || 0
      existing.conversions += row.metrics.conversions || 0
      existing.revenue += row.metrics.totalRevenue || 0

      geoMap.set(key, existing)
    })

    const breakdown = Array.from(geoMap.values())
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 30)

    setGeoBreakdown(breakdown)
  }

  function buildUTMCampaigns(data: any[]) {
    const campaignMap = new Map<string, UTMCampaign>()

    data.forEach(row => {
      const source = row.source?.source || 'direct'
      const medium = row.source?.medium || 'none'
      const campaign = row.source?.campaign || '(not set)'
      const key = `${source}|${medium}|${campaign}`

      const existing = campaignMap.get(key) || {
        source,
        medium,
        campaign,
        sessions: 0,
        users: 0,
        pageViews: 0,
        conversions: 0,
        revenue: 0,
        conversionRate: 0,
        avgSessionDuration: 0
      }

      existing.sessions += row.metrics.sessions || 0
      existing.users += row.metrics.totalUsers || 0
      existing.pageViews += row.metrics.screenPageViews || 0
      existing.conversions += row.metrics.conversions || 0
      existing.revenue += row.metrics.totalRevenue || 0
      existing.avgSessionDuration += row.metrics.averageSessionDuration || 0

      campaignMap.set(key, existing)
    })

    const campaigns = Array.from(campaignMap.values())
      .map(c => ({
        ...c,
        conversionRate: c.sessions > 0 ? (c.conversions / c.sessions) * 100 : 0,
        avgSessionDuration: c.sessions > 0 ? c.avgSessionDuration / c.sessions : 0
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 20)

    setUtmCampaigns(campaigns)
  }

  function processIPData(data: any[]) {
    // Convert IP details format to IPTrace format
    const ipTraces: IPTrace[] = data.map(ip => ({
      ip: ip.ip_hash,
      session_id: '', // Not provided by ip-details endpoint
      client_id: null,
      firstSeen: ip.first_seen,
      lastSeen: ip.last_seen,
      totalSessions: ip.session_count,
      totalPageViews: ip.total_page_views || 0,
      totalDuration: ip.total_duration_seconds,
      avgSessionDuration: ip.avg_duration_seconds,
      bounceRate: 0, // Calculate if needed
      device: {
        category: ip.devices?.[0] || 'unknown',
        os: 'unknown',
        osVersion: 'unknown',
        browser: 'unknown',
        browserVersion: 'unknown',
        screenResolution: 'unknown'
      },
      location: {
        country: ip.countries?.[0] || 'unknown',
        region: 'unknown',
        city: 'unknown'
      },
      traffic: {
        source: ip.sources?.[0] || 'direct',
        medium: 'unknown',
        referrer: ''
      },
      telemetry: {},
      pages: [],
      events: [],
      anomalyScore: 0, // Will calculate
      flags: [],
      isBot: false
    }))

    // Calculate anomalies
    ipTraces.forEach(trace => {
      const anomalies = detectAnomalies(trace)
      trace.anomalyScore = anomalies.score
      trace.flags = anomalies.flags
      trace.isBot = anomalies.isBot
    })

    setTraces(ipTraces)
  }

  function processEventData(data: any[]) {
    // Group events by type
    const eventMap = new Map<string, EventAnalysis>()

    // Process heatmap data (if available) or fetch from telemetry events
    // For now, create placeholder
    setEvents([])
  }

  function detectAnomalies(trace: IPTrace): { score: number; flags: string[]; isBot: boolean } {
    let score = 0
    const flags: string[] = []

    // Same detection logic as before
    const pagesPerMinute = trace.avgSessionDuration > 0
      ? trace.totalPageViews / (trace.avgSessionDuration / 60)
      : 0

    if (pagesPerMinute > 10) {
      score += 30
      flags.push('⚡ Navigation ultra-rapide')
    }

    if (trace.avgSessionDuration < 5) {
      score += 25
      flags.push('⏱️ Sessions très courtes')
    }

    if (trace.totalSessions > 50) {
      score += 20
      flags.push('🔄 Nombre anormal de sessions')
    }

    if (trace.bounceRate > 0.9) {
      score += 15
      flags.push('🚪 Taux de rebond élevé')
    }

    const isBot = score >= 50
    return { score, flags, isBot }
  }

  function getStartDate(): string {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  function exportFullData() {
    // Export comprehensive CSV with all metrics
    const headers = [
      'Date', 'Sessions', 'Users', 'Page Views', 'Conversions', 'Revenue',
      'Bounce Rate', 'Engagement Rate', 'Avg Duration', 'Events',
      'Active Users', 'New Users', 'Engaged Sessions'
    ]

    const rows = timeline.map(t => [
      t.date,
      t.sessions,
      t.users,
      metrics?.screenPageViews || 0,
      t.conversions,
      t.revenue.toFixed(2),
      (metrics?.bounceRate || 0).toFixed(2),
      (metrics?.engagementRate || 0).toFixed(2),
      (metrics?.averageSessionDuration || 0).toFixed(0),
      metrics?.eventCount || 0,
      metrics?.activeUsers || 0,
      metrics?.newUsers || 0,
      metrics?.engagedSessions || 0
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seo-analytics-full-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Calculate stats
  const stats = {
    totalSessions: metrics?.sessions || 0,
    totalUsers: metrics?.totalUsers || 0,
    totalPageViews: metrics?.screenPageViews || 0,
    totalConversions: metrics?.conversions || 0,
    totalRevenue: metrics?.totalRevenue || 0,
    avgSessionDuration: metrics?.averageSessionDuration || 0,
    bounceRate: (metrics?.bounceRate || 0) * 100,
    engagementRate: (metrics?.engagementRate || 0) * 100,
    totalIPs: traces.length,
    suspiciousIPs: traces.filter(t => t.anomalyScore >= 30 && !t.isBot).length,
    bots: traces.filter(t => t.isBot).length,
    humans: traces.filter(t => t.anomalyScore < 30).length,
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/seo" />

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/seo')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour au tableau de bord
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Complet</h1>
              <p className="mt-2 text-gray-600">
                Toutes les métriques GA4 + Telemetry + Métriques calculées
              </p>
            </div>
            <div className="flex gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="90d">90 derniers jours</option>
              </select>
              <button
                onClick={exportFullData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={16} />
                Export Complet
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards - 8 au lieu de 4 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <KPICard
            icon={<Users size={20} />}
            label="Total Utilisateurs"
            value={stats.totalUsers.toLocaleString()}
            subValue={`${metrics?.newUsers || 0} nouveaux`}
            color="blue"
          />
          <KPICard
            icon={<Activity size={20} />}
            label="Total Sessions"
            value={stats.totalSessions.toLocaleString()}
            subValue={`${metrics?.sessionsPerUser.toFixed(1) || 0} /user`}
            color="purple"
          />
          <KPICard
            icon={<Eye size={20} />}
            label="Pages Vues"
            value={stats.totalPageViews.toLocaleString()}
            subValue={`${(stats.totalPageViews / stats.totalSessions || 0).toFixed(1)} /session`}
            color="green"
          />
          <KPICard
            icon={<Target size={20} />}
            label="Conversions"
            value={stats.totalConversions.toLocaleString()}
            subValue={`${((stats.totalConversions / stats.totalSessions) * 100 || 0).toFixed(1)}% taux`}
            color="orange"
          />
          <KPICard
            icon={<DollarSign size={20} />}
            label="Revenu Total"
            value={`${stats.totalRevenue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}`}
            subValue={`${(stats.totalRevenue / stats.totalConversions || 0).toFixed(0)}$ /conv`}
            color="green"
          />
          <KPICard
            icon={<Clock size={20} />}
            label="Durée Moy."
            value={`${Math.round(stats.avgSessionDuration)}s`}
            subValue={`${stats.bounceRate.toFixed(1)}% rebond`}
            color="blue"
          />
          <KPICard
            icon={<TrendingUp size={20} />}
            label="Engagement"
            value={`${stats.engagementRate.toFixed(1)}%`}
            subValue={`${metrics?.engagedSessions || 0} sessions`}
            color="purple"
          />
          <KPICard
            icon={<Bot size={20} />}
            label="Qualité Trafic"
            value={`${stats.humans} humains`}
            subValue={`${stats.bots} bots détectés`}
            color="red"
          />
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<BarChart3 size={18} />}
              label="Vue d'ensemble"
            />
            <TabButton
              active={activeTab === 'ip-analysis'}
              onClick={() => setActiveTab('ip-analysis')}
              icon={<MapPin size={18} />}
              label="Analyse par IP"
            />
            <TabButton
              active={activeTab === 'utm-campaigns'}
              onClick={() => setActiveTab('utm-campaigns')}
              icon={<Target size={18} />}
              label="Campagnes UTM"
            />
            <TabButton
              active={activeTab === 'events'}
              onClick={() => setActiveTab('events')}
              icon={<Activity size={18} />}
              label="Événements"
            />
            <TabButton
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              icon={<AlertTriangle size={18} />}
              label="Sécurité & Bots"
            />
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab
                    timeline={timeline}
                    deviceBreakdown={deviceBreakdown}
                    geoBreakdown={geoBreakdown}
                    metrics={metrics}
                  />
                )}
                {activeTab === 'ip-analysis' && (
                  <IPAnalysisTab
                    traces={traces}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    sortField={sortField}
                    setSortField={setSortField}
                    sortDesc={sortDesc}
                    setSortDesc={setSortDesc}
                    selectedIP={selectedIP}
                    setSelectedIP={setSelectedIP}
                  />
                )}
                {activeTab === 'utm-campaigns' && (
                  <UTMCampaignsTab campaigns={utmCampaigns} />
                )}
                {activeTab === 'events' && (
                  <EventsTab events={events} />
                )}
                {activeTab === 'security' && (
                  <SecurityTab traces={traces} stats={stats} />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedIP && (
        <IPDetailModalV2 trace={selectedIP} onClose={() => setSelectedIP(null)} />
      )}
    </div>
  )
}

// ===== SUB-COMPONENTS =====

interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string
  subValue: string
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red'
}

function KPICard({ icon, label, value, subValue, color }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subValue}</p>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600 bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}

// TAB COMPONENTS (to be continued in next part...)

interface OverviewTabProps {
  timeline: TimelineData[]
  deviceBreakdown: DeviceBreakdown[]
  geoBreakdown: GeoBreakdown[]
  metrics: GAMetrics | null
}

function OverviewTab({ timeline, deviceBreakdown, geoBreakdown, metrics }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Timeline Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-4">📈 Tendances Temporelles</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" name="Sessions" />
              <Line type="monotone" dataKey="users" stroke="#10b981" name="Utilisateurs" />
              <Line type="monotone" dataKey="conversions" stroke="#f59e0b" name="Conversions" />
              <Line type="monotone" dataKey="bots" stroke="#ef4444" name="Bots" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Breakdown */}
      <div>
        <h3 className="text-lg font-semibold mb-4">📱 Breakdown par Device/Browser</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Browser</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilisateurs</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pages</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Durée moy.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deviceBreakdown.map((device, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{device.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{device.os}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{device.browser}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{device.sessions}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{device.users}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{device.pageViews}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{device.conversions}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{Math.round(device.avgDuration)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geo Breakdown */}
      <div>
        <h3 className="text-lg font-semibold mb-4">🌍 Breakdown Géographique</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pays</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Région</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilisateurs</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {geoBreakdown.map((geo, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{geo.country}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{geo.region}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{geo.city}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{geo.sessions}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{geo.users}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{geo.conversions}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ${geo.revenue.toFixed(0)}
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

// IP Analysis Tab - Will add next
interface IPAnalysisTabProps {
  traces: IPTrace[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  filterType: FilterType
  setFilterType: (f: FilterType) => void
  sortField: SortField
  setSortField: (f: SortField) => void
  sortDesc: boolean
  setSortDesc: (d: boolean) => void
  selectedIP: IPTrace | null
  setSelectedIP: (t: IPTrace | null) => void
}

function IPAnalysisTab(props: IPAnalysisTabProps) {
  // Implementation similar to current page but enhanced
  return (
    <div>
      <p className="text-gray-600">Table IP analysis - à implémenter</p>
    </div>
  )
}

function UTMCampaignsTab({ campaigns }: { campaigns: UTMCampaign[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">🎯 Performance des Campagnes UTM</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medium</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campagne</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilisateurs</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv.</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taux Conv.</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenu</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Durée moy.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.map((campaign, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{campaign.source}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{campaign.medium}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{campaign.campaign}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{campaign.sessions}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{campaign.users}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{campaign.conversions}</td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={`px-2 py-1 rounded-full ${
                    campaign.conversionRate > 5 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.conversionRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                  ${campaign.revenue.toFixed(0)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {Math.round(campaign.avgSessionDuration)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EventsTab({ events }: { events: EventAnalysis[] }) {
  return (
    <div>
      <p className="text-gray-600">Event analysis - à implémenter</p>
    </div>
  )
}

function SecurityTab({ traces, stats }: { traces: IPTrace[]; stats: any }) {
  const suspiciousTraces = traces.filter(t => t.anomalyScore >= 30 && !t.isBot)
  const botTraces = traces.filter(t => t.isBot)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-orange-600" size={24} />
            <span className="text-sm text-orange-900 font-medium">IP Suspectes</span>
          </div>
          <p className="text-3xl font-bold text-orange-900">{stats.suspiciousIPs}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="text-red-600" size={24} />
            <span className="text-sm text-red-900 font-medium">Bots Détectés</span>
          </div>
          <p className="text-3xl font-bold text-red-900">{stats.bots}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="text-green-600" size={24} />
            <span className="text-sm text-green-900 font-medium">Trafic Légitime</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{stats.humans}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-red-900">🚨 Bots Détectés</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg border border-gray-200">
            <thead className="bg-red-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">Sessions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">Pages</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {botTraces.slice(0, 20).map((trace, idx) => (
                <tr key={idx} className="hover:bg-red-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{trace.ip}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{trace.totalSessions}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{trace.totalPageViews}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 font-semibold">
                      {trace.anomalyScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {trace.flags.join(', ')}
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

function IPDetailModalV2({ trace, onClose }: { trace: IPTrace; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{trace.ip}</h2>
            <p className="text-sm text-gray-500">
              {trace.location.city}, {trace.location.region}, {trace.location.country}
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
          <p className="text-gray-600">Enhanced IP details - à implémenter</p>
        </div>
      </div>
    </div>
  )
}
