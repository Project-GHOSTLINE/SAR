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
}

export default function AnalysesClientPage() {
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
        setAnalyses(data.data || [])
        setStats(data.stats || {})
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

  // Auto-open analysis from URL parameter ?id=...
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const analysisId = urlParams.get('id')

    if (analysisId && analyses.length > 0) {
      const analysis = analyses.find(a => a.id === analysisId)
      if (analysis) {
        setSelectedAnalysis(analysis)
        // Clear URL parameter after opening
        window.history.replaceState({}, '', '/admin/analyses')
      }
    }
  }, [analyses])

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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
        <Icon size={14} />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin text-[#00874e] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des analyses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1800px] mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm hover:shadow"
                >
                  <ArrowLeft size={16} />
                  Retour
                </button>
                <h1 className="text-4xl font-bold text-[#003d2c] flex items-center gap-3">
                  <div className="w-1 h-10 bg-gradient-to-b from-[#00874e] to-emerald-600 rounded-full"></div>
                  Analyse client SAR
                </h1>
              </div>
              <p className="text-gray-600 ml-16 font-medium">
                Gestion des analyses bancaires Inverite & Flinks
              </p>
            </div>

            <button
              onClick={fetchAnalyses}
              disabled={refreshing}
              className="flex items-center gap-2 px-6 py-3 bg-[#00874e] text-white rounded-xl hover:bg-[#00653a] transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total</span>
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Analyses totales</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-700 text-sm font-bold">En attente</span>
              <Clock size={20} className="text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-900">{stats.pending}</p>
            <p className="text-xs text-yellow-700 mt-1">À réviser</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-700 text-sm font-bold">Révisé</span>
              <Eye size={20} className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">{stats.reviewed}</p>
            <p className="text-xs text-blue-700 mt-1">En traitement</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-700 text-sm font-bold">Approuvé</span>
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">{stats.approved}</p>
            <p className="text-xs text-green-700 mt-1">Validé</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-700 text-sm font-bold">Rejeté</span>
              <XCircle size={20} className="text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-900">{stats.rejected}</p>
            <p className="text-xs text-red-700 mt-1">Refusé</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-700 text-sm font-bold">Non assigné</span>
              <UserCheck size={20} className="text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-900">{stats.by_assignee.unassigned}</p>
            <p className="text-xs text-purple-700 mt-1">À assigner</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, GUID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-transparent bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="reviewed">Révisé</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </select>

            {/* Assigned Filter */}
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-transparent bg-white"
            >
              <option value="all">Tous les assignés</option>
              <option value="Sandra">Sandra ({stats.by_assignee.sandra})</option>
              <option value="Michel">Michel ({stats.by_assignee.michel})</option>
              <option value="">Non assigné ({stats.by_assignee.unassigned})</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-transparent bg-white"
            >
              <option value="all">Toutes les sources</option>
              <option value="inverite">Inverite</option>
              <option value="flinks">Flinks</option>
            </select>
          </div>

          {(statusFilter !== 'all' || assignedFilter !== 'all' || sourceFilter !== 'all' || searchQuery) && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Filter size={16} />
              <span className="font-medium">Filtres actifs:</span>
              {statusFilter !== 'all' && (
                <span className="px-2 py-1 bg-gray-100 rounded-lg">{statusFilter}</span>
              )}
              {assignedFilter !== 'all' && (
                <span className="px-2 py-1 bg-gray-100 rounded-lg">{assignedFilter || 'Non assigné'}</span>
              )}
              {sourceFilter !== 'all' && (
                <span className="px-2 py-1 bg-gray-100 rounded-lg">{sourceFilter}</span>
              )}
              {searchQuery && (
                <span className="px-2 py-1 bg-gray-100 rounded-lg">&quot;{searchQuery}&quot;</span>
              )}
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setAssignedFilter('all')
                  setSourceFilter('all')
                  setSearchQuery('')
                }}
                className="ml-auto text-[#00874e] hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* Analyses List */}
        {filteredAnalyses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune analyse trouvée</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedAnalysis(analysis)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left Side - Client Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{analysis.client_name}</h3>
                        {getStatusBadge(analysis.status)}
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          analysis.source === 'inverite'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {analysis.source === 'inverite' ? 'Inverite' : 'Flinks'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {analysis.client_email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail size={16} className="text-gray-400" />
                            {analysis.client_email}
                          </div>
                        )}
                        {analysis.client_phones && analysis.client_phones.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={16} className="text-gray-400" />
                            {analysis.client_phones[0]}
                          </div>
                        )}
                        {analysis.client_address && (
                          <div className="flex items-center gap-2 text-gray-600 col-span-2">
                            <MapPin size={16} className="text-gray-400" />
                            {analysis.client_address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side - Metrics */}
                    <div className="flex gap-6 ml-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-2">
                          <Building size={20} className="text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{analysis.total_accounts}</p>
                        <p className="text-xs text-gray-500">Comptes</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl mb-2">
                          <DollarSign size={20} className="text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(analysis.total_balance)}</p>
                        <p className="text-xs text-gray-500">Balance</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-xl mb-2">
                          <TrendingUp size={20} className="text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{analysis.total_transactions}</p>
                        <p className="text-xs text-gray-500">Transactions</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(analysis.created_at)}
                      </span>
                      {analysis.assigned_to && (
                        <span className="flex items-center gap-1 text-[#00874e] font-medium">
                          <UserCheck size={14} />
                          Assigné à {analysis.assigned_to}
                        </span>
                      )}
                      {analysis.inverite_guid && (
                        <span className="flex items-center gap-1 font-mono">
                          <Tag size={14} />
                          {analysis.inverite_guid.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAnalysis(analysis)
                      }}
                      className="px-4 py-2 bg-[#00874e] text-white rounded-lg hover:bg-[#00653a] transition-colors flex items-center gap-2"
                    >
                      <Eye size={14} />
                      Voir détails
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedAnalysis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50" onClick={() => setSelectedAnalysis(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#00874e] to-emerald-600 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold">{selectedAnalysis.client_name}</h2>
                    <p className="text-emerald-100 text-sm mt-1">Analyse bancaire complète</p>
                  </div>
                  <button
                    onClick={() => setSelectedAnalysis(null)}
                    className="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-3">
                    <p className="text-emerald-100 text-xs">Comptes</p>
                    <p className="text-2xl font-bold">{selectedAnalysis.total_accounts}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-3">
                    <p className="text-emerald-100 text-xs">Balance totale</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedAnalysis.total_balance)}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-3">
                    <p className="text-emerald-100 text-xs">Transactions</p>
                    <p className="text-2xl font-bold">{selectedAnalysis.total_transactions}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-3">
                    <p className="text-emerald-100 text-xs">Statut</p>
                    <p className="text-lg font-bold">{
                      selectedAnalysis.status === 'pending' ? 'En attente' :
                      selectedAnalysis.status === 'reviewed' ? 'Révisé' :
                      selectedAnalysis.status === 'approved' ? 'Approuvé' : 'Rejeté'
                    }</p>
                  </div>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
                {/* Client Info Section */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User size={20} />
                    Informations client
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAnalysis.client_email && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-gray-900 font-medium">{selectedAnalysis.client_email}</p>
                      </div>
                    )}
                    {selectedAnalysis.client_phones && selectedAnalysis.client_phones.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Téléphones</p>
                        <p className="text-gray-900 font-medium">{selectedAnalysis.client_phones.join(', ')}</p>
                      </div>
                    )}
                    {selectedAnalysis.client_address && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Adresse</p>
                        <p className="text-gray-900 font-medium">{selectedAnalysis.client_address}</p>
                      </div>
                    )}
                    {selectedAnalysis.inverite_guid && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">GUID Inverite</p>
                        <p className="text-gray-900 font-mono text-sm">{selectedAnalysis.inverite_guid}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Source</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        selectedAnalysis.source === 'inverite'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {selectedAnalysis.source === 'inverite' ? 'Inverite' : 'Flinks'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accounts Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard size={20} />
                    Comptes bancaires ({selectedAnalysis.total_accounts})
                  </h3>
                  <div className="space-y-3">
                    {selectedAnalysis.accounts && selectedAnalysis.accounts.map((account: any, index: number) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedAccount(expandedAccount === index ? null : index)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-gray-900">{account.accountNumber || `Compte ${index + 1}`}</h4>
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                                  {account.type || 'Type inconnu'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{account.institutionName || 'Institution'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(account.balance || 0)}</p>
                                <p className="text-xs text-gray-500">
                                  {account.transactions ? `${account.transactions.length} transactions` : 'Aucune transaction'}
                                </p>
                              </div>
                              {expandedAccount === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Transactions */}
                        {expandedAccount === index && account.transactions && account.transactions.length > 0 && (
                          <div className="border-t border-gray-200 bg-gray-50 p-4">
                            <h5 className="font-bold text-gray-700 mb-3 text-sm">Transactions récentes</h5>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {account.transactions.slice(0, 20).map((tx: any, txIndex: number) => (
                                <div key={txIndex} className="bg-white p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{tx.description || 'Transaction'}</p>
                                    <p className="text-xs text-gray-500">{tx.date || 'Date inconnue'}</p>
                                  </div>
                                  <p className={`text-lg font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount || 0)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>

                  {/* Status Update */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <div className="flex gap-2">
                      {['pending', 'reviewed', 'approved', 'rejected'].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateAnalysis(selectedAnalysis.id, { status })}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            selectedAnalysis.status === status
                              ? 'bg-[#00874e] text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {status === 'pending' ? 'En attente' :
                           status === 'reviewed' ? 'Révisé' :
                           status === 'approved' ? 'Approuvé' : 'Rejeté'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigner à</label>
                    <div className="flex gap-2">
                      {['Sandra', 'Michel', null].map((assignee) => (
                        <button
                          key={assignee || 'none'}
                          onClick={() => updateAnalysis(selectedAnalysis.id, { assigned_to: assignee })}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            selectedAnalysis.assigned_to === assignee
                              ? 'bg-[#00874e] text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {assignee || 'Non assigné'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes internes</label>
                    <textarea
                      defaultValue={selectedAnalysis.notes || ''}
                      onBlur={(e) => updateAnalysis(selectedAnalysis.id, { notes: e.target.value })}
                      placeholder="Ajouter des notes..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-transparent resize-none"
                      rows={4}
                    />
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteAnalysis(selectedAnalysis.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    <Trash2 size={16} />
                    Supprimer cette analyse
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
