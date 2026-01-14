/**
 * 🎛️ VoPay Widgets - Composants réutilisables
 * Utilisation simple avec shortcodes:
 *
 * <VoPayBalance />
 * <VoPayTransactions limit={5} />
 * <VoPayStats />
 * <VoPayTodayVolume />
 */

'use client'

import { useVoPayData } from '@/hooks/useVoPayData'
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// ============================================
// 💰 Widget: Balance VoPay
// ============================================
export function VoPayBalance() {
  const { data, loading, lastUpdate, refresh } = useVoPayData()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-full">
            <DollarSign className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Balance VoPay</h3>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(data.balance)}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-gray-400' : 'text-gray-600'} />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Disponible</span>
          <span className="font-semibold text-green-600">{formatCurrency(data.available)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Gelé</span>
          <span className="font-semibold text-gray-900">{formatCurrency(data.frozen)}</span>
        </div>
      </div>

      {lastUpdate && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Mis à jour: {formatDateTime(lastUpdate.toISOString())}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================
// 📊 Widget: Volume du jour
// ============================================
export function VoPayTodayVolume() {
  const { data, loading, refresh } = useVoPayData()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <TrendingUp className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Volume aujourd'hui</h3>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(data.todayInterac)}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-gray-400' : 'text-gray-600'} />
        </button>
      </div>
    </div>
  )
}

// ============================================
// 📈 Widget: Statistiques générales
// ============================================
export function VoPayStats() {
  const { data, loading } = useVoPayData()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques VoPay</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Taux de succès</p>
          <p className="text-xl font-bold text-green-600">
            {loading ? '...' : `${data.successRate.toFixed(1)}%`}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Volume hebdo</p>
          <p className="text-xl font-bold text-gray-900">
            {loading ? '...' : formatCurrency(data.weeklyVolume)}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Interac en attente</p>
          <p className="text-xl font-bold text-orange-600">
            {loading ? '...' : data.pendingInterac}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Interac aujourd'hui</p>
          <p className="text-xl font-bold text-blue-600">
            {loading ? '...' : formatCurrency(data.todayInterac)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 📜 Widget: Transactions récentes
// ============================================
interface VoPayTransactionsProps {
  limit?: number
  showFilters?: boolean
}

export function VoPayTransactions({ limit = 5, showFilters = false }: VoPayTransactionsProps) {
  const { data, loading, refresh } = useVoPayData()

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'complete' || s === 'completed' || s === 'successful')
      return <CheckCircle size={16} className="text-green-500" />
    if (s === 'pending' || s.includes('processing'))
      return <Clock size={16} className="text-blue-500" />
    if (s === 'failed' || s === 'error')
      return <XCircle size={16} className="text-red-500" />
    return <AlertTriangle size={16} className="text-amber-500" />
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'complete' || s === 'completed' || s === 'successful')
      return 'bg-green-100 text-green-700'
    if (s === 'pending' || s.includes('processing'))
      return 'bg-blue-100 text-blue-700'
    if (s === 'failed' || s === 'error')
      return 'bg-red-100 text-red-700'
    if (s === 'cancelled')
      return 'bg-gray-100 text-gray-700'
    return 'bg-amber-100 text-amber-700'
  }

  const getTransactionAmount = (tx: any) => {
    const debit = parseFloat(tx.DebitAmount || '0')
    const credit = parseFloat(tx.CreditAmount || '0')

    if (debit > 0) return { amount: debit, type: 'Sortie', isDebit: true }
    if (credit > 0) return { amount: credit, type: 'Entrée', isDebit: false }
    return { amount: 0, type: 'N/A', isDebit: false }
  }

  const transactions = data.recentTransactions.slice(0, limit)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Transactions récentes</h3>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {loading && transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chargement des transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucune transaction récente
          </div>
        ) : (
          transactions.map((tx) => {
            const { amount, type, isDebit } = getTransactionAmount(tx)
            return (
              <div key={tx.TransactionID} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(tx.TransactionStatus)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {tx.FullName || 'N/A'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(tx.TransactionStatus)}`}>
                          {tx.TransactionStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className={`px-2 py-0.5 rounded ${isDebit ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                          {type}
                        </span>
                        <span>#{tx.TransactionID}</span>
                        {tx.TransactionType && (
                          <>
                            <span>•</span>
                            <span>{tx.TransactionType}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDateTime(tx.TransactionDateTime)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                      {isDebit ? '-' : '+'}{formatCurrency(amount)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================
// 🎛️ Widget: Mini Balance (Compact)
// ============================================
export function VoPayBalanceMini() {
  const { data, loading } = useVoPayData()

  return (
    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 mb-1">Balance VoPay</p>
          <p className="text-2xl font-bold">
            {loading ? '...' : formatCurrency(data.balance)}
          </p>
        </div>
        <DollarSign size={32} className="opacity-80" />
      </div>
    </div>
  )
}
