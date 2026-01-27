'use client'

import { useEffect, useState } from 'react'
import AdminNav from '@/components/admin/AdminNav'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface FunnelStage {
  funnel_stage: string
  sessions: number
  conversions: number
  conversion_rate: number
  mobile_sessions: number
  desktop_sessions: number
  avg_events: number
  avg_seconds: number
}

interface TimelineData {
  date: string
  total_events: number
  unique_sessions: number
  converted_sessions: number
  mobile_events: number
  desktop_events: number
}

interface AbandonData {
  abandon_page: string
  exit_stage: string
  abandon_count: number
  abandon_rate: number
  mobile_abandons: number
  desktop_abandons: number
}

interface JourneyData {
  journey_visual: string
  path_length: number
  count: number
}

interface SourceData {
  utm_source: string | null
  utm_medium: string | null
  sessions: number
  conversions: number
  conversion_rate: number
}

interface PageMetric {
  page_url: string
  views: number
  unique_sessions: number
  avg_duration_seconds: number
  views_per_session: string
}

interface SessionDetail {
  session_id: string
  client_id: string
  created_at: string
  last_activity_at: string
  duration_seconds: number
  device: {
    type: string
    browser: string
    os: string
  }
  source: {
    referrer: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
  }
  location: {
    country_code: string | null
    asn: number | null
  }
  events: {
    total: number
    page_views: number
    form_interactions: number
  }
  ip_hash: string | null
}

interface HeatmapData {
  day_of_week: number
  hour: number
  event_count: number
}

