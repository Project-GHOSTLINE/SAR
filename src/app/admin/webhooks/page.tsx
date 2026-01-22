'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Filter,
  Calendar, Download, RotateCcw, Eye, X, ArrowRight, Activity, TrendingUp,
  Database, Server, Box, Zap, ChevronDown, Search
} from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

interface Webhook {
  id: string
  provider: string
  event_type: string
  status: string
  external_id: string | null
  environment: string
  processing_time_ms: number | null
  retry_count: number
  error_message: string | null
  payload: any
  received_at: string
  processed_at: string | null
}

interface Stats {
  total: number
  by_status: {
    received: number
    processing: number
    completed: number
    failed: number
    retrying: number
  }
  by_provider: Record<string, number>
  avg_processing_time_ms: number
  success_rate: number
}

const PROVIDER_COLORS = {
  vopay: 'bg-blue-500',
  flinks: 'bg-purple-500',
  quickbooks: 'bg-green-500',
  stripe: 'bg-indigo-500'
}

const PROVIDER_NAMES = {
  vopay: 'VoPay',
  flinks: 'Flinks',
  quickbooks: 'QuickBooks',
  stripe: 'Stripe'
}

const STATUS_COLORS = {
  received: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  retrying: 'bg-orange-100 text-orange-800 border-orange-200'
}

const STATUS_ICONS = {
  received: Clock,
  processing: RefreshCw,
  completed: CheckCircle,
  failed: XCircle,
  retrying: RotateCcw
}

