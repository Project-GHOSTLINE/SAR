'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Send, Download, AlertTriangle, CheckCircle, Clock, XCircle, Filter, Search, DollarSign, TrendingUp, Users } from 'lucide-react'

interface VoPayTransaction {
  TransactionID: string
  TransactionDateTime: string
  TransactionType: string
  TransactionStatus: string
  DebitAmount: string
  CreditAmount: string
  FullName: string
  ClientReferenceNumber: string
  Notes: string
  Currency: string
}

interface VoPayStats {
  balance: number
  available: number
  frozen: number
  pendingInterac: number
  todayInterac: number
  weeklyVolume: number
  successRate: number
  recentTransactions: VoPayTransaction[]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}

export default function VoPayDashboard() {
  const [vopayData, setVopayData] = useState<VoPayStats>({
    balance: 0,
    available: 0,
    frozen: 0,
    pendingInterac: 0,
    todayInterac: 0,
    weeklyVolume: 0,
    successRate: 0,
    recentTransactions: []
  })
  const [vopayLoading, setVopayLoading] = useState(false)
  const [vopayError, setVopayError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions' | 'send'>('overview')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchVopayData = async () => {
    setVopayLoading(true)
    setVopayError(null)
    try {
      const res = await fetch('/api/admin/vopay', { credentials: 'include' })
      if (res.ok) {
        const result = await res.json()
        if (result.success && result.data) {
          setVopayData(result.data)
        }
      } else {
        const error = await res.json()
        setVopayError(error.details || 'Erreur de connexion VoPay')
      }
    } catch (error) {
      console.error('Erreur VoPay:', error)
      setVopayError('Impossible de se connecter à VoPay')
    } finally {
      setVopayLoading(false)
    }
  }

  useEffect(() => {
    // Chargement initial
    fetchVopayData()

    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(() => {
      fetchVopayData()
    }, 30000) // 30 secondes

    // Cleanup à la destruction du composant
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'complete' || s === 'completed') return <CheckCircle size={16} className="text-green-500" />
    if (s === 'pending' || s.includes('processing')) return <Clock size={16} className="text-blue-500" />
    if (s === 'failed' || s === 'error') return <XCircle size={16} className="text-red-500" />
    return <AlertTriangle size={16} className="text-amber-500" />
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'complete' || s === 'completed') return 'bg-green-100 text-green-700'
    if (s === 'pending' || s.includes('processing')) return 'bg-blue-100 text-blue-700'
    if (s === 'failed' || s === 'error') return 'bg-red-100 text-red-700'
    return 'bg-amber-100 text-amber-700'
  }

  const filteredTransactions = vopayData.recentTransactions.filter(tx => {
    const matchesStatus = filterStatus === 'all' || tx.TransactionStatus.toLowerCase() === filterStatus
    const matchesSearch = searchQuery === '' ||
      tx.FullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.TransactionID.includes(searchQuery) ||
      tx.ClientReferenceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Status', 'Montant', 'Client', 'Référence', 'Notes']
    const rows = vopayData.recentTransactions.map(tx => [
      tx.TransactionID,
      tx.TransactionDateTime,
      tx.TransactionType,
      tx.TransactionStatus,
      `${tx.DebitAmount || tx.CreditAmount} ${tx.Currency}`,
      tx.FullName || 'N/A',
      tx.ClientReferenceNumber || 'N/A',
      tx.Notes || ''
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vopay-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#003d2c]">VoPay</h1>
          <p className="text-gray-500 mt-1">Gestion des paiements Interac</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={vopayData.recentTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={fetchVopayData}
            disabled={vopayLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm font-medium hover:bg-[#059669] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={vopayLoading ? 'animate-spin' : ''} />
            {vopayLoading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {vopayError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800">Erreur de connexion</h3>
              <p className="text-sm text-red-600">{vopayError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Solde total</span>
            <DollarSign size={20} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {vopayLoading ? '...' : formatCurrency(vopayData.balance)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Disponible</span>
            <CheckCircle size={20} className="text-[#10B981]" />
          </div>
          <p className="text-2xl font-bold text-[#10B981]">
            {vopayLoading ? '...' : formatCurrency(vopayData.available)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Volume 7j</span>
            <TrendingUp size={20} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {vopayLoading ? '...' : formatCurrency(vopayData.weeklyVolume)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Taux succès</span>
            <Users size={20} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-[#10B981]">
            {vopayLoading ? '...' : `${vopayData.successRate}%`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-2">
            {[
              { id: 'overview', label: 'Vue d\'ensemble' },
              { id: 'transactions', label: 'Transactions' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-[#10B981] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Clock size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">En attente</p>
                      <p className="text-2xl font-bold text-blue-900">{vopayData.pendingInterac}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <DollarSign size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700">Aujourd'hui</p>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(vopayData.todayInterac)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                      <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-700">Gelé</p>
                      <p className="text-2xl font-bold text-amber-900">{formatCurrency(vopayData.frozen)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Transactions récentes</h3>
                <div className="space-y-2">
                  {vopayData.recentTransactions.slice(0, 5).map(tx => (
                    <div key={tx.TransactionID} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(tx.TransactionStatus)}
                        <div>
                          <p className="font-medium text-gray-900">{tx.FullName || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{tx.TransactionType} • {tx.TransactionDateTime}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {tx.DebitAmount !== '0.00' ? `-${tx.DebitAmount}` : `+${tx.CreditAmount}`} {tx.Currency}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(tx.TransactionStatus)}`}>
                          {tx.TransactionStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {selectedTab === 'transactions' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, ID, référence..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="complete">Complété</option>
                    <option value="pending">En attente</option>
                    <option value="failed">Échoué</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map(tx => (
                      <tr key={tx.TransactionID} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{tx.TransactionID}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(tx.TransactionDateTime).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{tx.FullName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{tx.TransactionType}</td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          <span className={tx.DebitAmount !== '0.00' ? 'text-red-600' : 'text-green-600'}>
                            {tx.DebitAmount !== '0.00' ? `-${tx.DebitAmount}` : `+${tx.CreditAmount}`} {tx.Currency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(tx.TransactionStatus)}`}>
                            {getStatusIcon(tx.TransactionStatus)}
                            {tx.TransactionStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{tx.Notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Aucune transaction trouvée</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
