'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Search, RefreshCw, AlertTriangle, CheckCircle,
  XCircle, Clock, User, Mail, Phone, MapPin, X, Plus,
  ChevronDown, TrendingUp, Activity, Filter, DollarSign,
  MessageSquare, FileText, Calendar, CreditCard, Eye,
  Archive, Ban, ExternalLink, Database, Loader2
} from 'lucide-react'

interface VoPayTransaction {
  id: string
  transaction_id: string
  amount: number
  status: string
  date: string
  type: string
  failure_reason?: string
}

interface Message {
  id: string
  subject?: string
  question: string
  date: string
  nom: string
  email: string
  status: string
}

interface BlacklistCase {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  reason: string
  fraud_amount: number
  amount_recovered: number
  status: 'blacklisted' | 'watchlist' | 'cleared'
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  assigned_to: string
  vopay_transactions: VoPayTransaction[]
  messages: Message[]
  created_at: string
  updated_at: string
  notes?: string
  last_activity?: string
}

export default function BlacklistView() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [recentCases, setRecentCases] = useState<BlacklistCase[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<BlacklistCase | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [totalFraudAmount, setTotalFraudAmount] = useState(0)
  const [totalRecovered, setTotalRecovered] = useState(0)

  // Form state for adding new case
  const [newCase, setNewCase] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    reason: '',
    fraud_amount: 0,
    severity: 'high' as 'critical' | 'high' | 'medium' | 'low',
    notes: ''
  })

  useEffect(() => {
    fetchRecentCases()
  }, [])

  const fetchRecentCases = async () => {
    try {
      setLoading(true)

      // Mock data - 10 derniers clients fraudeurs
      const mockCases: BlacklistCase[] = [
        {
          id: 'FRD-001',
          name: 'Jean-Marc Tremblay',
          email: 'jm.tremblay@gmail.com',
          phone: '514-555-0123',
          address: '1234 Rue Saint-Denis, Montréal',
          reason: "Usurpation d'identité + faux documents",
          fraud_amount: 5000,
          amount_recovered: 0,
          status: 'blacklisted',
          severity: 'critical',
          confidence: 95,
          assigned_to: 'Sandra',
          vopay_transactions: [
            {
              id: '1',
              transaction_id: 'VP-2026-001',
              amount: 2500,
              status: 'cancelled',
              date: '2026-01-10T10:00:00Z',
              type: 'eft',
              failure_reason: 'Suspicious activity detected'
            },
            {
              id: '2',
              transaction_id: 'VP-2026-002',
              amount: 2500,
              status: 'failed',
              date: '2026-01-11T14:00:00Z',
              type: 'interac',
              failure_reason: 'Account verification failed'
            }
          ],
          messages: [
            {
              id: '1',
              question: 'Je veux emprunter 5000$ rapidement',
              date: '2026-01-09T09:00:00Z',
              nom: 'Jean-Marc Tremblay',
              email: 'jm.tremblay@gmail.com',
              status: 'traité'
            },
            {
              id: '2',
              question: 'Pourquoi mon prêt est refusé?',
              date: '2026-01-11T16:00:00Z',
              nom: 'Jean-Marc Tremblay',
              email: 'jm.tremblay@gmail.com',
              status: 'traité'
            }
          ],
          created_at: '2026-01-10T10:00:00Z',
          updated_at: '2026-01-13T14:30:00Z',
          last_activity: '2026-01-13T14:30:00Z',
          notes: 'Tentative de fraude confirmée par plusieurs sources. Documents falsifiés détectés.'
        },
        {
          id: 'FRD-002',
          name: 'Sophie Lapointe',
          email: 'slapointe@outlook.com',
          phone: '514-555-0456',
          address: '890 Rue Ontario, Montréal',
          reason: 'Multi-comptes frauduleux + chargeback',
          fraud_amount: 7500,
          amount_recovered: 0,
          status: 'blacklisted',
          severity: 'critical',
          confidence: 92,
          assigned_to: 'Sandra',
          vopay_transactions: [
            {
              id: '3',
              transaction_id: 'VP-2026-003',
              amount: 3000,
              status: 'successful',
              date: '2026-01-08T11:00:00Z',
              type: 'interac'
            },
            {
              id: '4',
              transaction_id: 'VP-2026-004',
              amount: 4500,
              status: 'chargeback',
              date: '2026-01-09T15:00:00Z',
              type: 'eft',
              failure_reason: 'Customer dispute - unauthorized'
            }
          ],
          messages: [
            {
              id: '3',
              question: 'Prêt urgent besoin',
              date: '2026-01-08T08:00:00Z',
              nom: 'Sophie Lapointe',
              email: 'slapointe@outlook.com',
              status: 'traité'
            }
          ],
          created_at: '2026-01-09T16:00:00Z',
          updated_at: '2026-01-13T11:00:00Z',
          last_activity: '2026-01-13T11:00:00Z',
          notes: 'Cliente a créé 3 comptes différents. Chargeback initié sur transaction principale.'
        },
        {
          id: 'FRD-003',
          name: 'Marie-Claire Gagnon',
          email: 'mc.gagnon@hotmail.com',
          phone: '438-555-0234',
          address: '567 Av. du Parc, Montréal',
          reason: 'Chargeback multiples',
          fraud_amount: 3500,
          amount_recovered: 1200,
          status: 'watchlist',
          severity: 'high',
          confidence: 78,
          assigned_to: 'Michel',
          vopay_transactions: [
            {
              id: '5',
              transaction_id: 'VP-2026-005',
              amount: 1500,
              status: 'chargeback',
              date: '2026-01-07T13:00:00Z',
              type: 'interac'
            },
            {
              id: '6',
              transaction_id: 'VP-2026-006',
              amount: 2000,
              status: 'partial_refund',
              date: '2026-01-08T10:00:00Z',
              type: 'eft'
            }
          ],
          messages: [],
          created_at: '2026-01-11T14:00:00Z',
          updated_at: '2026-01-13T09:15:00Z',
          last_activity: '2026-01-13T09:15:00Z',
          notes: 'Récupération partielle en cours. Négociations actives.'
        }
      ]

      setRecentCases(mockCases)

      // Calculate totals
      const totalFraud = mockCases.reduce((sum, c) => sum + c.fraud_amount, 0)
      const totalRec = mockCases.reduce((sum, c) => sum + c.amount_recovered, 0)
      setTotalFraudAmount(totalFraud)
      setTotalRecovered(totalRec)

      setLoading(false)
    } catch (error) {
      console.error('Erreur fetch blacklist:', error)
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setSearchLoading(true)

    // Simulate search in recent cases
    setTimeout(() => {
      const found = recentCases.find(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
      )

      setSearchResults(found || null)
      setSearchLoading(false)
    }, 500)
  }

  const handleAddCase = async () => {
    // TODO: Implement API call to add case

    // Refresh list
    await fetchRecentCases()

    // Reset form and close modal
    setNewCase({
      name: '',
      email: '',
      phone: '',
      address: '',
      reason: '',
      fraud_amount: 0,
      severity: 'high',
      notes: ''
    })
    setShowAddModal(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'blacklisted': return 'bg-red-100 text-red-800 border-red-200'
      case 'watchlist': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cleared': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header OSINT */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">OSINT - Intelligence Fraude</h1>
            <p className="text-gray-600 mt-1">Centre d'investigation et surveillance clients à risque</p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border-2 border-red-200">
            <div className="flex items-center gap-3">
              <Ban className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase">Total Fraude</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(totalFraudAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase">Non Remboursé</p>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(totalFraudAmount - totalRecovered)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase">Récupéré</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalRecovered)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-3">
              <Archive className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase">Cas Actifs</p>
                <p className="text-2xl font-bold text-blue-900">{recentCases.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche OSINT */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Rechercher un client (nom, email, téléphone)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searchLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                Enquêter
              </>
            )}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-md flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Résultat de recherche détaillé */}
      {searchResults && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border-2 border-red-500 p-8 mb-8 text-white">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{searchResults.name}</h2>
                <span className={`px-3 py-1 text-xs font-bold rounded-md border uppercase ${getStatusColor(searchResults.status)}`}>
                  {searchResults.status}
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-md border uppercase ${getSeverityColor(searchResults.severity)}`}>
                  {searchResults.severity}
                </span>
              </div>
              <p className="text-red-400 font-semibold text-lg">⚠️ {searchResults.reason}</p>
            </div>
            <button
              onClick={() => setSearchResults(null)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Coordonnées */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Coordonnées
              </h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {searchResults.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {searchResults.phone}
                </p>
                {searchResults.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {searchResults.address}
                  </p>
                )}
              </div>
            </div>

            {/* Montants */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Financier
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400">Montant Fraudé</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(searchResults.fraud_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Récupéré</p>
                  <p className="text-lg font-semibold text-green-400">{formatCurrency(searchResults.amount_recovered)}</p>
                </div>
              </div>
            </div>

            {/* Assignation */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Dossier
              </h3>
              <div className="space-y-2 text-sm">
                <p>ID: <span className="font-mono font-bold text-yellow-400">{searchResults.id}</span></p>
                <p>Assigné: <span className="font-semibold text-blue-400">{searchResults.assigned_to}</span></p>
                <p>Confiance: <span className="font-bold text-green-400">{searchResults.confidence}%</span></p>
              </div>
            </div>
          </div>

          {/* Transactions VoPay */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Transactions VoPay ({searchResults.vopay_transactions.length})
            </h3>
            <div className="space-y-2">
              {searchResults.vopay_transactions.map((tx) => (
                <div key={tx.id} className="bg-gray-900 rounded p-3 border border-gray-700 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold">{tx.transaction_id}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                    {tx.failure_reason && (
                      <p className="text-xs text-red-400 mt-1">⚠️ {tx.failure_reason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(tx.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      tx.status === 'successful' ? 'bg-green-900 text-green-300' :
                      tx.status === 'failed' ? 'bg-red-900 text-red-300' :
                      tx.status === 'chargeback' ? 'bg-orange-900 text-orange-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages échangés ({searchResults.messages.length})
            </h3>
            {searchResults.messages.length > 0 ? (
              <div className="space-y-2">
                {searchResults.messages.map((msg) => (
                  <div key={msg.id} className="bg-gray-900 rounded p-3 border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold">{msg.nom}</p>
                      <p className="text-xs text-gray-400">{formatDate(msg.date)}</p>
                    </div>
                    <p className="text-sm text-gray-300">{msg.question}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun message</p>
            )}
          </div>

          {/* Notes */}
          {searchResults.notes && (
            <div className="bg-red-900 bg-opacity-30 rounded-lg p-4 border border-red-700">
              <h3 className="text-sm font-bold text-red-400 uppercase mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Notes d'investigation
              </h3>
              <p className="text-sm text-gray-300">{searchResults.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Liste des 10 derniers cas */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Archive className="w-6 h-6 text-red-600" />
            10 Derniers Cas de Fraude (Non Remboursés)
          </h2>
          <button
            onClick={fetchRecentCases}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {recentCases.map((fraudCase) => (
              <div
                key={fraudCase.id}
                onClick={() => setSearchResults(fraudCase)}
                className="bg-gradient-to-r from-gray-50 to-red-50 rounded-lg p-5 border-2 border-gray-200 hover:border-red-400 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{fraudCase.name}</h3>
                      <span className={`px-2 py-1 text-xs font-bold rounded border uppercase ${getStatusColor(fraudCase.status)}`}>
                        {fraudCase.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold rounded border uppercase ${getSeverityColor(fraudCase.severity)}`}>
                        {fraudCase.severity}
                      </span>
                    </div>
                    <p className="text-sm text-red-600 font-semibold mb-2">⚠️ {fraudCase.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {fraudCase.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {fraudCase.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(fraudCase.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Montant Fraudé</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(fraudCase.fraud_amount)}</p>
                    {fraudCase.amount_recovered > 0 && (
                      <p className="text-sm text-green-600 font-semibold">
                        Récupéré: {formatCurrency(fraudCase.amount_recovered)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Ajouter un Cas de Fraude</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={newCase.name}
                    onChange={(e) => setNewCase({ ...newCase, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newCase.email}
                    onChange={(e) => setNewCase({ ...newCase, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="jean.dupont@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={newCase.phone}
                    onChange={(e) => setNewCase({ ...newCase, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="514-555-0123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sévérité *
                  </label>
                  <select
                    value={newCase.severity}
                    onChange={(e) => setNewCase({ ...newCase, severity: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={newCase.address}
                  onChange={(e) => setNewCase({ ...newCase, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234 Rue Example, Montréal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Raison de la fraude *
                </label>
                <input
                  type="text"
                  value={newCase.reason}
                  onChange={(e) => setNewCase({ ...newCase, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Faux documents, usurpation d'identité..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Montant fraudé ($) *
                </label>
                <input
                  type="number"
                  value={newCase.fraud_amount}
                  onChange={(e) => setNewCase({ ...newCase, fraud_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5000"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes d'investigation
                </label>
                <textarea
                  value={newCase.notes}
                  onChange={(e) => setNewCase({ ...newCase, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Détails supplémentaires, preuves, observations..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleAddCase}
                disabled={!newCase.name || !newCase.email || !newCase.phone || !newCase.reason}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter au Blacklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