export default function AnalyticsPage() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [abandons, setAbandons] = useState<AbandonData[]>([])
  const [journeys, setJourneys] = useState<JourneyData[]>([])
  const [sources, setSources] = useState<SourceData[]>([])
  const [pages, setPages] = useState<PageMetric[]>([])
  const [sessions, setSessions] = useState<SessionDetail[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [
          funnelRes,
          timelineRes,
          abandonsRes,
          journeysRes,
          sourcesRes,
          pagesRes,
          sessionsRes,
          heatmapRes
        ] = await Promise.all([
          fetch('/api/analytics/funnel'),
          fetch('/api/analytics/timeline'),
          fetch('/api/analytics/abandons'),
          fetch('/api/analytics/journeys'),
          fetch('/api/analytics/sources'),
          fetch('/api/analytics/pages'),
          fetch('/api/analytics/sessions?limit=20'),
          fetch('/api/analytics/heatmap')
        ])

        const [
          funnelData,
          timelineData,
          abandonsData,
          journeysData,
          sourcesData,
          pagesData,
          sessionsData,
          heatmapData
        ] = await Promise.all([
          funnelRes.json(),
          timelineRes.json(),
          abandonsRes.json(),
          journeysRes.json(),
          sourcesRes.json(),
          pagesRes.json(),
          sessionsRes.json(),
          heatmapRes.json()
        ])

        setFunnel(funnelData.data || [])
        setTimeline(timelineData.data || [])
        setAbandons(abandonsData.data || [])
        setJourneys(journeysData.data || [])
        setSources(sourcesData.data || [])
        setPages(pagesData.data || [])
        setSessions(sessionsData.data || [])
        setHeatmap(heatmapData.data || [])
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <>
        <AdminNav currentPage="/admin/analytics" />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Chargement des données...</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <>
      <AdminNav currentPage="/admin/analytics" />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Vue d'ensemble des sessions et conversions</p>
          </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Sessions</div>
            <div className="text-3xl font-bold text-gray-900">
              {funnel.reduce((sum, stage) => sum + stage.sessions, 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Conversions</div>
            <div className="text-3xl font-bold text-green-600">
              {funnel.reduce((sum, stage) => sum + stage.conversions, 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Taux Conversion</div>
            <div className="text-3xl font-bold text-blue-600">
              {funnel.length > 0
                ? (
                    (funnel.reduce((sum, stage) => sum + stage.conversions, 0) /
                      funnel.reduce((sum, stage) => sum + stage.sessions, 0)) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Événements (7j)</div>
            <div className="text-3xl font-bold text-purple-600">
              {timeline.reduce((sum, day) => sum + day.total_events, 0)}
            </div>
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Funnel de Conversion</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="funnel_stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" />
              <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Timeline Événements (30 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="unique_sessions"
                stroke="#3b82f6"
                name="Sessions Uniques"
              />
              <Line
                type="monotone"
                dataKey="converted_sessions"
                stroke="#10b981"
                name="Conversions"
              />
              <Line
                type="monotone"
                dataKey="mobile_events"
                stroke="#f59e0b"
                name="Mobile"
              />
              <Line
                type="monotone"
                dataKey="desktop_events"
                stroke="#8b5cf6"
                name="Desktop"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Abandons Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Points d'Abandon (Top 10)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={abandons.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="abandon_page" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="abandon_count" fill="#ef4444" name="Abandons" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Device Split */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Répartition Mobile vs Desktop</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Mobile',
                      value: funnel.reduce((sum, stage) => sum + stage.mobile_sessions, 0)
                    },
                    {
                      name: 'Desktop',
                      value: funnel.reduce((sum, stage) => sum + stage.desktop_sessions, 0)
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Journeys Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Parcours Utilisateurs (Top 10)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parcours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fréquence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {journeys.slice(0, 10).map((journey, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {journey.journey_visual || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {journey.path_length}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {journey.count || 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Funnel Details Table */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Détails Funnel</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {funnel.map((stage, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {stage.funnel_stage}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{stage.sessions}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{stage.conversions}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {stage.conversion_rate}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{stage.avg_events}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {Math.round(stage.avg_seconds)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Traffic Sources Table */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Sources de Trafic (UTM + Referrer)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medium
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux Conv.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sources.map((source, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {source.utm_source || 'Direct'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {source.utm_medium || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600">{source.sessions}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{source.conversions}</td>
                    <td className="px-6 py-4 text-sm font-medium text-purple-600">
                      {source.conversion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Heatmap d'Activité (7j x 24h)</h2>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-25 gap-1 text-xs">
              <div className="col-span-1"></div>
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="text-center text-gray-500 font-medium">
                  {i}h
                </div>
              ))}
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, dayIdx) => (
                <div key={dayIdx} className="contents">
                  <div className="text-right pr-2 text-gray-500 font-medium">{day}</div>
                  {Array.from({ length: 24 }, (_, hourIdx) => {
                    const cell = heatmap.find(
                      h => h.day_of_week === dayIdx && h.hour === hourIdx
                    )
                    const count = cell?.event_count || 0
                    const maxCount = Math.max(...heatmap.map(h => h.event_count || 0))
                    const intensity = maxCount > 0 ? count / maxCount : 0
                    const bgColor =
                      intensity > 0.7
                        ? 'bg-green-600'
                        : intensity > 0.4
                        ? 'bg-green-400'
                        : intensity > 0.2
                        ? 'bg-green-200'
                        : intensity > 0
                        ? 'bg-green-100'
                        : 'bg-gray-100'

                    return (
                      <div
                        key={hourIdx}
                        className={`h-8 ${bgColor} rounded flex items-center justify-center text-xs text-gray-700`}
                        title={`${day} ${hourIdx}h: ${count} events`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Page Metrics Table */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Métriques par Page (7 derniers jours)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions Uniques
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée Moy.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vues/Session
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {page.page_url || '/'}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600">{page.views}</td>
                    <td className="px-6 py-4 text-sm text-purple-600">{page.unique_sessions}</td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      {page.avg_duration_seconds}s
                    </td>
                    <td className="px-6 py-4 text-sm text-orange-600">{page.views_per_session}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sessions Detail Table */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Sessions Récentes (Détails par IP)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Hash
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pays
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créé
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-900">
                      {session.session_id}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {session.ip_hash || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          session.client_id === 'linked'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {session.client_id === 'linked' ? 'Lié' : 'Anonyme'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {session.device.type} - {session.device.browser}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-blue-600">
                      {session.location.country_code || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {session.source.utm_source ||
                       (session.source.referrer ? 'Referrer' : 'Direct')}
                    </td>
                    <td className="px-4 py-3 text-xs text-purple-600">
                      {session.events.total} ({session.events.page_views}pg)
                    </td>
                    <td className="px-4 py-3 text-xs text-green-600">
                      {session.duration_seconds}s
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleString('fr-CA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
