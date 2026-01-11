'use client'

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Building, DollarSign, TrendingUp, CreditCard,
  Calendar, User, Mail, Phone, MapPin, RefreshCw, Loader2,
  Search, Filter, ChevronLeft, ChevronRight, FileText, Download, BarChart3
} from 'lucide-react'
// AdminNav retiré - La page doit être publique pour les rapports

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
  accounts?: any[]
  total_accounts: number
  total_balance: number
  total_transactions: number
  status: string
  created_at: string
}

function AnalysePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const analysisId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<ClientAnalysis | null>(null)
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState<number>(0) // 0 = current month, 1 = -1 month, 2 = -2 months
  const [isMonthsSticky, setIsMonthsSticky] = useState(false)
  const transactionsPerPage = 50

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  // Format date - Short version for transactions
  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format date - Long version for header
  const formatDateLong = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get last 3 months info
  const getMonthsData = () => {
    const now = new Date()
    const months = []

    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        index: i,
        name: date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }),
        shortName: date.toLocaleDateString('fr-CA', { month: 'short' }),
        year: date.getFullYear(),
        month: date.getMonth()
      })
    }

    return months
  }

  const monthsData = getMonthsData()

  // Check if transaction is in selected month
  const isTransactionInMonth = (txDate: string, monthIndex: number) => {
    if (!txDate) return false

    const tx = new Date(txDate)
    const targetMonth = monthsData[monthIndex]

    return tx.getMonth() === targetMonth.month && tx.getFullYear() === targetMonth.year
  }

  // Fetch analysis
  const fetchAnalysis = useCallback(async () => {
    if (!analysisId) {
      setError('Aucun ID d\'analyse fourni')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/client-analysis?id=${analysisId}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        const analysisData = data.data

        // Extraire les comptes depuis raw_data
        const accountsData = analysisData.raw_data?.accounts || analysisData.accounts || []
        console.log('📊 Comptes extraits:', {
          length: accountsData.length,
          first: accountsData[0] ? {
            bank: accountsData[0].bank,
            account: accountsData[0].account,
            type: accountsData[0].type,
            hasTransactions: !!accountsData[0].transactions
          } : null
        })
        setAccounts(accountsData)

        // Extraire les infos client depuis raw_data.clientInfo si disponible
        if (analysisData.raw_data?.clientInfo) {
          const clientInfo = analysisData.raw_data.clientInfo
          analysisData.client_email = analysisData.client_email || clientInfo.email
          analysisData.client_address = analysisData.client_address || clientInfo.address
          analysisData.client_phones = analysisData.client_phones || (clientInfo.phone ? [clientInfo.phone] : [])
        }

        setAnalysis(analysisData)
      } else if (res.status === 401) {
        router.push('/admin')
      } else if (res.status === 404) {
        setError('Analyse non trouvée')
      } else {
        setError('Erreur lors du chargement')
      }
    } catch (err) {
      console.error('Erreur fetch:', err)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [analysisId, router])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  // Clean value helper
  const cleanValue = (val: any) => {
    if (!val) return 0
    const cleaned = String(val).replace(/[$,\s]/g, '')
    return parseFloat(cleaned) || 0
  }

  // Get filtered and searched transactions for selected account
  const filteredTransactions = useMemo(() => {
    if (!accounts[selectedAccountIndex]?.transactions) return []

    let txs = accounts[selectedAccountIndex].transactions

    // Month filter
    txs = txs.filter((tx: any) => isTransactionInMonth(tx.date, selectedMonth))

    // Search filter
    if (searchTerm) {
      txs = txs.filter((tx: any) => {
        const description = tx.description || tx.details || ''
        return description.toLowerCase().includes(searchTerm.toLowerCase())
      })
    }

    // Type filter
    if (filterType !== 'all') {
      txs = txs.filter((tx: any) => {
        const withdrawal = cleanValue(tx.withdrawals || tx.withdrawal || tx.debit)
        const deposit = cleanValue(tx.deposits || tx.deposit || tx.credit)
        const amount = tx.amount !== undefined ? cleanValue(tx.amount) : (deposit - withdrawal)

        if (filterType === 'credit') return amount > 0
        if (filterType === 'debit') return amount < 0
        return true
      })
    }

    return txs
  }, [accounts, selectedAccountIndex, searchTerm, filterType, selectedMonth, monthsData])

  // Calculate stats for each month
  const monthsStats = useMemo(() => {
    if (!accounts[selectedAccountIndex]?.transactions) return []

    return monthsData.map(month => {
      const monthTxs = accounts[selectedAccountIndex].transactions.filter((tx: any) =>
        isTransactionInMonth(tx.date, month.index)
      )

      let credits = 0
      let debits = 0

      monthTxs.forEach((tx: any) => {
        const withdrawal = cleanValue(tx.withdrawals || tx.withdrawal || tx.debit)
        const deposit = cleanValue(tx.deposits || tx.deposit || tx.credit)
        const amount = tx.amount !== undefined ? cleanValue(tx.amount) : (deposit - withdrawal)

        if (amount > 0) {
          credits += amount
        } else {
          debits += Math.abs(amount)
        }
      })

      return {
        ...month,
        count: monthTxs.length,
        credits,
        debits,
        net: credits - debits
      }
    })
  }, [accounts, selectedAccountIndex, monthsData])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, selectedAccountIndex, selectedMonth])

  // Detect when months section becomes sticky
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      // Adjust this value based on when the months section becomes sticky
      setIsMonthsSticky(scrollPosition > 450)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#00874e] mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-medium">Chargement de l'analyse...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText size={28} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-sm text-gray-600 mb-6">{error || 'Analyse introuvable'}</p>
          <button
            onClick={() => router.push('/admin/dashboard?tab=analyses')}
            className="px-5 py-2 bg-[#00874e] text-white rounded-lg hover:bg-[#00653a] transition-colors font-medium text-sm"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  const selectedAccount = accounts[selectedAccountIndex]

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Header Section */}
          <div className="bg-gradient-to-br from-[#00874e] to-emerald-700 rounded-xl shadow-lg p-6 text-white mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User size={24} />
                  <h1 className="text-2xl font-bold">{analysis.client_name}</h1>
                </div>
                <p className="text-emerald-100 text-sm">
                  Analyse bancaire {analysis.source === 'inverite' ? 'Inverite' : 'Flinks'}
                </p>
                <p className="text-emerald-200 text-xs mt-1">
                  Créée le {formatDateLong(analysis.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  analysis.source === 'inverite'
                    ? 'bg-blue-500 text-white'
                    : 'bg-purple-500 text-white'
                }`}>
                  {analysis.source === 'inverite' ? 'Inverite' : 'Flinks'}
                </span>
                <button
                  onClick={() => router.push('/admin/dashboard?tab=analyses')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Building size={16} />
                  <p className="text-emerald-100 text-xs font-medium">Comptes</p>
                </div>
                <p className="text-2xl font-bold">{analysis.total_accounts}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={16} />
                  <p className="text-emerald-100 text-xs font-medium">Balance totale</p>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(analysis.total_balance)}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} />
                  <p className="text-emerald-100 text-xs font-medium">Transactions</p>
                </div>
                <p className="text-2xl font-bold">{analysis.total_transactions}</p>
              </div>
            </div>
          </div>

          {/* Client Info Section */}
          {(analysis.client_email || analysis.client_phones || analysis.client_address) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User size={16} />
                Informations client
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {analysis.client_email && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-sm text-gray-900 truncate">{analysis.client_email}</p>
                    </div>
                  </div>
                )}

                {analysis.client_phones && analysis.client_phones.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <Phone size={14} className="text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Téléphone</p>
                      <p className="text-sm text-gray-900 truncate">{analysis.client_phones.join(', ')}</p>
                    </div>
                  </div>
                )}

                {analysis.client_address && (
                  <div className="flex items-center gap-2 col-span-2">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Adresse</p>
                      <p className="text-sm text-gray-900 truncate">{analysis.client_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accounts Navigation */}
          {accounts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard size={16} className="text-[#00874e]" />
                Comptes bancaires ({accounts.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map((account: any, index: number) => {
                  console.log(`🏦 Rendering account ${index}:`, account.bank || account.title || `Compte ${index + 1}`)
                  const accountBalance = cleanValue(account.current_balance || account.balance)
                  const isSelected = selectedAccountIndex === index

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedAccountIndex(index)}
                      className={`text-left p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-[#00874e] bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          {/* Institution name */}
                          {account.institution && (
                            <p className="text-xs text-gray-500 font-medium mb-1">
                              {account.institution}
                            </p>
                          )}

                          {/* Account title or number */}
                          <h3 className="font-semibold text-sm text-gray-900 mb-1">
                            {account.title || account.accountNumber || account.account_number || `Compte ${index + 1}`}
                          </h3>

                          {/* Account number if different from title */}
                          {account.title && (account.accountNumber || account.account_number) && (
                            <p className="text-xs text-gray-600 font-mono mb-1">
                              {account.accountNumber || account.account_number}
                            </p>
                          )}

                          {/* Account type badge */}
                          {account.type && (
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {account.type}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-[#00874e] rounded-full shrink-0 mt-1"></div>
                        )}
                      </div>

                      <p className="text-xl font-bold text-gray-900 mb-0.5">
                        {formatCurrency(accountBalance)}
                      </p>

                      <p className="text-xs text-gray-500">
                        {account.transactions ? `${account.transactions.length} transactions` : 'Aucune transaction'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Monthly Tabs */}
          {selectedAccount && selectedAccount.transactions && selectedAccount.transactions.length > 0 && (
            <div className={`sticky top-24 z-30 bg-white rounded-lg shadow-lg border border-gray-200 mb-4 backdrop-blur-sm transition-all duration-300 ${
              isMonthsSticky ? 'p-3' : 'p-4'
            }`}>
              {!isMonthsSticky && (
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-500" />
                    Analyse par mois (90 derniers jours)
                  </h2>
                  <div className="flex items-center gap-2 text-xs">
                    <ChevronLeft size={18} className="text-[#00874e] animate-pulse" />
                    <span className="font-semibold text-gray-700">Naviguer</span>
                    <ChevronRight size={18} className="text-[#00874e] animate-pulse" />
                  </div>
                </div>
              )}

              <div className="relative">
                {/* Gradient indicators for scroll */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 md:hidden"></div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 md:hidden"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:overflow-visible overflow-x-auto pb-2 -mx-1 px-1">
                {monthsStats.map((month) => {
                  const isSelected = selectedMonth === month.index

                  return (
                    <button
                      key={month.index}
                      onClick={() => setSelectedMonth(month.index)}
                      className={`text-left rounded-lg border-2 transition-all ${
                        isMonthsSticky ? 'p-2' : 'p-4'
                      } ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold text-gray-900 capitalize ${
                              isMonthsSticky ? 'text-xs' : 'text-sm'
                            }`}>
                              {isMonthsSticky ? month.shortName : month.name}
                            </h3>
                            {month.index === 0 && (
                              <span className={`bg-blue-500 text-white rounded-full font-semibold ${
                                isMonthsSticky ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
                              }`}>
                                Actuel
                              </span>
                            )}
                          </div>
                          {!isMonthsSticky && (
                            <p className="text-xs text-gray-500">
                              {month.count} transactions
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                        )}
                      </div>

                      {/* Entrées et Sorties - toujours visible */}
                      <div className={isMonthsSticky ? 'space-y-1' : 'space-y-2'}>
                        <div className="flex items-center justify-between">
                          <span className={isMonthsSticky ? 'text-[10px] text-gray-600' : 'text-xs text-gray-600'}>
                            Revenus
                          </span>
                          <span className={`font-semibold text-green-600 tabular-nums ${
                            isMonthsSticky ? 'text-xs' : 'text-sm'
                          }`}>
                            +{formatCurrency(month.credits)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={isMonthsSticky ? 'text-[10px] text-gray-600' : 'text-xs text-gray-600'}>
                            Dépenses
                          </span>
                          <span className={`font-semibold text-red-600 tabular-nums ${
                            isMonthsSticky ? 'text-xs' : 'text-sm'
                          }`}>
                            -{formatCurrency(month.debits)}
                          </span>
                        </div>
                        {!isMonthsSticky && (
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-xs font-medium text-gray-700">Net</span>
                            <span className={`text-sm font-bold tabular-nums ${
                              month.net >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(month.net)}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Section */}
          {selectedAccount && selectedAccount.transactions && selectedAccount.transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Transactions Header with Search and Filters */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={16} />
                    Transactions - {monthsData[selectedMonth].name} ({filteredTransactions.length})
                  </h2>
                  <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-xs font-medium text-gray-700">
                    <Download size={14} />
                    Exporter
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="flex gap-2">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher une transaction..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00874e] focus:border-transparent"
                    />
                  </div>

                  {/* Filter Type */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00874e] focus:border-transparent bg-white"
                  >
                    <option value="all">Toutes</option>
                    <option value="credit">Crédits</option>
                    <option value="debit">Débits</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Description
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Montant
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Solde
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTransactions.map((tx: any, txIndex: number) => {
                      const withdrawal = cleanValue(tx.withdrawals || tx.withdrawal || tx.debit)
                      const deposit = cleanValue(tx.deposits || tx.deposit || tx.credit)
                      const amount = tx.amount !== undefined ? cleanValue(tx.amount) : (deposit - withdrawal)
                      const balance = cleanValue(tx.balance || tx.solde)
                      const isCredit = amount > 0

                      return (
                        <tr key={txIndex} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-gray-400" />
                              <span className="text-sm text-gray-700 font-medium">
                                {tx.date ? formatDateShort(tx.date) : 'Date inconnue'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-sm text-gray-900 leading-tight">
                              {tx.description || tx.details || 'Transaction'}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <span className={`text-sm font-semibold tabular-nums ${
                              isCredit ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isCredit ? '+' : ''}{formatCurrency(amount)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <span className="text-sm text-gray-600 tabular-nums font-medium">
                              {balance !== 0 ? formatCurrency(balance) : '-'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      {((currentPage - 1) * transactionsPerPage) + 1} à {Math.min(currentPage * transactionsPerPage, filteredTransactions.length)} sur {filteredTransactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <span className="px-3 py-1 text-xs font-medium text-gray-700">
                        Page {currentPage} / {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <p className="font-medium">ID: <span className="font-mono text-gray-900">{analysis.id.slice(0, 8)}</span></p>
                {analysis.inverite_guid && (
                  <p className="mt-0.5">GUID: <span className="font-mono text-gray-900">{analysis.inverite_guid.slice(0, 8)}</span></p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={fetchAnalysis}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all text-xs font-medium"
                >
                  <RefreshCw size={14} />
                  Rafraîchir
                </button>

                <button
                  onClick={() => router.push('/admin/dashboard?tab=analyses')}
                  className="px-3 py-1.5 bg-[#00874e] text-white rounded-lg hover:bg-[#00653a] transition-colors font-medium text-xs"
                >
                  Toutes les analyses
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function AnalysePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#00874e] mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-medium">Chargement de l'analyse...</p>
        </div>
      </div>
    }>
      <AnalysePageContent />
    </Suspense>
  )
}
