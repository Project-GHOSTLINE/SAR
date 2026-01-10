'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Building, DollarSign, TrendingUp, CreditCard,
  ChevronDown, ChevronUp, Calendar, User, Mail, Phone,
  MapPin, RefreshCw, Loader2
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
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#00874e] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de l'analyse...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center bg-white rounded-2xl shadow-lg p-12 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error || 'Analyse introuvable'}</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-3 bg-[#00874e] text-white rounded-xl hover:bg-[#00653a] transition-colors font-medium"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm hover:shadow mb-4"
          >
            <ArrowLeft size={16} />
            Retour au dashboard
          </button>

          <div className="bg-gradient-to-r from-[#00874e] to-emerald-600 rounded-2xl shadow-2xl p-8 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">{analysis.client_name}</h1>
                <p className="text-emerald-100 text-lg">Analyse bancaire Inverite/Flinks</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                analysis.source === 'inverite'
                  ? 'bg-blue-500 text-white'
                  : 'bg-purple-500 text-white'
              }`}>
                {analysis.source === 'inverite' ? 'Inverite' : 'Flinks'}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building size={20} />
                  <p className="text-emerald-100 text-sm">Comptes</p>
                </div>
                <p className="text-3xl font-bold">{analysis.total_accounts}</p>
              </div>

              <div className="bg-white bg-opacity-20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={20} />
                  <p className="text-emerald-100 text-sm">Balance totale</p>
                </div>
                <p className="text-3xl font-bold">{formatCurrency(analysis.total_balance)}</p>
              </div>

              <div className="bg-white bg-opacity-20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={20} />
                  <p className="text-emerald-100 text-sm">Transactions</p>
                </div>
                <p className="text-3xl font-bold">{analysis.total_transactions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Info */}
        {(analysis.client_email || analysis.client_phones || analysis.client_address) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Informations client
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {analysis.client_email && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Mail size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{analysis.client_email}</p>
                  </div>
                </div>
              )}

              {analysis.client_phones && analysis.client_phones.length > 0 && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Phone size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="font-medium">{analysis.client_phones.join(', ')}</p>
                  </div>
                </div>
              )}

              {analysis.client_address && (
                <div className="flex items-center gap-3 text-gray-700 col-span-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <MapPin size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Adresse</p>
                    <p className="font-medium">{analysis.client_address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar size={18} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Analyse créée le</p>
                  <p className="font-medium">{formatDate(analysis.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accounts */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard size={24} />
            Comptes bancaires ({accounts.length})
          </h2>

          <div className="space-y-4">
            {accounts && accounts.map((account: any, index: number) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedAccount(expandedAccount === index ? null : index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {account.title || account.accountNumber || account.account_number || `Compte ${index + 1}`}
                        </h3>
                        {account.type && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {account.type}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">
                        {account.account_number || account.accountNumber || 'Numéro inconnu'}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">
                          {formatCurrency(account.current_balance || account.balance || 0)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {account.transactions ? `${account.transactions.length} transactions` : 'Aucune transaction'}
                        </p>
                      </div>

                      <div className="text-gray-400">
                        {expandedAccount === index ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Transactions */}
                {expandedAccount === index && account.transactions && account.transactions.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="font-bold text-gray-900 mb-4 text-lg">
                      Transactions récentes ({account.transactions.length})
                    </h4>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {account.transactions.map((tx: any, txIndex: number) => {
                        // Calculer le montant (retrait = négatif, dépôt = positif)
                        const withdrawal = parseFloat(tx.withdrawals || tx.withdrawal || 0)
                        const deposit = parseFloat(tx.deposits || tx.deposit || 0)
                        const amount = tx.amount !== undefined ? parseFloat(tx.amount) : (deposit - withdrawal)
                        const balance = parseFloat(tx.balance || tx.solde || 0)

                        return (
                          <div key={txIndex} className="bg-white p-4 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{tx.description || 'Transaction'}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {tx.date ? new Date(tx.date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${
                                  amount >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                                </p>
                                {balance !== 0 && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Solde: {formatCurrency(balance)}
                                  </p>
                                )}
                              </div>
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
        </div>

        {/* Footer Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <p className="font-medium">ID Analyse: <span className="font-mono">{analysis.id}</span></p>
              {analysis.inverite_guid && (
                <p className="mt-1">GUID Inverite: <span className="font-mono">{analysis.inverite_guid}</span></p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchAnalysis}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm hover:shadow"
              >
                <RefreshCw size={18} />
                Rafraîchir
              </button>

              <button
                onClick={() => router.push('/admin/analyses')}
                className="px-6 py-3 bg-[#00874e] text-white rounded-xl hover:bg-[#00653a] transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                Voir toutes les analyses
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalysePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#00874e] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de l'analyse...</p>
        </div>
      </div>
    }>
      <AnalysePageContent />
    </Suspense>
  )
}
