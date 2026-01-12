'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import AdminNav from '@/components/admin/AdminNav'
import {
  ArrowLeft, Building, DollarSign, TrendingUp, CreditCard,
  Calendar, User, Mail, Phone, MapPin, RefreshCw, Loader2,
  Search, Filter, ChevronLeft, ChevronRight, FileText, Download, BarChart3,
  Tag, Flag, Menu, X, Briefcase, Wallet, Landmark, Check
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugCopied, setDebugCopied] = useState(false)
  const transactionsPerPage = 2500

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

  // Get months data (either last 3 or all available months)
  const getMonthsData = useMemo(() => {
    const now = new Date()
    const months = []

    if (!showAllMonths) {
      // Show only last 3 months
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
    } else {
      // Get all unique months from transactions
      const selectedAcc = accounts[selectedAccountIndex]
      if (selectedAcc?.transactions) {
        const monthsMap = new Map<string, { year: number; month: number }>()

        selectedAcc.transactions.forEach((tx: any) => {
          if (tx.date) {
            const txDate = new Date(tx.date)
            const key = `${txDate.getFullYear()}-${txDate.getMonth()}`
            if (!monthsMap.has(key)) {
              monthsMap.set(key, {
                year: txDate.getFullYear(),
                month: txDate.getMonth()
              })
            }
          }
        })

        // Convert to array and sort (most recent first)
        const sortedMonths = Array.from(monthsMap.values()).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.month - a.month
        })

        sortedMonths.forEach((m, index) => {
          const date = new Date(m.year, m.month, 1)
          months.push({
            index,
            name: date.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }),
            shortName: date.toLocaleDateString('fr-CA', { month: 'short' }),
            year: m.year,
            month: m.month
          })
        })
      }
    }

    return months
  }, [showAllMonths, accounts, selectedAccountIndex])

  const monthsData = getMonthsData

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
        setAccounts(accountsData)

        // Extraire les infos client depuis raw_data
        const rawData = analysisData.raw_data || {}

        // Adresse depuis raw_data.address
        if (!analysisData.client_address && rawData.address) {
          analysisData.client_address = rawData.address
        }

        // Email et téléphones depuis raw_data.contacts
        if (rawData.contacts && Array.isArray(rawData.contacts)) {
          // Extraire l'email
          if (!analysisData.client_email) {
            const emailContact = rawData.contacts.find((c: any) => c.type === 'email')
            if (emailContact?.contact) {
              analysisData.client_email = emailContact.contact
            }
          }

          // Extraire les téléphones
          if (!analysisData.client_phones || analysisData.client_phones.length === 0) {
            const phoneContacts = rawData.contacts.filter((c: any) => c.type === 'phone')
            if (phoneContacts.length > 0) {
              analysisData.client_phones = phoneContacts.map((c: any) => c.contact?.replace(/,$/, ''))
            }
          }
        }

        // Fallback: Extraire depuis raw_data.clientInfo si disponible (compatibilité Flinks)
        if (rawData.clientInfo) {
          const clientInfo = rawData.clientInfo
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
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [analysisId, router])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  // Get debug data object
  const getDebugData = () => {
    return {
      analysis: {
        id: analysis?.id,
        client_name: analysis?.client_name,
        client_email: analysis?.client_email,
        client_phones: analysis?.client_phones,
        client_address: analysis?.client_address,
        inverite_guid: analysis?.inverite_guid,
        source: analysis?.source,
        total_accounts: analysis?.total_accounts,
        total_balance: analysis?.total_balance,
        total_transactions: analysis?.total_transactions,
        created_at: analysis?.created_at,
      },
      raw_data: analysis?.raw_data,
      accounts: accounts,
    }
  }

  // Copy debug data to clipboard
  const copyDebugData = () => {
    const jsonString = JSON.stringify(getDebugData(), null, 2)
    navigator.clipboard.writeText(jsonString)
    setDebugCopied(true)
    setTimeout(() => setDebugCopied(false), 2000)
  }

  // Download debug data as JSON file
  const downloadDebugData = () => {
    const debugData = getDebugData()
    const jsonString = JSON.stringify(debugData, null, 2)

    // Create blob
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    // Create filename
    const clientName = analysis?.client_name?.replace(/\s+/g, '-') || 'client'
    const clientId = analysis?.id?.slice(0, 8) || 'unknown'
    const date = new Date().toISOString().split('T')[0]
    const filename = `debug-${clientName}-${clientId}-${date}.json`

    // Create temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Clean value helper
  const cleanValue = (val: any) => {
    if (!val) return 0
    const cleaned = String(val).replace(/[$,\s]/g, '')
    return parseFloat(cleaned) || 0
  }

  // Bank style helper - moved outside render for performance
  // Using official brand colors researched from bank websites
  const getBankStyle = useCallback((bank: string) => {
    const bankLower = bank.toLowerCase()

    // Desjardins - Official green #00874E
    if (bankLower.includes('desjardins')) {
      return { gradientFrom: '#00874E', gradientTo: '#005a33', logo: 'D', color: '#00874E' }
    }
    // National Bank - Official red #e41c23
    if (bankLower.includes('national')) {
      return { gradientFrom: '#e41c23', gradientTo: '#a51419', logo: 'BN', color: '#e41c23' }
    }
    // RBC - Official blue #0051A5
    if (bankLower.includes('royal') || bankLower.includes('rbc')) {
      return { gradientFrom: '#0051A5', gradientTo: '#003870', logo: 'RBC', color: '#0051A5' }
    }
    // TD - Official green #54b848
    if (bankLower.includes('td')) {
      return { gradientFrom: '#54b848', gradientTo: '#3a8032', logo: 'TD', color: '#54b848' }
    }
    // Scotiabank - Official red #EC0712
    if (bankLower.includes('scotiabank') || bankLower.includes('scotia')) {
      return { gradientFrom: '#EC0712', gradientTo: '#a5050c', logo: 'SB', color: '#EC0712' }
    }
    // BMO - Official blue #0079C1
    if (bankLower.includes('bmo') || bankLower.includes('montreal')) {
      return { gradientFrom: '#0079C1', gradientTo: '#005587', logo: 'BMO', color: '#0079C1' }
    }
    // CIBC - Official cardinal red #C41F3E
    if (bankLower.includes('cibc')) {
      return { gradientFrom: '#C41F3E', gradientTo: '#8a152b', logo: 'CIBC', color: '#C41F3E' }
    }
    // Tangerine - Official orange #F28500
    if (bankLower.includes('tangerine')) {
      return { gradientFrom: '#F28500', gradientTo: '#a95d00', logo: 'T', color: '#F28500' }
    }
    // Laurentian Bank - Official yellow #FDB913
    if (bankLower.includes('laurentian') || bankLower.includes('laurentienne')) {
      return { gradientFrom: '#FDB913', gradientTo: '#b5840d', logo: 'LB', color: '#FDB913' }
    }
    // Koho - Official electric lime #CCFF00
    if (bankLower.includes('koho')) {
      return { gradientFrom: '#CCFF00', gradientTo: '#99cc00', logo: 'K', color: '#CCFF00' }
    }
    // Default for unknown banks
    return {
      gradientFrom: '#1f2937',
      gradientTo: '#030712',
      logo: bank && bank.length >= 2 ? bank.substring(0, 2).toUpperCase() : 'BK',
      color: '#374151'
    }
  }, [])

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
      // Scroll handler (reserved for future use)
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
      <AdminNav currentPage="/admin/analyse" />
      <div className="min-h-screen bg-gray-50 py-4 sm:py-6 px-2 sm:px-4 lg:px-6">
        <div className="w-full lg:pl-[22rem]">

          {/* Header Section - Deux colonnes: Paies + Comptes */}
          <div className="bg-gradient-to-br from-[#00874e] to-emerald-700 rounded-lg shadow-lg p-3 mb-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* COLONNE GAUCHE - Paies */}
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={14} className="text-white shrink-0" />
                  <h3 className="text-sm font-bold text-white">Dernières paies</h3>
                </div>

                {(() => {
                  const rawData = analysis.raw_data || {}

                  // Extraire les paychecks depuis les transactions
                  const allTransactions = accounts.flatMap((acc: any) => acc.transactions || [])
                  const paychecks = allTransactions
                    .filter((tx: any) => tx.category === 'income/paycheck' && tx.flags?.includes('is_payroll'))
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((tx: any) => ({
                      date: tx.date,
                      employer: tx.details?.replace(/^(SalaryPayroll\s*\/|Salary\/|Payroll\/)/i, '').trim() || 'Employeur',
                      amount: parseFloat(tx.credit || tx.amount || 0)
                    }))

                  // Calculer la fréquence
                  let frequency = 'N/A'
                  let nextPayDate = null

                  if (paychecks.length >= 2) {
                    const dates = paychecks.map(p => new Date(p.date).getTime())
                    const diffs = []
                    for (let i = 0; i < dates.length - 1; i++) {
                      diffs.push(Math.abs(dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24))
                    }
                    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length

                    if (avgDiff >= 6 && avgDiff <= 8) {
                      frequency = 'Hebdomadaire'
                      const lastDate = new Date(paychecks[0].date)
                      nextPayDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                    } else if (avgDiff >= 13 && avgDiff <= 15) {
                      frequency = 'Aux 2 semaines'
                      const lastDate = new Date(paychecks[0].date)
                      nextPayDate = new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000)
                    } else if (avgDiff >= 28 && avgDiff <= 31) {
                      frequency = 'Mensuelle'
                      const lastDate = new Date(paychecks[0].date)
                      nextPayDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                    }
                  }

                  // Employeur principal
                  const employerCounts: Record<string, number> = {}
                  paychecks.forEach(p => {
                    employerCounts[p.employer] = (employerCounts[p.employer] || 0) + 1
                  })
                  const mainEmployer = Object.keys(employerCounts).sort((a, b) => employerCounts[b] - employerCounts[a])[0] || 'N/A'

                  return (
                    <div>
                      {/* Employeur et fréquence */}
                      <div className="mb-2 pb-2 border-b border-white/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-white/80 font-medium uppercase">Employeur principal</span>
                          <span className="text-xs text-white font-bold">{mainEmployer}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/80 font-medium uppercase">Fréquence</span>
                          <span className="text-xs text-white font-bold">{frequency}</span>
                        </div>
                      </div>

                      {/* Liste des 5 dernières paies */}
                      {paychecks.length > 0 ? (
                        <div className="space-y-1 mb-2">
                          {paychecks.map((pay, idx) => (
                            <div key={idx} className="bg-white/5 rounded px-2 py-1 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/90 truncate">{pay.employer}</p>
                                <p className="text-[9px] text-white/70">
                                  {new Date(pay.date).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <p className="text-xs font-bold text-white ml-2">{formatCurrency(pay.amount)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/70 italic">Aucune paie détectée</p>
                      )}

                      {/* Prochaine paie prédite */}
                      {nextPayDate && (
                        <div className="bg-white/20 rounded px-2 py-1.5 border border-white/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/90 font-medium uppercase">Prochaine paie estimée</span>
                            <span className="text-xs font-bold text-white">
                              {nextPayDate.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* COLONNE DROITE - Comptes bancaires */}
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={14} className="text-white shrink-0" />
                  <h3 className="text-sm font-bold text-white">Comptes bancaires</h3>
                  <span className="text-xs text-emerald-200">({accounts.length})</span>
                </div>

                {/* Grille de comptes - Max 2 par ligne */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {accounts.map((account: any, index: number) => {
                    const isSelected = selectedAccountIndex === index
                    const accountBalance = cleanValue(account.current_balance || account.balance)
                    const bankName = account.bank || account.institution || 'Banque inconnue'
                    const accountNumber = account.account || account.accountNumber || account.number || '0000000'
                    const institutionNumber = account.institution_number || account.institutionNumber || '000'
                    const transitNumber = account.transit_number || account.transitNumber || '00000'
                    const accountName = account.name || account.accountName || 'Compte'
                    const accountType = account.type || account.accountType || ''
                    const bankStyle = getBankStyle(bankName)

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedAccountIndex(index)}
                        className={`text-left rounded-lg overflow-hidden transition-all duration-200 ${
                          isSelected
                            ? 'ring-2 ring-white shadow-lg'
                            : 'hover:shadow-md border border-white/20'
                        }`}
                        style={{
                          background: isSelected
                            ? `linear-gradient(135deg, ${bankStyle.gradientFrom} 0%, ${bankStyle.gradientTo} 100%)`
                            : 'rgba(255, 255, 255, 0.15)'
                        }}
                      >
                        <div className="relative p-2">
                          {/* Badge transactions */}
                          {account.transactions && (
                            <div className="absolute top-1 right-1">
                              <div className={`rounded-full px-1.5 py-0.5 border ${
                                isSelected
                                  ? 'bg-white/90 border-white text-gray-900'
                                  : 'bg-white/20 border-white/30 text-white'
                              }`}>
                                <p className="text-[9px] font-bold">{account.transactions.length} tx</p>
                              </div>
                            </div>
                          )}

                          {/* Institution */}
                          <p className={`text-xs font-bold mb-1 ${isSelected ? 'text-white' : 'text-white'}`}>
                            {bankName}
                          </p>

                          {/* Nom du compte */}
                          <p className={`text-[11px] font-semibold mb-1 truncate ${isSelected ? 'text-white' : 'text-white'}`}>
                            {accountName}
                          </p>

                          {/* Numéros */}
                          <p className={`text-[9px] font-mono font-bold mb-1 ${
                            isSelected ? 'text-white/95' : 'text-white/90'
                          }`}>
                            T: {transitNumber} • I: {institutionNumber}<br/>
                            C: {accountNumber}
                          </p>

                          {/* Solde */}
                          <div className={`py-1 px-1.5 rounded border border-dashed ${
                            isSelected ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'
                          }`}>
                            <p className={`text-base font-bold tabular-nums ${
                              isSelected ? 'text-white' : 'text-white'
                            }`}>
                              {formatCurrency(accountBalance)}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Comptes Bancaires removed - now in sidebar as mini checks */}

          {/* Analyse Mensuelle Section - MOVED FROM SIDEBAR */}
          {selectedAccount && selectedAccount.transactions && selectedAccount.transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
              {/* Header Mois */}
              <div className="mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-sm sm:text-base font-semibold text-blue-700 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <BarChart3 size={16} className="text-white" />
                  </div>
                  <span>Analyse Mensuelle</span>
                </h2>
                <p className="text-xs text-gray-600 mt-1 ml-10 font-medium">Filtrer les transactions par période</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {monthsStats.map((month) => {
                  const isSelected = selectedMonth === month.index

                  return (
                    <button
                      key={month.index}
                      onClick={() => setSelectedMonth(month.index)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#00874e] to-emerald-600 text-white shadow-lg scale-105'
                          : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm hover:shadow-md border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold text-sm capitalize ${
                              isSelected ? 'text-white' : 'text-gray-900'
                            }`}>
                              {month.name}
                            </h3>
                            {month.index === 0 && (
                              <span className={`rounded-full font-semibold px-2 py-0.5 text-xs ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                Actuel
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${isSelected ? 'text-emerald-100' : 'text-gray-500'}`}>
                            {month.count} transactions
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full shrink-0 animate-pulse"></div>
                        )}
                      </div>

                      {/* Entrées et Sorties */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isSelected ? 'text-emerald-100' : 'text-gray-600'}`}>
                            Revenus
                          </span>
                          <span className={`font-semibold tabular-nums text-sm ${
                            isSelected ? 'text-white' : 'text-green-600'
                          }`}>
                            +{formatCurrency(month.credits)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isSelected ? 'text-emerald-100' : 'text-gray-600'}`}>
                            Dépenses
                          </span>
                          <span className={`font-semibold tabular-nums text-sm ${
                            isSelected ? 'text-white' : 'text-red-600'
                          }`}>
                            -{formatCurrency(month.debits)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t" style={{
                          borderColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                        }}>
                          <span className={`text-xs font-medium ${isSelected ? 'text-emerald-100' : 'text-gray-700'}`}>
                            Net
                          </span>
                          <span className={`text-sm font-bold tabular-nums ${
                            isSelected
                              ? 'text-white'
                              : month.net >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(month.net)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Bouton Voir tous les mois */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowAllMonths(!showAllMonths)
                    if (!showAllMonths) {
                      setSelectedMonth(0)
                    }
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-medium border-2 ${
                    showAllMonths
                      ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  <Calendar size={16} />
                  <span className="font-semibold">
                    {showAllMonths ? 'Voir moins de mois' : 'Voir tous les mois'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Bouton flottant pour ouvrir la sidebar sur mobile */}
          {accounts.length > 0 && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 left-6 z-50 w-14 h-14 bg-gradient-to-br from-[#00874e] to-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
            >
              <Menu size={24} />
            </button>
          )}

          {/* Backdrop pour mobile */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar fixe à gauche - Informations Client */}
          {accounts.length > 0 && (
            <div className={`
              fixed top-32 z-40 w-80 max-h-[calc(100vh-160px)] overflow-y-auto rounded-2xl
              transition-transform duration-300 ease-in-out
              lg:left-6 lg:translate-x-0
              ${sidebarOpen ? 'left-4 translate-x-0' : 'left-4 -translate-x-[calc(100%+2rem)]'}
              lg:block bg-white
            `}
              style={{
                border: '1px solid rgba(200, 200, 200, 0.4)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Bouton fermer sur mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <X size={18} className="text-gray-700" />
              </button>

              {/* Client Info Section - Nom et infos personnelles */}
              <div className="p-4">
                {/* Nom du client */}
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={18} className="text-[#00874e] shrink-0" />
                    <h2 className="text-lg font-bold text-gray-900 truncate">{analysis.client_name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      analysis.source === 'inverite' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                    }`}>
                      {analysis.source === 'inverite' ? 'Inverite' : 'Flinks'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-800 text-white">
                      {analysis.source === 'flinks' ? 'SAR' : 'CS'}
                    </span>
                  </div>
                </div>

                {/* Institution financière */}
                {(() => {
                  const institutionName = accounts[selectedAccountIndex]?.bank || accounts[selectedAccountIndex]?.institution || accounts[0]?.bank || accounts[0]?.institution || 'Institution inconnue'
                  const getInstitutionColor = (inst: string) => {
                    const instLower = inst.toLowerCase()
                    if (instLower.includes('desjardins')) return 'bg-green-600'
                    if (instLower.includes('national')) return 'bg-red-600'
                    if (instLower.includes('royal') || instLower.includes('rbc')) return 'bg-blue-700'
                    if (instLower.includes('td')) return 'bg-green-700'
                    if (instLower.includes('scotiabank')) return 'bg-red-700'
                    if (instLower.includes('bmo') || instLower.includes('montreal')) return 'bg-blue-600'
                    if (instLower.includes('cibc')) return 'bg-red-800'
                    if (instLower.includes('tangerine')) return 'bg-orange-500'
                    return 'bg-gray-700'
                  }

                  return (
                    <div className="mb-3">
                      <div className={`${getInstitutionColor(institutionName)} text-white rounded-lg p-3 flex items-center gap-3`}>
                        <Landmark size={18} className="shrink-0" />
                        <div>
                          <p className="text-[10px] opacity-90 font-medium uppercase">Institution financière</p>
                          <p className="text-sm font-bold">{institutionName}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Informations de contact */}
                <div className="space-y-2 mb-3">
                  {analysis.client_email && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center shrink-0">
                        <Mail size={13} className="text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500 font-medium">Email</p>
                        <p className="text-xs text-gray-900 truncate">{analysis.client_email}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <Phone size={13} className="text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 font-medium">Téléphone</p>
                      {analysis.client_phones && analysis.client_phones.length > 0 ? (
                        <p className="text-xs text-gray-900 truncate">{analysis.client_phones.join(', ')}</p>
                      ) : (
                        <p className="text-xs text-gray-500 italic truncate">
                          {analysis.source === 'flinks' ? 'Non disponible (Flinks)' : 'Non disponible'}
                        </p>
                      )}
                    </div>
                  </div>

                  {analysis.client_address && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center shrink-0">
                        <MapPin size={13} className="text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500 font-medium">Adresse</p>
                        <p className="text-xs text-gray-900 truncate">{analysis.client_address}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 my-3"></div>

                {/* Stats - Compact */}
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building size={14} className="text-[#00874e]" />
                      <span className="text-xs font-medium text-gray-600">Comptes</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{analysis.total_accounts}</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-[#00874e]" />
                      <span className="text-xs font-medium text-gray-600">Balance totale</span>
                    </div>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(analysis.total_balance)}</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-[#00874e]" />
                      <span className="text-xs font-medium text-gray-600">Transactions</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{analysis.total_transactions}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 mx-4"></div>

              {/* Additional Flinks/Inverite Metadata */}
              <div className="p-4 pt-3">
                {(() => {
                  const rawData = analysis.raw_data || {}
                  const paychecks = rawData.paychecks || []

                  // Extract employer name from paychecks if available
                  const employerName = rawData.employerName || rawData.employer ||
                    (paychecks.length > 0 ? (paychecks[0].employer || paychecks[0].employerName) : null)

                  const loginId = rawData.loginId || rawData.login_id
                  const requestId = rawData.requestId || rawData.request_id
                  const requestDateTime = rawData.requestDateTime || rawData.request_date_time
                  const requestStatus = rawData.requestStatus || rawData.request_status
                  const daysDetected = rawData.daysDetected || rawData.days_detected

                  const hasAnyMetadata = employerName || loginId || requestId || requestDateTime || requestStatus || daysDetected

                  if (hasAnyMetadata) {
                    return (
                      <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-2">
                          <FileText size={12} />
                          Métadonnées {analysis.source === 'flinks' ? 'Flinks' : 'Inverite'}
                        </h3>

                        {employerName && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <Briefcase size={14} className="text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">Employeur</p>
                              <p className="text-sm text-gray-900 truncate font-medium">{employerName}</p>
                            </div>
                          </div>
                        )}

                        {loginId && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <User size={14} className="text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">Login ID</p>
                              <p className="text-xs text-gray-900 font-mono truncate">{loginId}</p>
                            </div>
                          </div>
                        )}

                        {requestId && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <FileText size={14} className="text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">Request ID</p>
                              <p className="text-xs text-gray-900 font-mono truncate">{requestId}</p>
                            </div>
                          </div>
                        )}

                        {requestDateTime && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <Calendar size={14} className="text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">Date de la requête</p>
                              <p className="text-sm text-gray-900">
                                {typeof requestDateTime === 'string'
                                  ? requestDateTime
                                  : new Date(requestDateTime).toLocaleString('fr-CA', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                              </p>
                            </div>
                          </div>
                        )}

                        {requestStatus && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <FileText size={14} className="text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">Statut de la requête</p>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                requestStatus.toLowerCase() === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {requestStatus}
                              </span>
                            </div>
                          </div>
                        )}

                        {daysDetected && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <Calendar size={14} className="text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">Jours détectés</p>
                              <p className="text-sm text-gray-900 font-medium">{daysDetected} jours</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null
                })()}

                {/* 4 dernières paies */}
                {(() => {
                  const paychecks = analysis.raw_data?.paychecks || []
                  const last4Paychecks = paychecks.slice(-4).reverse()

                  if (last4Paychecks.length > 0) {
                    return (
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Briefcase size={14} />
                          Dernières paies reçues
                        </h3>
                        <div className="space-y-2">
                          {last4Paychecks.map((paycheck: any, index: number) => {
                            const date = paycheck.date || paycheck.payDate
                            const amount = cleanValue(paycheck.amount || paycheck.netPay || 0)
                            const employer = paycheck.employer || paycheck.employerName || 'Employeur non spécifié'

                            return (
                              <div key={index} className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Calendar size={12} className="text-emerald-600 shrink-0" />
                                      <p className="text-xs font-semibold text-emerald-800">
                                        {date ? new Date(date).toLocaleDateString('fr-CA', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        }) : 'Date inconnue'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Briefcase size={10} className="text-gray-500 shrink-0" />
                                      <p className="text-xs text-gray-700 truncate font-medium">{employer}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-base font-bold text-emerald-700">{formatCurrency(amount)}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {paychecks.length > 4 && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            +{paychecks.length - 4} paie(s)
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                })()}
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
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <div className="flex items-center gap-1">
                          <Tag size={12} />
                          Catégorie
                        </div>
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <div className="flex items-center justify-center gap-1">
                          <Flag size={12} />
                          Flags
                        </div>
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Crédit
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Débit
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Solde
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTransactions.map((tx: any, txIndex: number) => {
                      const credit = cleanValue(tx.credit || tx.deposits || tx.deposit)
                      const debit = cleanValue(tx.debit || tx.withdrawals || tx.withdrawal)
                      const balance = cleanValue(tx.balance || tx.solde)
                      const category = tx.category || null
                      const flags = tx.flags || []

                      // Get category color
                      const getCategoryColor = (cat: string) => {
                        const colors: any = {
                          'groceries': 'bg-orange-100 text-orange-700',
                          'transport': 'bg-blue-100 text-blue-700',
                          'entertainment': 'bg-purple-100 text-purple-700',
                          'bills': 'bg-red-100 text-red-700',
                          'income': 'bg-green-100 text-green-700',
                          'shopping': 'bg-pink-100 text-pink-700',
                          'health': 'bg-teal-100 text-teal-700',
                          'transfer': 'bg-gray-100 text-gray-700',
                          'other': 'bg-gray-100 text-gray-700'
                        }
                        return colors[cat?.toLowerCase()] || 'bg-gray-100 text-gray-700'
                      }

                      // Get flag color
                      const getFlagColor = (flag: string) => {
                        const colors: any = {
                          'duplicate': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                          'suspicious': 'bg-red-100 text-red-700 border-red-300',
                          'recurring': 'bg-blue-100 text-blue-700 border-blue-300',
                          'large': 'bg-orange-100 text-orange-700 border-orange-300',
                          'verified': 'bg-green-100 text-green-700 border-green-300'
                        }
                        return colors[flag?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-300'
                      }

                      return (
                        <tr key={txIndex} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-gray-400" />
                              <span className="text-sm text-gray-700 font-medium">
                                {tx.date ? formatDateShort(tx.date) : 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 max-w-xs">
                            <p className="text-sm text-gray-900 leading-tight truncate" title={tx.description || tx.details}>
                              {tx.description || tx.details || 'Transaction'}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {category ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                                <Tag size={10} />
                                {category}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {flags && flags.length > 0 ? (
                                flags.map((flag: string, flagIndex: number) => (
                                  <span
                                    key={flagIndex}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${getFlagColor(flag)}`}
                                  >
                                    <Flag size={10} />
                                    {flag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            {credit > 0 ? (
                              <span className="text-sm font-semibold tabular-nums text-green-600">
                                +{formatCurrency(credit)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            {debit > 0 ? (
                              <span className="text-sm font-semibold tabular-nums text-red-600">
                                -{formatCurrency(debit)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <span className="text-sm text-gray-900 tabular-nums font-medium">
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
                  onClick={() => setShowDebugModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all text-xs font-medium"
                >
                  <FileText size={14} />
                  Debug
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

      {/* Debug Modal */}
      {showDebugModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDebugModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={24} />
                <div>
                  <h3 className="text-lg font-bold">Debug - Données Raw</h3>
                  <p className="text-sm text-purple-100">Données complètes de l'analyse</p>
                </div>
              </div>
              <button
                onClick={() => setShowDebugModal(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <pre className="bg-gray-50 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-gray-200">
                {JSON.stringify({
                  analysis: {
                    id: analysis?.id,
                    client_name: analysis?.client_name,
                    client_email: analysis?.client_email,
                    client_phones: analysis?.client_phones,
                    client_address: analysis?.client_address,
                    inverite_guid: analysis?.inverite_guid,
                    source: analysis?.source,
                    total_accounts: analysis?.total_accounts,
                    total_balance: analysis?.total_balance,
                    total_transactions: analysis?.total_transactions,
                    created_at: analysis?.created_at,
                  },
                  raw_data: analysis?.raw_data,
                  accounts: accounts,
                }, null, 2)}
              </pre>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Copier ou télécharger les données de debug
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium"
                >
                  Fermer
                </button>
                <button
                  onClick={downloadDebugData}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <Download size={16} />
                  Télécharger
                </button>
                <button
                  onClick={copyDebugData}
                  className={`px-4 py-2 rounded-lg text-white transition-all text-sm font-medium flex items-center gap-2 ${
                    debugCopied
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {debugCopied ? (
                    <>
                      <Check size={16} />
                      Copié!
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      Copier
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Export with SSR disabled to prevent hydration errors
export default dynamic(() => Promise.resolve(AnalysePageContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-[#00874e] mx-auto mb-3" />
        <p className="text-gray-600 text-sm font-medium">Chargement de l'analyse...</p>
      </div>
    </div>
  )
})
