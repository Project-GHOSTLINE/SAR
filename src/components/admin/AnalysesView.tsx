'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Search, Filter, RefreshCw, FileText, DollarSign,
  Calendar, TrendingUp, Eye, Edit, Trash2, Check, X,
  User, Mail, Phone, MapPin, Building, CreditCard,
  ChevronDown, ChevronUp, ArrowLeft, CheckCircle, XCircle,
  Clock, AlertCircle, Tag, UserCheck
} from 'lucide-react'

interface ClientAnalysis {
  id: string
  client_name: string
  client_email?: string
  client_phones?: string[]
  client_address?: string
  inverite_guid?: string
  source: 'inverite' | 'flinks'
  analysis_date: string
  raw_data: any
  client_info?: any
  accounts?: any[]
  total_accounts: number
  total_balance: number
  total_transactions: number
  status: 'pending' | 'reviewed' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
  assigned_to?: string
  assigned_at?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

interface AnalysisStats {
  total: number
  pending: number
  reviewed: number
  approved: number
  rejected: number
  by_assignee: {
    sandra: number
    michel: number
    unassigned: number
  }
  by_source?: {
    inverite: number
    flinks: number
  }
  temporal?: {
    today: number
    week: number
    month: number
  }
  financial?: {
    total_balance: number
    avg_balance: number
    max_balance: number
  }
}

export default function AnalysesView() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyses, setAnalyses] = useState<ClientAnalysis[]>([])
  const [stats, setStats] = useState<AnalysisStats>({
    total: 0,
    pending: 0,
    reviewed: 0,
    approved: 0,
    rejected: 0,
    by_assignee: { sandra: 0, michel: 0, unassigned: 0 }
  })

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected analysis for detail view
  const [selectedAnalysis, setSelectedAnalysis] = useState<ClientAnalysis | null>(null)
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fetch analyses
  const fetchAnalyses = async () => {
    try {
      setRefreshing(true)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (assignedFilter !== 'all') params.append('assigned_to', assignedFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)

      const res = await fetch(`/api/admin/client-analysis?${params.toString()}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        const analysesData = (data.data || []).map((analysis: ClientAnalysis) => {
          // Extraire les comptes depuis raw_data si disponible
          if (analysis.raw_data?.accounts && !analysis.accounts) {
            analysis.accounts = analysis.raw_data.accounts
          }
          // Extraire les infos client depuis raw_data.clientInfo si disponible
          if (analysis.raw_data?.clientInfo) {
            const clientInfo = analysis.raw_data.clientInfo
            analysis.client_email = analysis.client_email || clientInfo.email
            analysis.client_address = analysis.client_address || clientInfo.address
            analysis.client_phones = analysis.client_phones || (clientInfo.phone ? [clientInfo.phone] : [])
          }
          return analysis
        })
        setAnalyses(analysesData)
        setStats(data.stats || stats)
      } else if (res.status === 401) {
        router.push('/admin')
      }
    } catch (error) {
      console.error('Erreur fetch analyses:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Update analysis
  const updateAnalysis = async (id: string, updates: any) => {
    try {
      const res = await fetch('/api/admin/client-analysis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...updates })
      })

      if (res.ok) {
        await fetchAnalyses()
        // Update selected analysis if it's the one being updated
        if (selectedAnalysis && selectedAnalysis.id === id) {
          const data = await res.json()
          setSelectedAnalysis(data.data)
        }
      }
    } catch (error) {
      console.error('Erreur update:', error)
    }
  }

  // Delete analysis
  const deleteAnalysis = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) return

    try {
      const res = await fetch(`/api/admin/client-analysis?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        await fetchAnalyses()
        if (selectedAnalysis && selectedAnalysis.id === id) {
          setSelectedAnalysis(null)
        }
      }
    } catch (error) {
      console.error('Erreur delete:', error)
    }
  }

  useEffect(() => {
    fetchAnalyses()
  }, [statusFilter, assignedFilter, sourceFilter])

  // Filter analyses by search query
  const filteredAnalyses = analyses.filter(analysis => {
    const query = searchQuery.toLowerCase()
    return (
      analysis.client_name.toLowerCase().includes(query) ||
      analysis.client_email?.toLowerCase().includes(query) ||
      analysis.inverite_guid?.toLowerCase().includes(query)
    )
  })

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'En attente' },
      reviewed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Eye, label: 'Révisé' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Approuvé' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejeté' }
    }

    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${config.bg} ${config.text}`}>
        <Icon size={18} />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin text-[#10B981] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des analyses...</p>
        </div>
      </div>
    )
  }

  // If analysis is selected, show detail view
  if (selectedAnalysis) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedAnalysis(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Retour à la liste</span>
        </button>

        {/* Analysis Detail */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedAnalysis.client_name}</h2>
              <div className="flex items-center gap-3 text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar size={18} />
                  {formatDate(selectedAnalysis.created_at)}
                </span>
                <span className="text-gray-300">•</span>
                <span className="uppercase text-sm font-bold">{selectedAnalysis.source}</span>
              </div>
            </div>
            {getStatusBadge(selectedAnalysis.status)}
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {selectedAnalysis.client_email && (
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{selectedAnalysis.client_email}</p>
                </div>
              </div>
            )}
            {selectedAnalysis.client_phones && selectedAnalysis.client_phones.length > 0 && (
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="font-medium text-gray-900">{selectedAnalysis.client_phones[0]}</p>
                </div>
              </div>
            )}
            {selectedAnalysis.client_address && (
              <div className="flex items-center gap-3 col-span-2">
                <MapPin size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Adresse</p>
                  <p className="font-medium text-gray-900">{selectedAnalysis.client_address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <Building size={24} className="text-blue-600" />
              </div>
              <p className="text-sm text-blue-600 font-medium mb-1">Comptes</p>
              <p className="text-3xl font-bold text-blue-900">{selectedAnalysis.total_accounts}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <DollarSign size={24} className="text-green-600" />
              </div>
              <p className="text-sm text-green-600 font-medium mb-1">Balance Totale</p>
              <p className="text-3xl font-bold text-green-900">{formatCurrency(selectedAnalysis.total_balance)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp size={24} className="text-purple-600" />
              </div>
              <p className="text-sm text-purple-600 font-medium mb-1">Transactions</p>
              <p className="text-3xl font-bold text-purple-900">{selectedAnalysis.total_transactions}</p>
            </div>
          </div>

          {/* Accounts List */}
          {selectedAnalysis.accounts && selectedAnalysis.accounts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Comptes Bancaires</h3>
              {selectedAnalysis.accounts.map((account: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedAccount(expandedAccount === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <CreditCard size={24} className="text-gray-600" />
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{account.title || account.accountNumber || `Compte ${index + 1}`}</p>
                        <p className="text-sm text-gray-600">{account.type || 'Type inconnu'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(account.balance || 0)}</p>
                      {expandedAccount === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {expandedAccount === index && account.transactions && (
                    <div className="p-6 bg-white">
                      <h4 className="font-bold text-gray-900 mb-4">Transactions Récentes</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {account.transactions.slice(0, 20).map((tx: any, txIndex: number) => {
                          // Nettoyer les valeurs (enlever $ et espaces)
                          const cleanValue = (val: any) => {
                            if (!val) return 0
                            const cleaned = String(val).replace(/[$,\s]/g, '')
                            return parseFloat(cleaned) || 0
                          }

                          // Flinks: withdrawals/deposits, Inverite: debit/credit
                          const withdrawal = cleanValue(tx.withdrawals || tx.withdrawal || tx.debit)
                          const deposit = cleanValue(tx.deposits || tx.deposit || tx.credit)

                          return (
                            <div key={txIndex} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{tx.description || tx.details || 'Transaction'}</p>
                                <p className="text-sm text-gray-500">{tx.date}</p>
                              </div>
                              <div className="text-right">
                                {withdrawal > 0 && (
                                  <p className="font-bold text-red-600">-{formatCurrency(withdrawal)}</p>
                                )}
                                {deposit > 0 && (
                                  <p className="font-bold text-green-600">+{formatCurrency(deposit)}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200">
            <select
              value={selectedAnalysis.status}
              onChange={(e) => updateAnalysis(selectedAnalysis.id, { status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
            >
              <option value="pending">En attente</option>
              <option value="reviewed">Révisé</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </select>

            <select
              value={selectedAnalysis.assigned_to || ''}
              onChange={(e) => updateAnalysis(selectedAnalysis.id, { assigned_to: e.target.value || null })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
            >
              <option value="">Non assigné</option>
              <option value="Sandra">Sandra</option>
              <option value="Michel">Michel</option>
            </select>

            <button
              onClick={() => deleteAnalysis(selectedAnalysis.id)}
              className="ml-auto px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Users size={24} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Clock size={24} className="text-yellow-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">En attente</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Eye size={24} className="text-blue-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Révisés</p>
          <p className="text-3xl font-bold text-blue-600">{stats.reviewed}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle size={24} className="text-green-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Approuvés</p>
          <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <XCircle size={24} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Rejetés</p>
          <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="reviewed">Révisé</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
          </select>
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
          >
            <option value="all">Tous les assignés</option>
            <option value="Sandra">Sandra</option>
            <option value="Michel">Michel</option>
            <option value="">Non assigné</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
          >
            <option value="all">Toutes les sources</option>
            <option value="inverite">Inverite</option>
            <option value="flinks">Flinks</option>
          </select>
        </div>
        <button
          onClick={fetchAnalyses}
          disabled={refreshing}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </div>

      {/* Analyses List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Client</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Source</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Comptes</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Balance</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Assigné à</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAnalyses.map((analysis) => (
                <tr key={analysis.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{analysis.client_name}</p>
                    {analysis.client_email && (
                      <p className="text-sm text-gray-600">{analysis.client_email}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 uppercase">
                      {analysis.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{analysis.total_accounts}</td>
                  <td className="px-6 py-4 text-gray-900 font-bold">{formatCurrency(analysis.total_balance)}</td>
                  <td className="px-6 py-4">{getStatusBadge(analysis.status)}</td>
                  <td className="px-6 py-4">
                    {analysis.assigned_to ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        <UserCheck size={16} />
                        {analysis.assigned_to}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Non assigné</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(analysis.created_at).toLocaleDateString('fr-CA')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => router.push(`/admin/analyse?id=${analysis.id}`)}
                      className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors text-sm font-medium"
                    >
                      Voir le rapport
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAnalyses.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucune analyse trouvée</p>
          </div>
        )}
      </div>
    </div>
  )
}
