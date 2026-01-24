'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Activity,
  Zap,
  Database,
  Server,
  Globe,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  GitBranch,
  Radio,
  Wifi,
  Terminal,
  Eye,
  Shield,
  Target
} from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

type ViewMode = 'data-flow' | 'request-flow' | 'sequence' | 'architecture' | 'tracing' | 'pipeline'

interface RequestTrace {
  id: string
  timestamp: number
  method: string
  endpoint: string
  status: number
  duration: number
  ip: string
  region: string
  source: string
  errorCode?: string
  bytesIn: number
  bytesOut: number
}

interface DataPipeline {
  id: string
  name: string
  source: string
  type: string
  status: 'active' | 'idle' | 'error'
  throughput: number
  avgDuration: number
  errorCount: number
}

interface SystemMetrics {
  timestamp: number
  requests: number
  errors: number
  avgLatency: number
}

interface RealTelemetryData {
  success: boolean
  timeWindow: string
  timestamp: string
  metrics: {
    totalRequests: number
    totalErrors: number
    errorRate: string
    avgLatency: number
    totalDataTransferred: number
  }
  systemStatus: 'operational' | 'degraded' | 'critical'
  timeSeries: Array<{
    timestamp: number
    requests: number
    errors: number
    avgLatency: number
  }>
  requestTraces: RequestTrace[]
  pipelines: DataPipeline[]
  endpointDistribution: Array<{ endpoint: string; count: number }>
  statusDistribution: Array<{ status: number; count: number }>
  activeAlerts: any[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function CommandCenterPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('data-flow')
  const [timeWindow, setTimeWindow] = useState<string>('1h')
  const [telemetryData, setTelemetryData] = useState<RealTelemetryData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // ========================================================================
  // REAL DATA FETCHING - NO MOCK DATA
  // ========================================================================
  async function fetchRealTelemetryData() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/telemetry/command-center?window=${timeWindow}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch telemetry data: ${response.status}`)
      }

      const data: RealTelemetryData = await response.json()
      setTelemetryData(data)
    } catch (err) {
      console.error('[command-center] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Initial load + auto-refresh every 5 seconds
  useEffect(() => {
    fetchRealTelemetryData()

    const interval = setInterval(() => {
      fetchRealTelemetryData()
    }, 5000) // 5 seconds

    return () => clearInterval(interval)
  }, [timeWindow])

  // Loading state
  if (loading && !telemetryData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">
          <Activity className="animate-spin inline-block mr-2" size={24} />
          Chargement des données de télémétrie réelles...
        </div>
      </div>
    )
  }

  // Error state
  if (error && !telemetryData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-lg">
          <AlertCircle className="inline-block mr-2" size={24} />
          Erreur: {error}
        </div>
      </div>
    )
  }

  if (!telemetryData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Aucune donnée disponible</div>
      </div>
    )
  }

  const {
    metrics,
    systemStatus,
    timeSeries,
    requestTraces,
    pipelines,
    endpointDistribution,
    statusDistribution,
    activeAlerts
  } = telemetryData

  // Calculate real-time stats
  const totalRequests = metrics.totalRequests
  const totalErrors = metrics.totalErrors
  const avgLatency = metrics.avgLatency
  const dataTransferred = metrics.totalDataTransferred

  // Pie chart data for endpoints
  const pieData = endpointDistribution.slice(0, 6).map((item, idx) => ({
    name: item.endpoint.split('/').slice(-1)[0] || 'root',
    value: item.count,
    fullPath: item.endpoint,
  }))

  // Bar chart data for status codes
  const barData = statusDistribution.map(item => ({
    status: item.status.toString(),
    count: item.count,
    fill: item.status >= 500 ? '#ef4444' : item.status >= 400 ? '#f59e0b' : '#10b981'
  }))

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNav />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="text-blue-500" size={32} />
                NSA Command Center
              </h1>
              <p className="text-gray-400 mt-1">Real-time telemetry • 100% authentic data • No mocks</p>
            </div>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            {['5m', '15m', '1h', '6h', '24h'].map((window) => (
              <button
                key={window}
                onClick={() => setTimeWindow(window)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeWindow === window
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {window}
              </button>
            ))}
          </div>
        </div>

        {/* System Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          systemStatus === 'operational'
            ? 'bg-green-900/20 border-green-500'
            : systemStatus === 'degraded'
            ? 'bg-yellow-900/20 border-yellow-500'
            : 'bg-red-900/20 border-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {systemStatus === 'operational' ? (
                <CheckCircle className="text-green-500" size={24} />
              ) : (
                <AlertCircle className={systemStatus === 'degraded' ? 'text-yellow-500' : 'text-red-500'} size={24} />
              )}
              <div>
                <h3 className="text-white font-semibold">
                  System Status: {systemStatus.toUpperCase()}
                </h3>
                <p className="text-gray-400 text-sm">
                  {systemStatus === 'operational' && 'All systems operational'}
                  {systemStatus === 'degraded' && 'Performance degradation detected'}
                  {systemStatus === 'critical' && 'Critical issues detected - immediate attention required'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-sm">Error Rate</div>
              <div className={`text-2xl font-bold ${
                systemStatus === 'operational' ? 'text-green-500' :
                systemStatus === 'degraded' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {metrics.errorRate}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={<Activity size={24} />}
            label="Total Requests"
            value={totalRequests.toLocaleString()}
            sublabel={`Last ${timeWindow}`}
            color="blue"
          />
          <MetricCard
            icon={<AlertCircle size={24} />}
            label="Total Errors"
            value={totalErrors.toLocaleString()}
            sublabel={`${totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0}% error rate`}
            color="red"
          />
          <MetricCard
            icon={<Clock size={24} />}
            label="Avg Latency"
            value={`${avgLatency}ms`}
            sublabel="Average response time"
            color="yellow"
          />
          <MetricCard
            icon={<Database size={24} />}
            label="Data Transferred"
            value={`${dataTransferred}MB`}
            sublabel="Total outbound data"
            color="green"
          />
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 flex gap-2 bg-gray-800 p-2 rounded-lg overflow-x-auto">
          {[
            { id: 'data-flow', label: 'Data Flow', icon: GitBranch },
            { id: 'request-flow', label: 'Request Flow', icon: Radio },
            { id: 'sequence', label: 'Sequence Diagram', icon: Terminal },
            { id: 'architecture', label: 'Architecture', icon: Server },
            { id: 'tracing', label: 'Tracing', icon: Eye },
            { id: 'pipeline', label: 'Pipeline', icon: Wifi }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as ViewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                viewMode === mode.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <mode.icon size={16} />
              {mode.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Main Visualization */}
          <div className="col-span-2 bg-gray-800 rounded-lg p-6">
            {viewMode === 'data-flow' && <DataFlowView timeSeries={timeSeries} />}
            {viewMode === 'request-flow' && <RequestFlowView traces={requestTraces.slice(0, 20)} />}
            {viewMode === 'sequence' && <SequenceDiagramView traces={requestTraces.slice(0, 10)} />}
            {viewMode === 'architecture' && <ArchitectureView />}
            {viewMode === 'tracing' && <TracingView traces={requestTraces.slice(0, 15)} />}
            {viewMode === 'pipeline' && <PipelineView pipelines={pipelines} />}
          </div>

          {/* Right Column - Stats & Live Feed */}
          <div className="space-y-6">
            {/* Endpoint Distribution */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Endpoint Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Codes */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Status Code Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="status" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Live Request Feed */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Radio className="text-green-500 animate-pulse" size={16} />
                Live Request Feed
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {requestTraces.slice(0, 10).map((trace) => (
                  <div
                    key={trace.id}
                    className="text-xs p-2 bg-gray-900 rounded border-l-2"
                    style={{
                      borderLeftColor: trace.status >= 500 ? '#ef4444' : trace.status >= 400 ? '#f59e0b' : '#10b981'
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400">{new Date(trace.timestamp).toLocaleTimeString()}</span>
                      <span className={`font-mono ${
                        trace.status >= 500 ? 'text-red-500' :
                        trace.status >= 400 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {trace.status}
                      </span>
                    </div>
                    <div className="text-white font-mono">{trace.method} {trace.endpoint}</div>
                    <div className="text-gray-500 mt-1">{trace.duration}ms • {trace.region}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================
function MetricCard({
  icon,
  label,
  value,
  sublabel,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  color: 'blue' | 'red' | 'yellow' | 'green'
}) {
  const colorClasses = {
    blue: 'text-blue-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    green: 'text-green-500'
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={colorClasses[color]}>{icon}</div>
        <h3 className="text-gray-400 text-sm">{label}</h3>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-500 text-xs">{sublabel}</div>
    </div>
  )
}

// ============================================================================
// VIEW COMPONENTS
// ============================================================================

function DataFlowView({ timeSeries }: { timeSeries: SystemMetrics[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Real-Time Data Flow Metrics</h2>

      {/* Requests Chart */}
      <div className="mb-8">
        <h3 className="text-gray-400 text-sm mb-3">Requests per Minute</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timeSeries}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              stroke="#9ca3af"
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
              labelStyle={{ color: '#f3f4f6' }}
              labelFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            />
            <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Latency Chart */}
      <div>
        <h3 className="text-gray-400 text-sm mb-3">Average Latency (ms)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              stroke="#9ca3af"
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
              labelStyle={{ color: '#f3f4f6' }}
              labelFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            />
            <Line type="monotone" dataKey="avgLatency" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function RequestFlowView({ traces }: { traces: RequestTrace[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Request Flow Analysis</h2>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {traces.map((trace) => (
          <div key={trace.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  trace.status >= 500 ? 'bg-red-500' :
                  trace.status >= 400 ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                <span className="text-white font-mono text-sm">{trace.method} {trace.endpoint}</span>
              </div>
              <span className="text-gray-400 text-xs">{trace.duration}ms</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{new Date(trace.timestamp).toLocaleString()}</span>
              <span>•</span>
              <span>IP: {trace.ip}</span>
              <span>•</span>
              <span>{trace.region}</span>
              <span>•</span>
              <span>{(trace.bytesOut / 1024).toFixed(2)} KB</span>
            </div>
            {trace.errorCode && (
              <div className="mt-2 text-red-400 text-xs">Error: {trace.errorCode}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SequenceDiagramView({ traces }: { traces: RequestTrace[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Sequence Diagram</h2>
      <div className="space-y-6">
        {traces.map((trace, idx) => (
          <div key={trace.id} className="border-l-2 border-blue-500 pl-4">
            <div className="text-gray-400 text-xs mb-1">T+{idx * 100}ms</div>
            <div className="text-white font-mono text-sm">{trace.endpoint}</div>
            <div className="text-gray-500 text-xs mt-1">
              {trace.source} → API → Database → Response ({trace.duration}ms)
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ArchitectureView() {
  const layers = [
    { name: 'Frontend', color: '#3b82f6', components: ['React/Next.js', 'Client Browser'] },
    { name: 'API Layer', color: '#10b981', components: ['Route Handlers', 'Middleware', 'Auth'] },
    { name: 'External Services', color: '#f59e0b', components: ['Google Analytics', 'Semrush', 'QuickBooks', 'VoPay'] },
    { name: 'Database', color: '#8b5cf6', components: ['Supabase PostgreSQL', 'RLS Policies'] },
    { name: 'Infrastructure', color: '#ec4899', components: ['Vercel Edge Network', 'CDN'] }
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">System Architecture</h2>
      <div className="space-y-4">
        {layers.map((layer) => (
          <div key={layer.name} className="bg-gray-900 rounded-lg p-4 border-l-4" style={{ borderLeftColor: layer.color }}>
            <h3 className="text-white font-semibold mb-2">{layer.name}</h3>
            <div className="flex flex-wrap gap-2">
              {layer.components.map((comp) => (
                <span key={comp} className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 text-xs">
                  {comp}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TracingView({ traces }: { traces: RequestTrace[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Distributed Tracing</h2>
      <div className="space-y-3">
        {traces.map((trace) => (
          <div key={trace.id} className="bg-gray-900 rounded p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs font-mono">Trace ID: {trace.id.substring(0, 16)}...</span>
              <span className={`text-xs font-semibold ${
                trace.status >= 500 ? 'text-red-500' :
                trace.status >= 400 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {trace.status}
              </span>
            </div>
            <div className="text-white text-sm">{trace.endpoint}</div>
            <div className="text-gray-500 text-xs mt-1">Duration: {trace.duration}ms • Region: {trace.region}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineView({ pipelines }: { pipelines: DataPipeline[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Data Pipelines</h2>
      <div className="space-y-4">
        {pipelines.map((pipeline) => (
          <div key={pipeline.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{pipeline.name}</h3>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                pipeline.status === 'active' ? 'bg-green-900 text-green-300' :
                pipeline.status === 'error' ? 'bg-red-900 text-red-300' :
                'bg-gray-700 text-gray-300'
              }`}>
                {pipeline.status}
              </div>
            </div>
            <div className="text-gray-400 text-sm mb-2">Source: {pipeline.source}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{pipeline.throughput} ops</span>
              <span>•</span>
              <span>{pipeline.avgDuration}ms avg</span>
              {pipeline.errorCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-400">{pipeline.errorCount} errors</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
