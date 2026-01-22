'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Dynamic from 'next/dynamic'
import AdminNav from '@/components/admin/AdminNav'
import ScoreDisplay from '@/components/admin/ScoreDisplay'
import RecommendationCard from '@/components/admin/RecommendationCard'
import MetricsPanel from '@/components/admin/MetricsPanel'
import {
  ArrowLeft, Building, DollarSign, TrendingUp, CreditCard,
  Calendar, User, Mail, Phone, MapPin, RefreshCw, Loader2,
  Search, Filter, ChevronLeft, ChevronRight, FileText, Download, BarChart3,
  Tag, Flag, Menu, X, Briefcase, Wallet, Landmark, Check
} from 'lucide-react'
import type { AnalysisScore, AnalysisRecommendation, AnalysisJob } from '@/types/analysis'

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
  // Nouveaux champs pour analyse automatique
  scores?: AnalysisScore | null
  recommendation?: AnalysisRecommendation | null
  job?: AnalysisJob | null
  analyzed_at?: string | null
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

  // États pour l'analyse automatique
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

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

  // Polling pour vérifier la complétion de l'analyse automatique
  useEffect(() => {
    // Vérifier si l'analyse a un job en cours
    const hasActiveJob = analysis?.job &&
      (analysis.job.status === 'pending' || analysis.job.status === 'processing')

    if (hasActiveJob && !pollingInterval) {
      setIsAnalyzing(true)

      // Démarrer le polling toutes les 3 secondes
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/client-analysis?id=${analysisId}`, {
            credentials: 'include'
          })

          if (res.ok) {
            const data = await res.json()
            const updatedAnalysis = data.data

            // Mettre à jour l'analyse
            setAnalysis(prev => ({
              ...prev!,
              ...updatedAnalysis
            }))

            // Si le job est complété, arrêter le polling
            if (updatedAnalysis.job?.status === 'completed' ||
                updatedAnalysis.job?.status === 'failed' ||
                updatedAnalysis.scores) {
              setIsAnalyzing(false)
              if (pollingInterval) {
                clearInterval(pollingInterval)
                setPollingInterval(null)
              }
            }
          }
        } catch (err) {
          console.error('Erreur polling:', err)
        }
      }, 3000)

      setPollingInterval(interval)
    } else if (!hasActiveJob && pollingInterval) {
      // Arrêter le polling si plus de job actif
      clearInterval(pollingInterval)
      setPollingInterval(null)
      setIsAnalyzing(false)
    }

    // Cleanup
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [analysis?.job, analysisId, pollingInterval])

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
          <Loader2 size={40} className="animate-spin text-[#10B981] mx-auto mb-3" />
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
            className="px-5 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium text-sm"
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
          <div className="bg-gradient-to-br from-[#10B981] to-emerald-700 rounded-lg shadow-lg p-3 mb-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* COLONNE GAUCHE - Paies */}
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={16} className="text-white shrink-0" />
                  <h3 className="text-lg font-bold text-white">Dernières paies</h3>
                </div>

                {(() => {
                  const rawData = analysis.raw_data || {}
                  const source = analysis.source // 'flinks' ou 'inverite'

                  // Extraire les paychecks depuis les transactions
                  const allTransactions = accounts.flatMap((acc: any) => acc.transactions || [])

                  let paychecks: any[] = []

                  if (source === 'flinks') {
                    // RÈGLE FLINKS: Analyser la description avec mots-clés
                    const paycheckKeywords = [
                      'paie/payroll',
                      'payroll',
                      'paie',
                      'salaire',
                      'salary',
                      'pay/pay',
                      'remuneration',
                      'traitement',
                      'paye'
                    ]

                    paychecks = allTransactions
                      .filter((tx: any) => {
                        if (!tx.description) return false
                        const desc = tx.description.toLowerCase()
                        return paycheckKeywords.some(keyword => desc.includes(keyword))
                      })
                      .filter((tx: any) => {
                        // S'assurer qu'il y a un dépôt dans le champ deposits
                        const amount = parseFloat(tx.deposits?.replace(/[^0-9.-]/g, '') || 0)
                        return amount > 0
                      })
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((tx: any) => {
                        // Extraire l'employeur depuis la description
                        let employer = tx.description
                          .replace(/paie\/payroll/gi, '')
                          .replace(/payroll/gi, '')
                          .replace(/paie/gi, '')
                          .replace(/pay\/pay/gi, '')
                          .replace(/paye/gi, '')
                          .trim()

                        // Si vide après nettoyage, utiliser "Employeur principal"
                        if (!employer || employer.length < 2) {
                          employer = 'Employeur principal'
                        }

                        return {
                          date: tx.date,
                          employer: employer,
                          amount: parseFloat(tx.deposits?.replace(/[^0-9.-]/g, '') || 0)
                        }
                      })

                  } else {
                    // RÈGLE INVERITE: Utiliser category et flags
                    paychecks = allTransactions
                      .filter((tx: any) => {
                        if (tx.category === 'income/paycheck') return true
                        if (Array.isArray(tx.flags) && tx.flags.includes('is_payroll')) return true
                        return false
                      })
                      .filter((tx: any) => {
                        // S'assurer qu'il y a un crédit
                        const amount = parseFloat(tx.credit || tx.amount || 0)
                        return amount > 0
                      })
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((tx: any) => {
                        // Extraire l'employeur depuis details
                        const employer = tx.details?.replace(/^(SalaryPayroll\s*\/|Salary\/|Payroll\/)/i, '').trim() || 'Employeur'

                        return {
                          date: tx.date,
                          employer: employer,
                          amount: parseFloat(tx.credit || tx.amount || 0)
                        }
                      })
                  }

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
                    const avgDiffRounded = Math.round(avgDiff)

                    // Toujours afficher la fréquence en jours
                    frequency = `~${avgDiffRounded} jours`

                    if (avgDiff >= 6 && avgDiff <= 8) {
                      const lastDate = new Date(paychecks[0].date)
                      nextPayDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                    } else if (avgDiff >= 13 && avgDiff <= 15) {
                      const lastDate = new Date(paychecks[0].date)
                      nextPayDate = new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000)
                    } else if (avgDiff >= 28 && avgDiff <= 31) {
                      const lastDate = new Date(paychecks[0].date)
                      nextPayDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                    } else {
                      // Pour les autres cas, utiliser la moyenne calculée
                      const lastDate = new Date(paychecks[0].date)
                      nextPayDate = new Date(lastDate.getTime() + avgDiffRounded * 24 * 60 * 60 * 1000)
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
                          <span className="text-xs text-white/80 font-medium uppercase">Employeur principal</span>
                          <span className="text-base text-white font-bold">{mainEmployer}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/80 font-medium uppercase">Fréquence</span>
                          <span className="text-base text-white font-bold">{frequency}</span>
                        </div>
                      </div>

                      {/* Liste des 5 dernières paies */}
                      {paychecks.length > 0 ? (
                        <div className="space-y-1 mb-2">
                          {paychecks.map((pay, idx) => (
                            <div key={idx} className="bg-white/5 rounded px-3 py-2 grid grid-cols-3 gap-2 items-center hover:bg-white/20 transition-colors cursor-pointer">
                              <div className="text-left">
                                <p className="text-sm text-white/90 break-words leading-tight font-bold">{pay.employer}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-base text-white font-bold whitespace-nowrap">
                                  {new Date(pay.date).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-bold text-white">{formatCurrency(pay.amount)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-white/70 italic">Aucune paie détectée</p>
                      )}

                      {/* Prochaine paie prédite */}
                      {nextPayDate && (
                        <div className="bg-emerald-500/30 rounded px-2 py-2 border-2 border-emerald-300/50 shadow-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white font-bold uppercase">Prochaine paie estimée</span>
                            <span className="text-lg font-bold text-white">
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
                  <CreditCard size={16} className="text-white shrink-0" />
                  <h3 className="text-lg font-bold text-white">Comptes bancaires</h3>
                  <span className="text-base text-emerald-200">({accounts.length})</span>
                </div>

                {/* Grille de comptes - Max 2 par ligne */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {accounts.map((account: any, index: number) => {
                    const isSelected = selectedAccountIndex === index
                    const accountBalance = cleanValue(account.current_balance || account.balance)
                    const bankName = account.bank || 'Banque inconnue'
                    const accountNumber = account.account || '0000000'
                    const institutionNumber = account.institution || '000'
                    const transitNumber = account.transit || account.routing_code || '00000'
                    const accountName = account.account_description || account.name || 'Compte'
                    const accountType = account.type || ''
                    const bankStyle = getBankStyle(bankName)

                    // Calculer les totaux des dépôts et débits pour ce compte
                    let totalDeposits = 0
                    let totalWithdrawals = 0

                    if (account.transactions && Array.isArray(account.transactions)) {
                      account.transactions.forEach((tx: any) => {
                        const credit = cleanValue(tx.credit || tx.deposits || tx.deposit)
                        const debit = cleanValue(tx.debit || tx.withdrawals || tx.withdrawal)

                        if (credit > 0) totalDeposits += credit
                        if (debit > 0) totalWithdrawals += debit
                      })
                    }

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
                                <p className="text-xs font-bold">{account.transactions.length} tx</p>
                              </div>
                            </div>
                          )}

                          {/* Nom du compte */}
                          <p className={`text-sm font-bold mb-2 break-words leading-tight ${isSelected ? 'text-white' : 'text-white'}`}>
                            {bankName}
                          </p>
                          <p className={`text-xs font-semibold mb-2 break-words leading-tight ${isSelected ? 'text-white/90' : 'text-white/90'}`}>
                            {accountName}
                          </p>

                          {/* Numéros sur une ligne */}
                          <p className={`text-xs font-mono font-bold mb-2 ${
                            isSelected ? 'text-white/95' : 'text-white/90'
                          }`}>
                            Institution: {institutionNumber} • Transit: {transitNumber} • Compte: {accountNumber}
                          </p>

                          {/* Montants */}
                          <div className="space-y-1">
                            {/* Solde */}
                            <div className={`py-1 px-2 rounded border border-dashed ${
                              isSelected ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white/80 font-medium">Solde:</span>
                                <p className={`text-lg font-bold tabular-nums ${
                                  isSelected ? 'text-white' : 'text-white'
                                }`}>
                                  {formatCurrency(accountBalance)}
                                </p>
                              </div>
                            </div>

                            {/* Total Dépôts */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/80 font-medium">Total dépôts:</span>
                              <span className="text-sm font-bold text-green-300 tabular-nums">
                                +{formatCurrency(totalDeposits)}
                              </span>
                            </div>

                            {/* Total Débits */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/80 font-medium">Total débits:</span>
                              <span className="text-sm font-bold text-red-300 tabular-nums">
                                -{formatCurrency(totalWithdrawals)}
                              </span>
                            </div>
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

          {/* Section Analyse Automatique SAR */}
          {isAnalyzing && (
            <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4 mb-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <div>
                  <h3 className="text-base font-semibold text-blue-900">Analyse automatique en cours...</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Calcul du SAR Score et génération de recommandation en cours. Cela peut prendre quelques secondes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {analysis?.scores && (
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* SAR Score Display */}
                <div className="lg:col-span-1">
                  <ScoreDisplay scores={analysis.scores} isLoading={isAnalyzing} />
                </div>

                {/* Recommendation Card */}
                <div className="lg:col-span-2">
                  <RecommendationCard recommendation={analysis.recommendation || null} isLoading={isAnalyzing} />
                </div>
              </div>

              {/* Financial Metrics Panel */}
              <MetricsPanel scores={analysis.scores} isLoading={isAnalyzing} />
            </div>
          )}

          {/* Analyse Mensuelle Section - MOVED FROM SIDEBAR */}
          {selectedAccount && selectedAccount.transactions && selectedAccount.transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
              {/* Header Mois */}
              <div className="mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-blue-700 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <BarChart3 size={16} className="text-white" />
                  </div>
                  <span>Analyse Mensuelle</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1 ml-10 font-medium">Filtrer les transactions par période</p>
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
                          ? 'bg-gradient-to-br from-[#10B981] to-emerald-600 text-white shadow-lg scale-105'
                          : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm hover:shadow-md border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold text-base capitalize ${
                              isSelected ? 'text-white' : 'text-gray-900'
                            }`}>
                              {month.name}
                            </h3>
                            {month.index === 0 && (
                              <span className={`rounded-full font-semibold px-2 py-0.5 text-sm ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                Actuel
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${isSelected ? 'text-emerald-100' : 'text-gray-500'}`}>
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
                          <span className={`text-sm ${isSelected ? 'text-emerald-100' : 'text-gray-600'}`}>
                            Revenus
                          </span>
                          <span className={`font-semibold tabular-nums text-lg ${
                            isSelected ? 'text-white' : 'text-green-600'
                          }`}>
                            +{formatCurrency(month.credits)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${isSelected ? 'text-emerald-100' : 'text-gray-600'}`}>
                            Dépenses
                          </span>
                          <span className={`font-semibold tabular-nums text-lg ${
                            isSelected ? 'text-white' : 'text-red-600'
                          }`}>
                            -{formatCurrency(month.debits)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t" style={{
                          borderColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                        }}>
                          <span className={`text-sm font-medium ${isSelected ? 'text-emerald-100' : 'text-gray-700'}`}>
                            Net
                          </span>
                          <span className={`text-lg font-bold tabular-nums ${
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
              className="lg:hidden fixed bottom-6 left-6 z-50 w-14 h-14 bg-gradient-to-br from-[#10B981] to-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
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
                {/* Nom du client - Glassmorphism */}
                <div className="mb-4 rounded-xl p-4 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 135, 78, 0.08) 0%, rgba(16, 185, 129, 0.12) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0, 135, 78, 0.2)',
                    boxShadow: '0 4px 12px rgba(0, 135, 78, 0.1)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-emerald-600 rounded-full flex items-center justify-center shrink-0 shadow-lg">
                      <User size={20} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 break-words leading-tight">{analysis.client_name}</h2>
                  </div>
                  <div className="flex items-center gap-2 ml-[52px]">
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
                  // Pour Flinks, utiliser clientInfo.institution directement
                  const rawData = analysis.raw_data || {}
                  const clientInfo = rawData.clientInfo || {}
                  const institutionName = clientInfo.institution ||
                    accounts[selectedAccountIndex]?.bank ||
                    accounts[selectedAccountIndex]?.institution ||
                    accounts[0]?.bank ||
                    accounts[0]?.institution ||
                    'Institution inconnue'
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
                          <p className="text-base font-bold">{institutionName}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Informations de contact - Glassmorphism */}
                <div className="space-y-3 mb-3">
                  {analysis.client_email && (
                    <div className="rounded-xl p-3 flex items-start gap-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.12) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                      }}
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-md">
                        <Mail size={16} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wide mb-0.5">Email</p>
                        <p className="text-sm text-gray-900 font-medium break-all leading-tight">{analysis.client_email}</p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl p-3 flex items-start gap-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.12) 100%)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
                    }}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-md">
                      <Phone size={16} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide mb-0.5">Téléphone</p>
                      {analysis.client_phones && analysis.client_phones.length > 0 ? (
                        <div className="space-y-1">
                          {analysis.client_phones.map((phone: string, idx: number) => (
                            <p key={idx} className="text-sm text-gray-900 font-medium break-words leading-tight">
                              {phone}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          {analysis.source === 'flinks' ? 'Non disponible (Flinks)' : 'Non disponible'}
                        </p>
                      )}
                    </div>
                  </div>

                  {analysis.client_address && (
                    <div className="rounded-xl p-3 flex items-start gap-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.12) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
                      }}
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shrink-0 shadow-md">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide mb-0.5">Adresse</p>
                        <p className="text-xs text-gray-900 font-medium break-words leading-tight">{analysis.client_address}</p>
                      </div>
                    </div>
                  )}

                  {/* Employeur */}
                  {(() => {
                    const rawData = analysis.raw_data || {}
                    const clientInfo = rawData.clientInfo || {}
                    const paychecks = rawData.paychecks || []
                    const employerName = clientInfo.employer || rawData.employerName || rawData.employer ||
                      (paychecks.length > 0 ? (paychecks[0].employer || paychecks[0].employerName) : null)

                    if (employerName) {
                      return (
                        <div className="rounded-xl p-3 flex items-start gap-3"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.12) 100%)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)'
                          }}
                        >
                          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center shrink-0 shadow-md">
                            <Briefcase size={16} className="text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-violet-700 font-bold uppercase tracking-wide mb-0.5">Employeur</p>
                            <p className="text-sm text-gray-900 font-medium break-words leading-tight">{employerName}</p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>

                <div className="border-t border-gray-200 my-3"></div>

                {/* Stats - Compact */}
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building size={14} className="text-[#10B981]" />
                      <span className="text-sm font-medium text-gray-600">Comptes</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{analysis.total_accounts}</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-[#10B981]" />
                      <span className="text-sm font-medium text-gray-600">Balance totale</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(analysis.total_balance)}</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-[#10B981]" />
                      <span className="text-sm font-medium text-gray-600">Transactions</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{analysis.total_transactions}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 mx-4"></div>

              {/* Additional Flinks/Inverite Metadata */}
              <div className="p-4 pt-3">
                {(() => {
                  const rawData = analysis.raw_data || {}
                  const clientInfo = rawData.clientInfo || {} // Flinks stocke les infos ici
                  const paychecks = rawData.paychecks || []

                  // Extract toutes les infos depuis clientInfo (Flinks) ou rawData (Inverite)
                  const loginId = clientInfo.loginId || rawData.loginId || rawData.login_id
                  const requestId = clientInfo.requestId || rawData.requestId || rawData.request_id
                  const requestDateTime = clientInfo.requestDate || rawData.requestDateTime || rawData.request_date_time
                  const requestStatus = clientInfo.requestStatus || rawData.requestStatus || rawData.request_status
                  const daysDetected = clientInfo.daysDetected || rawData.daysDetected || rawData.days_detected

                  const hasAnyMetadata = loginId || requestId || requestDateTime || requestStatus || daysDetected

                  if (hasAnyMetadata) {
                    return (
                      <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-2">
                          <FileText size={12} />
                          Métadonnées {analysis.source === 'flinks' ? 'Flinks' : 'Inverite'}
                        </h3>

                        {loginId && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                              <User size={14} className="text-gray-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 font-medium">Login ID</p>
                              <p className="text-[10px] text-gray-900 font-mono break-all leading-tight">{loginId}</p>
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
                              <p className="text-[10px] text-gray-900 font-mono break-all leading-tight">{requestId}</p>
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

                {/* Section Income Analysis pour Flinks */}
                {analysis.source === 'flinks' && (() => {
                  const rawData = analysis.raw_data || {}
                  const clientInfo = rawData.clientInfo || {}

                  // Parser le texte daysDetected qui contient toutes les infos
                  const daysDetectedText = clientInfo.daysDetected || rawData.daysDetected || ''

                  // Fonction pour extraire les valeurs entre les labels
                  const extractValue = (text: string, label: string, nextLabel?: string) => {
                    const labelIndex = text.indexOf(label)
                    if (labelIndex === -1) return 'N/A'

                    const startIndex = labelIndex + label.length
                    let endIndex = text.length

                    // Trouver le prochain label pour délimiter
                    if (nextLabel) {
                      const nextIndex = text.indexOf(nextLabel, startIndex)
                      if (nextIndex !== -1) endIndex = nextIndex
                    }

                    return text.substring(startIndex, endIndex).trim() || 'N/A'
                  }

                  // Extraire chaque valeur
                  const employerInfo = extractValue(daysDetectedText, 'Employer Info', 'Employer Income')
                  const employerIncome = extractValue(daysDetectedText, 'Employer Income(Average Monthly)', 'Employer Inc. Trend')
                  const employerIncTrend = extractValue(daysDetectedText, 'Employer Inc. Trend', 'Non-Employer Info')
                  const nonEmployerInfo = extractValue(daysDetectedText, 'Non-Employer Info', 'Non-Employer Income')
                  const nonEmployerIncome = extractValue(daysDetectedText, 'Non-Employer Income(Average Monthly)', 'Government Income')
                  const governmentIncome = extractValue(daysDetectedText, 'Government Income(Average Monthly)', 'Total Deposits Trend')
                  const totalDepositsTrend = extractValue(daysDetectedText, 'Total Deposits Trend', undefined)

                  // Extraire le nombre de jours détectés (avant "Employer Info")
                  let daysDetected = 'N/A'
                  const employerInfoIndex = daysDetectedText.indexOf('Employer Info')
                  if (employerInfoIndex > 0) {
                    daysDetected = daysDetectedText.substring(0, employerInfoIndex).trim()
                  }

                  return (
                    <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                      <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-2 mb-3">
                        <TrendingUp size={12} />
                        Analyse de revenus (Flinks)
                      </h3>

                      {/* Jours détectés */}
                      <div className="bg-purple-50 rounded-lg p-2">
                        <p className="text-[10px] text-purple-600 font-bold uppercase mb-0.5">Jours détectés</p>
                        <p className="text-sm text-gray-900 font-semibold">{daysDetected}</p>
                      </div>

                      {/* Employer Info */}
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-[10px] text-blue-600 font-bold uppercase mb-0.5">Employer Info</p>
                        <p className="text-sm text-gray-900 font-medium">{employerInfo}</p>
                      </div>

                      {/* Employer Income */}
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-[10px] text-green-600 font-bold uppercase mb-0.5">Employer Income (Average Monthly)</p>
                        <p className="text-sm text-gray-900 font-semibold">{employerIncome}</p>
                      </div>

                      {/* Employer Inc. Trend */}
                      <div className="bg-emerald-50 rounded-lg p-2">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Employer Inc. Trend</p>
                        <p className="text-sm text-gray-900 font-medium">{employerIncTrend}</p>
                      </div>

                      {/* Non-Employer Info */}
                      <div className="bg-amber-50 rounded-lg p-2">
                        <p className="text-[10px] text-amber-600 font-bold uppercase mb-0.5">Non-Employer Info</p>
                        <p className="text-sm text-gray-900 font-medium">{nonEmployerInfo}</p>
                      </div>

                      {/* Non-Employer Income */}
                      <div className="bg-orange-50 rounded-lg p-2">
                        <p className="text-[10px] text-orange-600 font-bold uppercase mb-0.5">Non-Employer Income (Average Monthly)</p>
                        <p className="text-sm text-gray-900 font-semibold">{nonEmployerIncome}</p>
                      </div>

                      {/* Government Income */}
                      <div className="bg-red-50 rounded-lg p-2">
                        <p className="text-[10px] text-red-600 font-bold uppercase mb-0.5">Government Income (Average Monthly)</p>
                        <p className="text-sm text-gray-900 font-semibold">{governmentIncome}</p>
                      </div>

                      {/* Total Deposits Trend */}
                      <div className="bg-indigo-50 rounded-lg p-2">
                        <p className="text-[10px] text-indigo-600 font-bold uppercase mb-0.5">Total Deposits Trend</p>
                        <p className="text-sm text-gray-900 font-medium">{totalDepositsTrend}</p>
                      </div>
                    </div>
                  )
                })()}

                {/* 4 dernières paies */}
                {(() => {
                  const paychecks = analysis.raw_data?.paychecks || []
                  const last4Paychecks = paychecks.slice(-4).reverse()

                  if (last4Paychecks.length > 0) {
                    return (
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                                      <p className="text-sm font-semibold text-emerald-800">
                                        {date ? new Date(date).toLocaleDateString('fr-CA', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        }) : 'Date inconnue'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Briefcase size={10} className="text-gray-500 shrink-0" />
                                      <p className="text-xs text-gray-700 break-words leading-tight font-medium">{employer}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(amount)}</p>
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
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={16} />
                    Transactions - {monthsData[selectedMonth].name} ({filteredTransactions.length})
                  </h2>
                  <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm font-medium text-gray-700">
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
                      className="w-full pl-9 pr-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
                    />
                  </div>

                  {/* Filter Type */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent bg-white"
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
                      <th className={`${analysis.source === 'flinks' ? 'px-2 py-2 text-left w-[15%]' : 'px-3 py-3 text-center'} text-sm font-semibold text-gray-700 uppercase tracking-wide`}>
                        Date
                      </th>
                      <th className={`${analysis.source === 'flinks' ? 'px-2 py-2 text-left w-[40%]' : 'px-3 py-3 text-center'} text-sm font-semibold text-gray-700 uppercase tracking-wide`}>
                        Description
                      </th>
                      <th className={`${analysis.source === 'flinks' ? 'px-2 py-2 text-left w-[15%]' : 'px-3 py-3 text-center w-32'} text-sm font-semibold text-gray-700 uppercase tracking-wide`}>
                        Crédit
                      </th>
                      <th className={`${analysis.source === 'flinks' ? 'px-2 py-2 text-left w-[15%]' : 'px-3 py-3 text-center w-32'} text-sm font-semibold text-gray-700 uppercase tracking-wide`}>
                        Débit
                      </th>
                      <th className={`${analysis.source === 'flinks' ? 'px-2 py-2 text-left w-[15%]' : 'px-3 py-3 text-center w-32'} text-sm font-semibold text-gray-700 uppercase tracking-wide`}>
                        Solde
                      </th>
                      {analysis.source === 'inverite' && (
                        <>
                          <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            <div className="flex items-center justify-center gap-1.5">
                              <Tag size={14} />
                              Catégorie
                            </div>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTransactions.map((tx: any, txIndex: number) => {
                      const credit = cleanValue(tx.credit || tx.deposits || tx.deposit)
                      const debit = cleanValue(tx.debit || tx.withdrawals || tx.withdrawal)
                      const balance = cleanValue(tx.balance || tx.solde)
                      const category = tx.category || null
                      const flags = tx.flags || []

                      // Get transaction type from description (for Flinks)
                      const getTransactionType = (description: string) => {
                        if (!description) return { emoji: '📄', color: 'text-gray-700', bg: 'bg-gray-50' }

                        const desc = description.toLowerCase()

                        // Income patterns
                        if (desc.includes('deposit') || desc.includes('dépôt') || desc.includes('paie') ||
                            desc.includes('salary') || desc.includes('salaire') || desc.includes('pay') ||
                            desc.includes('virement reçu') || desc.includes('interac reçu')) {
                          return { emoji: '💰', color: 'text-emerald-700', bg: 'bg-emerald-50' }
                        }

                        // Transfer patterns
                        if (desc.includes('transfer') || desc.includes('virement') || desc.includes('e-transfer') ||
                            desc.includes('interac') || desc.includes('etransfer')) {
                          return { emoji: '🔄', color: 'text-blue-700', bg: 'bg-blue-50' }
                        }

                        // Bill payments
                        if (desc.includes('bill') || desc.includes('facture') || desc.includes('hydro') ||
                            desc.includes('electric') || desc.includes('électricité') || desc.includes('utilities')) {
                          return { emoji: '💡', color: 'text-red-700', bg: 'bg-red-50' }
                        }

                        // Rent/Mortgage
                        if (desc.includes('rent') || desc.includes('loyer') || desc.includes('mortgage') ||
                            desc.includes('hypothèque')) {
                          return { emoji: '🏠', color: 'text-indigo-700', bg: 'bg-indigo-50' }
                        }

                        // Shopping
                        if (desc.includes('amazon') || desc.includes('walmart') || desc.includes('costco') ||
                            desc.includes('store') || desc.includes('magasin')) {
                          return { emoji: '🛍️', color: 'text-pink-700', bg: 'bg-pink-50' }
                        }

                        // Groceries
                        if (desc.includes('grocery') || desc.includes('épicerie') || desc.includes('supermarket') ||
                            desc.includes('iga') || desc.includes('metro') || desc.includes('provigo')) {
                          return { emoji: '🛒', color: 'text-orange-700', bg: 'bg-orange-50' }
                        }

                        // Restaurants
                        if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('coffee') ||
                            desc.includes('tim hortons') || desc.includes('starbucks') || desc.includes('mcdonald')) {
                          return { emoji: '🍔', color: 'text-amber-700', bg: 'bg-amber-50' }
                        }

                        // Gas/Transport
                        if (desc.includes('gas') || desc.includes('essence') || desc.includes('petro') ||
                            desc.includes('shell') || desc.includes('esso') || desc.includes('transport')) {
                          return { emoji: '⛽', color: 'text-cyan-700', bg: 'bg-cyan-50' }
                        }

                        // ATM/Cash
                        if (desc.includes('atm') || desc.includes('retrait') || desc.includes('withdrawal') ||
                            desc.includes('cash')) {
                          return { emoji: '🏧', color: 'text-gray-700', bg: 'bg-gray-50' }
                        }

                        // Fees
                        if (desc.includes('fee') || desc.includes('frais') || desc.includes('charge')) {
                          return { emoji: '💳', color: 'text-red-700', bg: 'bg-red-50' }
                        }

                        // Telecom
                        if (desc.includes('bell') || desc.includes('rogers') || desc.includes('telus') ||
                            desc.includes('videotron') || desc.includes('mobile') || desc.includes('internet')) {
                          return { emoji: '📱', color: 'text-fuchsia-700', bg: 'bg-fuchsia-50' }
                        }

                        // Insurance
                        if (desc.includes('insurance') || desc.includes('assurance')) {
                          return { emoji: '🛡️', color: 'text-violet-700', bg: 'bg-violet-50' }
                        }

                        // Default
                        return { emoji: '📄', color: 'text-gray-700', bg: 'bg-gray-50' }
                      }

                      // Get category emoji
                      const getCategoryEmoji = (cat: string) => {
                        const emojis: any = {
                          'groceries': '🛒',
                          'food': '🍔',
                          'restaurant': '🍽️',
                          'transport': '🚗',
                          'gas': '⛽',
                          'entertainment': '🎬',
                          'bills': '💡',
                          'utilities': '💡',
                          'rent': '🏠',
                          'mortgage': '🏠',
                          'income': '💰',
                          'salary': '💵',
                          'shopping': '🛍️',
                          'health': '⚕️',
                          'pharmacy': '💊',
                          'transfer': '🔄',
                          'investment': '📈',
                          'savings': '🏦',
                          'insurance': '🛡️',
                          'education': '📚',
                          'telecom': '📱',
                          'subscription': '📺',
                          'clothing': '👕',
                          'beauty': '💄',
                          'pet': '🐾',
                          'charity': '❤️',
                          'travel': '✈️',
                          'hotel': '🏨',
                          'cash': '💵',
                          'atm': '🏧',
                          'fees': '💳',
                          'tax': '📊',
                          'loan': '🏦',
                          'other': '📄'
                        }
                        return emojis[cat?.toLowerCase()] || '📄'
                      }

                      // Get category color
                      const getCategoryColor = (cat: string) => {
                        // Highlight loan in yellow
                        if (cat?.toLowerCase().includes('loan')) {
                          return 'bg-yellow-300 text-yellow-900 border-2 border-yellow-500 shadow-lg'
                        }

                        const colors: any = {
                          'groceries': 'bg-orange-100 text-orange-800 border border-orange-200',
                          'food': 'bg-orange-100 text-orange-800 border border-orange-200',
                          'restaurant': 'bg-amber-100 text-amber-800 border border-amber-200',
                          'transport': 'bg-blue-100 text-blue-800 border border-blue-200',
                          'gas': 'bg-cyan-100 text-cyan-800 border border-cyan-200',
                          'entertainment': 'bg-purple-100 text-purple-800 border border-purple-200',
                          'bills': 'bg-red-100 text-red-800 border border-red-200',
                          'utilities': 'bg-red-100 text-red-800 border border-red-200',
                          'rent': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
                          'mortgage': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
                          'income': 'bg-green-100 text-green-800 border border-green-200',
                          'salary': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
                          'shopping': 'bg-pink-100 text-pink-800 border border-pink-200',
                          'health': 'bg-teal-100 text-teal-800 border border-teal-200',
                          'pharmacy': 'bg-teal-100 text-teal-800 border border-teal-200',
                          'transfer': 'bg-gray-100 text-gray-800 border border-gray-200',
                          'investment': 'bg-lime-100 text-lime-800 border border-lime-200',
                          'savings': 'bg-green-100 text-green-800 border border-green-200',
                          'insurance': 'bg-violet-100 text-violet-800 border border-violet-200',
                          'education': 'bg-sky-100 text-sky-800 border border-sky-200',
                          'telecom': 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200',
                          'subscription': 'bg-rose-100 text-rose-800 border border-rose-200',
                          'clothing': 'bg-pink-100 text-pink-800 border border-pink-200',
                          'beauty': 'bg-rose-100 text-rose-800 border border-rose-200',
                          'pet': 'bg-amber-100 text-amber-800 border border-amber-200',
                          'charity': 'bg-red-100 text-red-800 border border-red-200',
                          'travel': 'bg-blue-100 text-blue-800 border border-blue-200',
                          'hotel': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
                          'cash': 'bg-green-100 text-green-800 border border-green-200',
                          'atm': 'bg-gray-100 text-gray-800 border border-gray-200',
                          'fees': 'bg-red-100 text-red-800 border border-red-200',
                          'tax': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
                          'other': 'bg-gray-100 text-gray-800 border border-gray-200'
                        }
                        return colors[cat?.toLowerCase()] || 'bg-gray-100 text-gray-800 border border-gray-200'
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

                      // Check if category contains loan
                      const isLoan = category?.toLowerCase().includes('loan')

                      return (
                        <tr key={txIndex} className={`hover:bg-emerald-50 transition-colors cursor-pointer ${isLoan ? 'bg-yellow-100' : ''}`}>
                          <td className={`${analysis.source === 'flinks' ? 'px-2 py-2' : 'px-3 py-3'} whitespace-nowrap`}>
                            {analysis.source === 'flinks' ? (
                              <span className="text-sm text-gray-700 font-medium">
                                {tx.date ? formatDateShort(tx.date) : 'N/A'}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-gray-400" />
                                <span className="text-base text-gray-700 font-medium">
                                  {tx.date ? formatDateShort(tx.date) : 'N/A'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className={`${analysis.source === 'flinks' ? 'px-2 py-2' : 'px-3 py-3'}`}>
                            {analysis.source === 'flinks' ? (
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${getTransactionType(tx.description || tx.details).bg}`}>
                                <span className="text-lg">{getTransactionType(tx.description || tx.details).emoji}</span>
                                <p className={`text-sm font-medium leading-tight break-words ${getTransactionType(tx.description || tx.details).color}`} title={tx.description || tx.details}>
                                  {tx.description || tx.details || 'Transaction'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-900 leading-tight break-words max-w-xs" title={tx.description || tx.details}>
                                {tx.description || tx.details || 'Transaction'}
                              </p>
                            )}
                          </td>
                          <td className={`${analysis.source === 'flinks' ? 'px-2 py-2' : 'px-3 py-3 text-right'} whitespace-nowrap`}>
                            {credit > 0 ? (
                              <span className="text-base font-bold tabular-nums text-green-600">
                                +{formatCurrency(credit)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`${analysis.source === 'flinks' ? 'px-2 py-2' : 'px-3 py-3 text-right'} whitespace-nowrap`}>
                            {debit > 0 ? (
                              <span className="text-base font-bold tabular-nums text-red-600">
                                -{formatCurrency(debit)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`${analysis.source === 'flinks' ? 'px-2 py-2' : 'px-3 py-3 text-right'} whitespace-nowrap`}>
                            <span className="text-base text-gray-900 tabular-nums font-semibold">
                              {balance !== 0 ? formatCurrency(balance) : '-'}
                            </span>
                          </td>
                          {analysis.source === 'inverite' && (
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {category ? (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
                                  <span className="text-base">{getCategoryEmoji(category)}</span>
                                  {category}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          )}
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
                  className="px-3 py-1.5 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium text-xs"
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
export default Dynamic(() => Promise.resolve(AnalysePageContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-[#10B981] mx-auto mb-3" />
        <p className="text-gray-600 text-sm font-medium">Chargement de l'analyse...</p>
      </div>
    </div>
  )
})
