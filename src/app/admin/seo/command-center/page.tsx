'use client'

import { useState, useEffect, useCallback } from 'react'
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
  userAgent: string
  location: string
  dataFlow: string[]
}

interface DataPipeline {
  id: string
  name: string
  source: string
  transformations: string[]
  destination: string
  status: 'active' | 'idle' | 'error'
  throughput: number
}

interface SystemMetrics {
  timestamp: number
  requests: number
  errors: number
  avgLatency: number
  dataTransferred: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function CommandCenterPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('data-flow')
  const [requestTraces, setRequestTraces] = useState<RequestTrace[]>([])
  const [pipelines, setPipelines] = useState<DataPipeline[]>([])
  const [metrics, setMetrics] = useState<SystemMetrics[]>([])
  const [liveRequests, setLiveRequests] = useState<number>(0)
  const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'critical'>('operational')

  // Simulation de données en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      generateMockData()
    }, 2000)

    generateInitialData()

    return () => clearInterval(interval)
  }, [])

  function generateInitialData() {
    // Pipelines de données
    const mockPipelines: DataPipeline[] = [
      {
        id: 'p1',
        name: 'Analytics Data Pipeline',
        source: 'Google Analytics API',
        transformations: ['Parse', 'Aggregate', 'Normalize', 'Enrich'],
        destination: 'Supabase (seo_ga4_metrics_daily)',
        status: 'active',
        throughput: 1247
      },
      {
        id: 'p2',
        name: 'Semrush Data Pipeline',
        source: 'Semrush API',
        transformations: ['Fetch CSV', 'Parse', 'Transform', 'Store'],
        destination: 'Supabase (seo_semrush_domain_daily)',
        status: 'active',
        throughput: 342
      },
      {
        id: 'p3',
        name: 'User Tracking Pipeline',
        source: 'Client Browser',
        transformations: ['Capture Event', 'Sanitize', 'Deduplicate', 'Batch'],
        destination: 'Analytics Warehouse',
        status: 'active',
        throughput: 8934
      },
      {
        id: 'p4',
        name: 'Admin Auth Pipeline',
        source: 'Login Request',
        transformations: ['Validate', 'Hash', 'Verify JWT', 'Set Cookie'],
        destination: 'Session Store',
        status: 'idle',
        throughput: 12
      },
      {
        id: 'p5',
        name: 'SEO Metrics Aggregation',
        source: 'Multiple Sources (GA4, Semrush, GSC)',
        transformations: ['Fetch', 'Join', 'Calculate', 'Cache'],
        destination: 'Dashboard API',
        status: 'active',
        throughput: 567
      }
    ]

    setPipelines(mockPipelines)

    // Métriques historiques
    const now = Date.now()
    const mockMetrics: SystemMetrics[] = []
    for (let i = 60; i >= 0; i--) {
      mockMetrics.push({
        timestamp: now - i * 60000,
        requests: Math.floor(Math.random() * 100 + 50),
        errors: Math.floor(Math.random() * 5),
        avgLatency: Math.floor(Math.random() * 200 + 100),
        dataTransferred: Math.floor(Math.random() * 500 + 200)
      })
    }
    setMetrics(mockMetrics)
  }

  function generateMockData() {
    // Nouvelles traces de requêtes
    const endpoints = [
      '/api/admin/analytics',
      '/api/admin/analytics/dashboard',
      '/api/seo/collect/ga4',
      '/api/seo/collect/semrush',
      '/api/seo/semrush/keyword-research',
      '/api/seo/semrush/backlinks',
      '/api/admin/client/list',
      '/api/webhooks/vopay'
    ]

    const newTrace: RequestTrace = {
      id: `req-${Date.now()}`,
      timestamp: Date.now(),
      method: ['GET', 'POST'][Math.floor(Math.random() * 2)],
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      status: Math.random() > 0.95 ? 500 : Math.random() > 0.9 ? 404 : 200,
      duration: Math.floor(Math.random() * 500 + 50),
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: ['Chrome/120', 'Safari/17', 'Firefox/121', 'Edge/120'][Math.floor(Math.random() * 4)],
      location: ['Montreal, CA', 'Toronto, CA', 'Vancouver, CA', 'Calgary, CA'][Math.floor(Math.random() * 4)],
      dataFlow: generateDataFlow()
    }

    setRequestTraces(prev => [newTrace, ...prev].slice(0, 100))
    setLiveRequests(prev => prev + 1)

    // Mise à jour des métriques
    const newMetric: SystemMetrics = {
      timestamp: Date.now(),
      requests: Math.floor(Math.random() * 100 + 50),
      errors: Math.floor(Math.random() * 5),
      avgLatency: Math.floor(Math.random() * 200 + 100),
      dataTransferred: Math.floor(Math.random() * 500 + 200)
    }

    setMetrics(prev => [...prev.slice(-59), newMetric])

    // Mise à jour du statut système
    const errorRate = newMetric.errors / newMetric.requests
    if (errorRate > 0.1) {
      setSystemStatus('critical')
    } else if (errorRate > 0.05 || newMetric.avgLatency > 500) {
      setSystemStatus('degraded')
    } else {
      setSystemStatus('operational')
    }
  }

  function generateDataFlow(): string[] {
    const flows = [
      ['Client', 'Next.js API', 'Supabase', 'Response'],
      ['Client', 'Next.js API', 'Google Analytics', 'Transform', 'Supabase', 'Cache', 'Response'],
      ['Client', 'Auth Middleware', 'Verify JWT', 'Next.js API', 'Response'],
      ['Cron', 'Next.js API', 'Semrush API', 'Parse CSV', 'Supabase', 'Response'],
      ['Client', 'Next.js API', 'Redis Cache', 'Response'],
      ['Client', 'Next.js API', 'Supabase RPC', 'Response']
    ]
    return flows[Math.floor(Math.random() * flows.length)]
  }

  const statusColor = {
    operational: 'text-green-500 bg-green-100',
    degraded: 'text-yellow-500 bg-yellow-100',
    critical: 'text-red-500 bg-red-100'
  }

  const totalRequests = metrics.reduce((sum, m) => sum + m.requests, 0)
  const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0)
  const avgLatency = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.avgLatency, 0) / metrics.length)
    : 0
  const totalData = metrics.reduce((sum, m) => sum + m.dataTransferred, 0)

  // Distribution des requêtes par endpoint
  const endpointDistribution = requestTraces.slice(0, 50).reduce((acc, req) => {
    acc[req.endpoint] = (acc[req.endpoint] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(endpointDistribution).map(([name, value]) => ({
    name: name.split('/').pop() || name,
    value
  }))

  // Données pour graphique status
  const statusData = [
    { name: '2xx Success', value: requestTraces.filter(r => r.status >= 200 && r.status < 300).length },
    { name: '4xx Client Error', value: requestTraces.filter(r => r.status >= 400 && r.status < 500).length },
    { name: '5xx Server Error', value: requestTraces.filter(r => r.status >= 500).length }
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNav currentPage="/admin/seo" />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/seo')}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="text-blue-500" size={32} />
                COMMAND CENTER
                <span className="text-sm font-normal text-gray-400 ml-2">/ Real-Time Data Intelligence</span>
              </h1>
              <p className="mt-1 text-gray-400 font-mono text-sm">
                CLASSIFICATION: INTERNAL • SYSTEM STATUS: {systemStatus.toUpperCase()}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-mono text-sm font-bold ${statusColor[systemStatus]}`}>
            <Radio className="inline mr-2" size={16} />
            {systemStatus === 'operational' ? '● OPERATIONAL' : systemStatus === 'degraded' ? '⚠ DEGRADED' : '🔴 CRITICAL'}
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={<Activity size={24} />}
            label="Total Requests"
            value={totalRequests.toLocaleString()}
            sublabel="Last 60 minutes"
            color="blue"
          />
          <MetricCard
            icon={<AlertCircle size={24} />}
            label="Total Errors"
            value={totalErrors.toLocaleString()}
            sublabel={`${((totalErrors / totalRequests) * 100).toFixed(2)}% error rate`}
            color="red"
          />
          <MetricCard
            icon={<Clock size={24} />}
            label="Avg Latency"
            value={`${avgLatency}ms`}
            sublabel="Response time"
            color="purple"
          />
          <MetricCard
            icon={<Database size={24} />}
            label="Data Transferred"
            value={`${(totalData / 1024).toFixed(1)} MB`}
            sublabel="Total throughput"
            color="green"
          />
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <ViewTab
            active={viewMode === 'data-flow'}
            onClick={() => setViewMode('data-flow')}
            icon={<GitBranch size={16} />}
            label="Data Flow"
          />
          <ViewTab
            active={viewMode === 'request-flow'}
            onClick={() => setViewMode('request-flow')}
            icon={<Zap size={16} />}
            label="Request Flow"
          />
          <ViewTab
            active={viewMode === 'sequence'}
            onClick={() => setViewMode('sequence')}
            icon={<TrendingUp size={16} />}
            label="Sequence Diagram"
          />
          <ViewTab
            active={viewMode === 'architecture'}
            onClick={() => setViewMode('architecture')}
            icon={<Server size={16} />}
            label="Architecture"
          />
          <ViewTab
            active={viewMode === 'tracing'}
            onClick={() => setViewMode('tracing')}
            icon={<Target size={16} />}
            label="Tracing"
          />
          <ViewTab
            active={viewMode === 'pipeline'}
            onClick={() => setViewMode('pipeline')}
            icon={<Wifi size={16} />}
            label="Pipeline"
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main Visualization */}
          <div className="lg:col-span-2 space-y-6">
            {viewMode === 'data-flow' && <DataFlowView metrics={metrics} />}
            {viewMode === 'request-flow' && <RequestFlowView traces={requestTraces} />}
            {viewMode === 'sequence' && <SequenceDiagramView traces={requestTraces.slice(0, 10)} />}
            {viewMode === 'architecture' && <ArchitectureView />}
            {viewMode === 'tracing' && <TracingView traces={requestTraces} />}
            {viewMode === 'pipeline' && <PipelineView pipelines={pipelines} />}
          </div>

          {/* Right: Live Feed & Stats */}
          <div className="space-y-6">
            {/* Live Request Feed */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Terminal size={16} className="text-green-500" />
                  LIVE REQUEST FEED
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-400 font-mono">{liveRequests} reqs</span>
                </div>
              </div>
              <div className="h-[400px] overflow-y-auto p-4 space-y-2 font-mono text-xs">
                {requestTraces.slice(0, 20).map((trace) => (
                  <div
                    key={trace.id}
                    className={`p-2 rounded border ${
                      trace.status >= 500
                        ? 'bg-red-900/20 border-red-700/50'
                        : trace.status >= 400
                        ? 'bg-yellow-900/20 border-yellow-700/50'
                        : 'bg-green-900/20 border-green-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${
                        trace.method === 'GET' ? 'text-blue-400' : 'text-purple-400'
                      }`}>
                        {trace.method}
                      </span>
                      <span className={`text-xs ${
                        trace.status >= 500
                          ? 'text-red-400'
                          : trace.status >= 400
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}>
                        {trace.status}
                      </span>
                    </div>
                    <div className="text-gray-300 truncate">{trace.endpoint}</div>
                    <div className="flex items-center justify-between mt-1 text-gray-500">
                      <span>{trace.duration}ms</span>
                      <span>{trace.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="font-bold text-white mb-4">Endpoint Distribution</h3>
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

            {/* Status Distribution */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="font-bold text-white mb-4">Status Code Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Components for each view mode

function DataFlowView({ metrics }: { metrics: SystemMetrics[] }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-Time Data Flow Analytics</h2>

      {/* Requests Over Time */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Requests Per Minute</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={metrics.slice(-20)}>
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
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelFormatter={(ts) => new Date(ts).toLocaleTimeString('fr-CA')}
            />
            <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Latency Over Time */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Average Latency (ms)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={metrics.slice(-20)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="timestamp"
              stroke="#9ca3af"
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelFormatter={(ts) => new Date(ts).toLocaleTimeString('fr-CA')}
            />
            <Line type="monotone" dataKey="avgLatency" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function RequestFlowView({ traces }: { traces: RequestTrace[] }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Request Flow Analysis</h2>
      <div className="space-y-4">
        {traces.slice(0, 10).map((trace) => (
          <div key={trace.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  trace.method === 'GET' ? 'bg-blue-600' : 'bg-purple-600'
                } text-white`}>
                  {trace.method}
                </span>
                <span className="text-gray-300 font-mono text-sm">{trace.endpoint}</span>
              </div>
              <span className={`text-sm font-semibold ${
                trace.status >= 500 ? 'text-red-400' :
                trace.status >= 400 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {trace.status}
              </span>
            </div>

            {/* Data Flow Visualization */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {trace.dataFlow.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                  <div className="px-3 py-1 bg-gray-700 rounded text-xs text-gray-300 font-mono whitespace-nowrap">
                    {step}
                  </div>
                  {idx < trace.dataFlow.length - 1 && (
                    <div className="text-blue-500">→</div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{trace.ip}</span>
              <span>{trace.duration}ms</span>
              <span>{new Date(trace.timestamp).toLocaleTimeString('fr-CA')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SequenceDiagramView({ traces }: { traces: RequestTrace[] }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Sequence Diagram</h2>
      <div className="overflow-x-auto">
        <div className="min-w-[800px] space-y-8">
          {traces.map((trace, idx) => (
            <div key={trace.id} className="relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-blue-500"></div>
              <div className="pl-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 -ml-[26px]"></div>
                  <span className="text-gray-400 text-xs font-mono">
                    T+{((trace.timestamp - traces[0].timestamp) / 1000).toFixed(2)}s
                  </span>
                  <span className="text-white font-semibold">{trace.endpoint}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-900 border border-gray-700 rounded p-2">
                    <div className="text-gray-500 mb-1">Client</div>
                    <div className="text-white font-mono">{trace.ip}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded p-2">
                    <div className="text-gray-500 mb-1">API Layer</div>
                    <div className="text-white font-mono">{trace.method}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded p-2">
                    <div className="text-gray-500 mb-1">Processing</div>
                    <div className="text-white font-mono">{trace.duration}ms</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded p-2">
                    <div className="text-gray-500 mb-1">Response</div>
                    <div className={`font-mono ${
                      trace.status >= 500 ? 'text-red-400' :
                      trace.status >= 400 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {trace.status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ArchitectureView() {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">System Architecture</h2>
      <div className="space-y-6">
        {/* Frontend Layer */}
        <ArchLayer
          name="Frontend Layer"
          color="blue"
          nodes={['Next.js Client', 'React Components', 'TailwindCSS', 'Leaflet Maps']}
        />

        {/* API Layer */}
        <ArchLayer
          name="API Layer"
          color="purple"
          nodes={['Next.js API Routes', 'Authentication', 'Rate Limiting', 'Caching (Redis)']}
        />

        {/* External Services */}
        <ArchLayer
          name="External Services"
          color="green"
          nodes={['Google Analytics API', 'Semrush API', 'VoPay API', 'Twilio SMS']}
        />

        {/* Database Layer */}
        <ArchLayer
          name="Database Layer"
          color="orange"
          nodes={['Supabase PostgreSQL', 'RPC Functions', 'Real-time Subscriptions', 'Storage Buckets']}
        />

        {/* Infrastructure */}
        <ArchLayer
          name="Infrastructure"
          color="red"
          nodes={['Vercel Edge Network', 'CDN', 'SSL/TLS', 'Monitoring']}
        />
      </div>
    </div>
  )
}

function ArchLayer({ name, color, nodes }: { name: string; color: string; nodes: string[] }) {
  const colors = {
    blue: 'border-blue-500 bg-blue-500/10',
    purple: 'border-purple-500 bg-purple-500/10',
    green: 'border-green-500 bg-green-500/10',
    orange: 'border-orange-500 bg-orange-500/10',
    red: 'border-red-500 bg-red-500/10'
  }

  return (
    <div className={`border-l-4 ${colors[color as keyof typeof colors]} p-4 rounded-r-lg`}>
      <h3 className="font-bold text-white mb-3">{name}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {nodes.map((node, idx) => (
          <div key={idx} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300">
            {node}
          </div>
        ))}
      </div>
    </div>
  )
}

function TracingView({ traces }: { traces: RequestTrace[] }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Distributed Tracing</h2>
      <div className="space-y-3">
        {traces.slice(0, 15).map((trace) => (
          <div key={trace.id} className="bg-gray-900 border border-gray-700 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-mono text-sm">Trace ID: {trace.id}</span>
              <span className="text-gray-400 text-xs">
                {new Date(trace.timestamp).toLocaleString('fr-CA')}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                trace.status >= 500 ? 'bg-red-500' :
                trace.status >= 400 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}></div>
              <span className="text-gray-300 text-sm">{trace.endpoint}</span>
              <span className="text-gray-500 text-xs ml-auto">{trace.duration}ms</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">IP: {trace.ip}</span>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{trace.userAgent}</span>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{trace.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineView({ pipelines }: { pipelines: DataPipeline[] }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Data Pipelines</h2>
      <div className="space-y-6">
        {pipelines.map((pipeline) => (
          <div key={pipeline.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{pipeline.name}</h3>
              <div className={`px-3 py-1 rounded text-xs font-bold ${
                pipeline.status === 'active' ? 'bg-green-600' :
                pipeline.status === 'error' ? 'bg-red-600' :
                'bg-gray-600'
              } text-white`}>
                {pipeline.status.toUpperCase()}
              </div>
            </div>

            {/* Pipeline Flow */}
            <div className="mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <div className="px-3 py-2 bg-blue-900 border border-blue-700 rounded text-xs text-blue-300 font-mono whitespace-nowrap flex-shrink-0">
                  📥 {pipeline.source}
                </div>
                <div className="text-blue-500">→</div>
                {pipeline.transformations.map((transform, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                    <div className="px-3 py-2 bg-purple-900 border border-purple-700 rounded text-xs text-purple-300 font-mono whitespace-nowrap">
                      ⚙️ {transform}
                    </div>
                    {idx < pipeline.transformations.length - 1 && (
                      <div className="text-purple-500">→</div>
                    )}
                  </div>
                ))}
                <div className="text-green-500">→</div>
                <div className="px-3 py-2 bg-green-900 border border-green-700 rounded text-xs text-green-300 font-mono whitespace-nowrap flex-shrink-0">
                  📤 {pipeline.destination}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Throughput: <span className="text-white font-semibold">{pipeline.throughput} ops/min</span></span>
              <span>Status: <span className="text-green-400">✓ {pipeline.status}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper Components

function MetricCard({ icon, label, value, sublabel, color }: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  color: 'blue' | 'red' | 'purple' | 'green'
}) {
  const colors = {
    blue: 'bg-blue-900/50 border-blue-700 text-blue-400',
    red: 'bg-red-900/50 border-red-700 text-red-400',
    purple: 'bg-purple-900/50 border-purple-700 text-purple-400',
    green: 'bg-green-900/50 border-green-700 text-green-400'
  }

  return (
    <div className={`${colors[color]} rounded-lg border p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <div>{icon}</div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sublabel}</div>
    </div>
  )
}

function ViewTab({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
