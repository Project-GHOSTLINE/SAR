'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Activity, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, Loader2, ArrowRight, BarChart3,
  PieChart, LineChart, Zap
} from 'lucide-react'

interface VoPayStats {
  total: number
  totalSuccessful: number
  totalFailed: number
  totalPending: number
  todayVolume: number
  yesterdayVolume: number
  weekVolume: number
  monthVolume: number
  volumeChange: number
  weekSuccessRate: number
  monthSuccessRate: number
  weekFailed: number
  weekTotal: number
  monthTotal: number
  dailyStats: Array<{
    date: string
    total: number
    successful: number
    failed: number
    pending: number
    volume: number
  }>
  recentTransactions: Array<{
    id: string
    transaction_id: string
    transaction_type: string
    transaction_amount: number
    status: string
    received_at: string
  }>
}

export default function VoPayMetricsTab() {
  const [stats, setStats] = useState<VoPayStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/webhooks/stats', { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('Failed to fetch VoPay stats')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching VoPay stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">Error Loading VoPay Data</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  // Calculate transaction type breakdown
  const transactionTypes = stats.recentTransactions.reduce((acc, t) => {
    acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalTransactions = stats.dailyStats.reduce((sum, day) => sum + day.total, 0)
  const totalSuccessful = stats.dailyStats.reduce((sum, day) => sum + day.successful, 0)
  const totalFailed = stats.dailyStats.reduce((sum, day) => sum + day.failed, 0)

  return (
    <div className="space-y-8">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">VoPay Metrics & Analytics</h2>
          <p className="text-gray-600 mt-1">Real-time transaction monitoring and performance insights</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today Volume */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
              stats.volumeChange >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {stats.volumeChange >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(stats.volumeChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-sm opacity-80 mb-1">Today's Volume</div>
          <div className="text-3xl font-bold">{formatCurrency(stats.todayVolume)}</div>
          <div className="text-xs opacity-60 mt-2">vs yesterday: {formatCurrency(stats.yesterdayVolume)}</div>
        </div>

        {/* Week Volume */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 opacity-80" />
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">
              7 days
            </div>
          </div>
          <div className="text-sm opacity-80 mb-1">Week Volume</div>
          <div className="text-3xl font-bold">{formatCurrency(stats.weekVolume)}</div>
          <div className="text-xs opacity-60 mt-2">{stats.weekTotal} transactions</div>
        </div>

        {/* Month Volume */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 opacity-80" />
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">
              30 days
            </div>
          </div>
          <div className="text-sm opacity-80 mb-1">Month Volume</div>
          <div className="text-3xl font-bold">{formatCurrency(stats.monthVolume)}</div>
          <div className="text-xs opacity-60 mt-2">{stats.monthTotal} transactions</div>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 opacity-80" />
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20">
              Week
            </div>
          </div>
          <div className="text-sm opacity-80 mb-1">Success Rate</div>
          <div className="text-3xl font-bold">{stats.weekSuccessRate}%</div>
          <div className="text-xs opacity-60 mt-2">Month: {stats.monthSuccessRate}%</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume Chart */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-blue-600" />
                Transaction Volume (7 days)
              </h3>
              <p className="text-sm text-gray-600 mt-1">Daily transaction amounts</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.dailyStats.map((day) => {
              const maxVolume = Math.max(...stats.dailyStats.map(d => d.volume))
              const percentage = maxVolume > 0 ? (day.volume / maxVolume) * 100 : 0

              return (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{formatDate(day.date)}</span>
                    <span className="text-gray-900 font-bold">{formatCurrency(day.volume)}</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-semibold text-gray-700">
                        {day.total} transactions
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Success vs Failed Chart */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-green-600" />
                Success vs Failed (7 days)
              </h3>
              <p className="text-sm text-gray-600 mt-1">Transaction status breakdown</p>
            </div>
          </div>

          {/* Pie Chart Visualization */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Success Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="20"
                  strokeDasharray={`${(totalSuccessful / totalTransactions) * 251.2} 251.2`}
                  className="transition-all duration-500"
                />
                {/* Failed Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeDasharray={`${(totalFailed / totalTransactions) * 251.2} 251.2`}
                  strokeDashoffset={`-${(totalSuccessful / totalTransactions) * 251.2}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{totalTransactions}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700">Successful</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-700">{totalSuccessful}</div>
                <div className="text-xs text-gray-600">
                  {totalTransactions > 0 ? ((totalSuccessful / totalTransactions) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700">Failed</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-700">{totalFailed}</div>
                <div className="text-xs text-gray-600">
                  {totalTransactions > 0 ? ((totalFailed / totalTransactions) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Types Breakdown */}
      {Object.keys(transactionTypes).length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Transactions by Type
              </h3>
              <p className="text-sm text-gray-600 mt-1">Recent transaction types distribution</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(transactionTypes)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const percentage = (count / stats.recentTransactions.length) * 100

                return (
                  <div key={type} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{type}</span>
                      <span className="text-2xl font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{percentage.toFixed(1)}% of total</div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Failed Transactions Alert */}
      {stats.totalFailed > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900">Failed Transactions Detected</h3>
                <p className="text-red-700 mt-1">
                  {stats.totalFailed} transaction(s) failed and may require attention
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-sm text-red-600">
                    Week: {stats.weekFailed} failed | Success rate: {stats.weekSuccessRate}%
                  </span>
                </div>
              </div>
            </div>
            <a
              href="/admin/webhooks?status=failed&provider=vopay&environment=production"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all hover:scale-105 hover:shadow-lg"
            >
              View Details
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/admin/webhooks?provider=vopay&environment=production"
          className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all hover:scale-105"
        >
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">View All Webhooks</h3>
          <p className="text-sm text-gray-600">Access complete webhook logs and details</p>
        </a>

        <a
          href="/admin/webhooks?provider=vopay&status=failed&environment=production"
          className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all hover:scale-105"
        >
          <div className="flex items-center justify-between mb-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Failed Transactions</h3>
          <p className="text-sm text-gray-600">Review and retry failed transactions</p>
        </a>

        <button
          onClick={fetchStats}
          className="group bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-white"
        >
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 opacity-80" />
            <RefreshCw className="w-5 h-5 opacity-80 group-hover:rotate-180 transition-transform duration-500" />
          </div>
          <h3 className="text-lg font-bold mb-1">Refresh Data</h3>
          <p className="text-sm opacity-80">Update metrics and charts</p>
        </button>
      </div>
    </div>
  )
}