export default function WebhooksPage() {
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  // Filters
  const [providerFilter, setProviderFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [environmentFilter, setEnvironmentFilter] = useState<string>('production')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    fetchWebhooks()
  }, [providerFilter, statusFilter, environmentFilter])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (providerFilter) params.append('provider', providerFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (environmentFilter) params.append('environment', environmentFilter)

      const response = await fetch(`/api/admin/webhooks/list?${params.toString()}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error('Failed to fetch webhooks:', response.status)
        return
      }

      const data = await response.json()
      setWebhooks(data.webhooks || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (webhookId: string) => {
    if (!confirm('Retry this webhook?')) return

    try {
      setRetrying(webhookId)
      const response = await fetch('/api/admin/webhooks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId })
      })

      if (!response.ok) throw new Error('Failed to retry webhook')

      alert('Webhook marked for retry!')
      await fetchWebhooks()
    } catch (error) {
      console.error('Error retrying webhook:', error)
      alert('Failed to retry webhook')
    } finally {
      setRetrying(null)
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (providerFilter) params.append('provider', providerFilter)
    if (statusFilter) params.append('status', statusFilter)
    if (environmentFilter) params.append('environment', environmentFilter)

    window.open(`/api/admin/webhooks/export?${params.toString()}`, '_blank')
  }

  const filteredWebhooks = webhooks.filter(w => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      w.external_id?.toLowerCase().includes(query) ||
      w.event_type.toLowerCase().includes(query) ||
      w.provider.toLowerCase().includes(query)
    )
  })

  if (loading && !webhooks.length) {
    return (
      <>
        <AdminNav currentPage="/admin/webhooks" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNav currentPage="/admin/webhooks" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  Webhook Monitoring
                </h1>
                <p className="text-base text-gray-600 mt-1">Real-time webhook tracking and analytics</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all hover:scale-105 hover:shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={fetchWebhooks}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Data Flow Visualization */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Data Flow Pipeline
            </h2>
            <div className="flex items-center justify-between gap-4">
              {/* Provider */}
              <div className="flex-1">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-all">
                  <Server className="w-8 h-8 mb-2 opacity-80" />
                  <div className="text-sm opacity-80 mb-1">External Provider</div>
                  <div className="text-2xl font-bold">VoPay / Flinks</div>
                </div>
              </div>

              <ArrowRight className="w-8 h-8 text-gray-400 flex-shrink-0 animate-pulse" />

              {/* API */}
              <div className="flex-1">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-all">
                  <Zap className="w-8 h-8 mb-2 opacity-80" />
                  <div className="text-sm opacity-80 mb-1">API Endpoint</div>
                  <div className="text-2xl font-bold">/api/webhooks</div>
                </div>
              </div>

              <ArrowRight className="w-8 h-8 text-gray-400 flex-shrink-0 animate-pulse" />

              {/* Database */}
              <div className="flex-1">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-all">
                  <Database className="w-8 h-8 mb-2 opacity-80" />
                  <div className="text-sm opacity-80 mb-1">Database</div>
                  <div className="text-2xl font-bold">Supabase</div>
                </div>
              </div>

              <ArrowRight className="w-8 h-8 text-gray-400 flex-shrink-0 animate-pulse" />

              {/* Processing */}
              <div className="flex-1">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-all">
                  <Box className="w-8 h-8 mb-2 opacity-80" />
                  <div className="text-sm opacity-80 mb-1">Processing</div>
                  <div className="text-2xl font-bold">Business Logic</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Webhooks</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Activity className="w-10 h-10 text-blue-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                    <p className="text-3xl font-bold text-green-600">{stats.success_rate}%</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{stats.by_status.completed}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Failed</p>
                    <p className="text-3xl font-bold text-red-600">{stats.by_status.failed}</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Time</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.avg_processing_time_ms}ms</p>
                  </div>
                  <Clock className="w-10 h-10 text-blue-500 opacity-20" />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Provider Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Providers</option>
                  <option value="vopay">VoPay</option>
                  <option value="flinks">Flinks</option>
                  <option value="quickbooks">QuickBooks</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="received">Received</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="retrying">Retrying</option>
                </select>
              </div>

              {/* Environment Filter - Production Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                <div className="w-full px-4 py-2 border border-green-300 bg-green-50 rounded-lg text-green-800 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Production Only
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID, type..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Webhooks Table */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      External ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWebhooks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No webhooks found
                      </td>
                    </tr>
                  ) : (
                    filteredWebhooks.map((webhook) => {
                      const StatusIcon = STATUS_ICONS[webhook.status as keyof typeof STATUS_ICONS] || Clock
                      return (
                        <tr key={webhook.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${PROVIDER_COLORS[webhook.provider as keyof typeof PROVIDER_COLORS] || 'bg-gray-500'}`} />
                              <span className="text-sm font-medium text-gray-900">
                                {PROVIDER_NAMES[webhook.provider as keyof typeof PROVIDER_NAMES] || webhook.provider}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{webhook.event_type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono text-gray-600">
                              {webhook.external_id ? webhook.external_id.substring(0, 12) + '...' : 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[webhook.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                              <StatusIcon className="w-3 h-3" />
                              {webhook.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {webhook.processing_time_ms ? `${webhook.processing_time_ms}ms` : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(webhook.received_at).toLocaleDateString('fr-CA')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(webhook.received_at).toLocaleTimeString('fr-CA')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedWebhook(webhook)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {webhook.status === 'failed' && (
                                <button
                                  onClick={() => handleRetry(webhook.id)}
                                  disabled={retrying === webhook.id}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Retry webhook"
                                >
                                  {retrying === webhook.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedWebhook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Webhook Details</h3>
                <p className="text-sm text-gray-600 mt-1">ID: {selectedWebhook.id}</p>
              </div>
              <button
                onClick={() => setSelectedWebhook(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Provider</label>
                  <p className="text-base text-gray-900 mt-1">{selectedWebhook.provider}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Event Type</label>
                  <p className="text-base text-gray-900 mt-1">{selectedWebhook.event_type}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <p className="text-base text-gray-900 mt-1">{selectedWebhook.status}</p>
                </div>
                {selectedWebhook.error_message && (
                  <div>
                    <label className="text-sm font-semibold text-red-700">Error Message</label>
                    <p className="text-base text-red-600 mt-1">{selectedWebhook.error_message}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-700">Payload</label>
                  <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs font-mono">
                    {JSON.stringify(selectedWebhook.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
