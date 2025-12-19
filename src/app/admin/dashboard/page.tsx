'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, TrendingUp, TrendingDown, Users, FileText,
  AlertTriangle, RefreshCw, Activity, Bell, Mail,
  Phone, ChevronRight, MoreHorizontal, Search, Loader2,
  DollarSign, Calendar, Clock, CheckCircle, XCircle,
  X, User, Send, MessageSquare, Tag, ExternalLink
} from 'lucide-react'

interface Message {
  id: string
  nom: string
  email: string
  telephone: string
  question: string
  date: string
  lu: boolean
  status: string
  reference: string
}

interface EmailLog {
  id: string
  messageId: string
  type: string
  to: string
  subject: string
  content: string
  sentBy: string
  date: string
}

interface NoteLog {
  id: string
  messageId: string
  from: string
  to: string
  content: string
  date: string
}

// Extraire l'option selectionnee du message
function extractOptionFromMessage(question: string): { option: string | null; message: string } {
  const match = question.match(/\[Espace Client - ([^\]]+)\]/)
  if (match) {
    const cleanMessage = question.replace(/\[Formulaire Contact\]\s*/g, '').replace(/\[Espace Client - [^\]]+\]\s*/g, '').trim()
    return { option: match[1], message: cleanMessage || 'Aucun message additionnel' }
  }

  const formMatch = question.match(/\[Formulaire Contact\]/)
  if (formMatch) {
    return { option: 'Formulaire Contact', message: question.replace(/\[Formulaire Contact\]\s*/g, '').trim() }
  }

  return { option: null, message: question }
}

// Couleur selon l'option
function getOptionColor(option: string | null): string {
  if (!option) return 'bg-gray-100 text-gray-600'
  const colors: Record<string, string> = {
    'Reporter un paiement': 'bg-blue-100 text-blue-700',
    'Reduire mes paiements': 'bg-emerald-100 text-emerald-700',
    'Signaler un changement': 'bg-violet-100 text-violet-700',
    'Releve ou solde de compte': 'bg-amber-100 text-amber-700',
    'Arrangement de paiement': 'bg-rose-100 text-rose-700',
    'Autre question': 'bg-gray-100 text-gray-700',
    'Formulaire Contact': 'bg-cyan-100 text-cyan-700'
  }
  return colors[option] || 'bg-gray-100 text-gray-600'
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, nonLus: 0 })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedView, setSelectedView] = useState<'dashboard' | 'messages' | 'vopay' | 'margill'>('dashboard')
  const [vopayLoading, setVopayLoading] = useState(false)
  const [vopayError, setVopayError] = useState<string | null>(null)

  // Detail panel states
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [messageEmails, setMessageEmails] = useState<EmailLog[]>([])
  const [messageNotes, setMessageNotes] = useState<NoteLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [vopayData, setVopayData] = useState({
    balance: 0,
    available: 0,
    frozen: 0,
    pendingInterac: 0,
    todayInterac: 0,
    weeklyVolume: 0,
    successRate: 0,
    recentTransactions: [] as any[]
  })

  const [margillData] = useState({
    newFiles: 8,
    paymentsSent: 23,
    nsf: 2,
    pendingPayments: 15600.00,
    activeLoans: 156,
    monthlyCollected: 234500.00
  })

  const [recentActivity] = useState([
    { type: 'interac', amount: 500, name: 'Jean T.', time: '10:45', status: 'completed' },
    { type: 'payment', amount: 1200, name: 'Marie L.', time: '10:42', status: 'completed' },
    { type: 'interac', amount: 750, name: 'Pierre D.', time: '10:38', status: 'pending' },
    { type: 'nsf', amount: 450, name: 'Sophie R.', time: '10:35', status: 'failed' },
    { type: 'newfile', amount: 2500, name: 'Marc B.', time: '10:30', status: 'new' },
  ])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setStats({ total: data.total || 0, nonLus: data.nonLus || 0 })
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchMessageDetails = async (message: Message) => {
    setSelectedMessage(message)
    setDetailLoading(true)
    setMessageEmails([])
    setMessageNotes([])

    try {
      // Marquer comme lu
      await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: message.id })
      })

      // Charger emails et notes
      const res = await fetch(`/api/admin/messages?messageId=${message.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMessageEmails(data.emails || [])
        setMessageNotes(data.notes || [])
      }

      // Rafraichir la liste
      fetchMessages()
    } catch (error) {
      console.error('Erreur details:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedMessage(null)
    setMessageEmails([])
    setMessageNotes([])
  }

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
    fetchMessages()
    fetchVopayData()
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00874e] rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">$</span>
              </div>
              <div>
                <span className="text-[#003d2c] text-lg font-semibold">Solution Argent Rapide</span>
                <span className="text-gray-400 text-sm ml-2">Administration</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {[
                { id: 'dashboard', label: 'Tableau de bord' },
                { id: 'messages', label: 'Messages', badge: stats.nonLus },
                { id: 'vopay', label: 'VoPay' },
                { id: 'margill', label: 'Margill' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedView(item.id as typeof selectedView)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedView === item.id
                      ? 'bg-[#00874e] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
                      selectedView === item.id
                        ? 'bg-white text-[#00874e]'
                        : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Date/Time */}
              <div className="text-right">
                <p className="text-gray-900 font-medium">{formatTime(currentTime)}</p>
                <p className="text-gray-500 text-xs">{formatDate(currentTime)}</p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                <span className="text-sm">Deconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {selectedView === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-[#003d2c]">Tableau de bord</h1>
              <p className="text-gray-500 mt-1">Vue d'ensemble de votre activite</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {/* Solde VoPay */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 text-sm">Solde VoPay</span>
                  <div className="w-10 h-10 bg-[#e8f5e9] rounded-full flex items-center justify-center">
                    <DollarSign size={20} className="text-[#00874e]" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(vopayData.balance)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp size={14} className="text-[#00874e]" />
                  <span className="text-sm text-[#00874e]">+2.5% depuis hier</span>
                </div>
              </div>

              {/* Prets Actifs */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 text-sm">Prets actifs</span>
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{margillData.activeLoans}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">{margillData.newFiles} nouveaux aujourd'hui</span>
                </div>
              </div>

              {/* Collecte du mois */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 text-sm">Collecte ce mois</span>
                  <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                    <Calendar size={20} className="text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(margillData.monthlyCollected)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp size={14} className="text-[#00874e]" />
                  <span className="text-sm text-[#00874e]">+8.2% vs mois dernier</span>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 text-sm">Messages</span>
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                    <Mail size={20} className="text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <div className="flex items-center gap-2 mt-2">
                  {stats.nonLus > 0 ? (
                    <span className="text-sm text-red-500 font-medium">{stats.nonLus} non lu(s)</span>
                  ) : (
                    <span className="text-sm text-gray-500">Tous lus</span>
                  )}
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-3 gap-6">
              {/* Activity Feed */}
              <div className="col-span-2 bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Activity size={18} className="text-[#00874e]" />
                    Activite recente
                  </h2>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.type === 'interac' ? 'bg-[#e8f5e9]' :
                          item.type === 'payment' ? 'bg-blue-50' :
                          item.type === 'nsf' ? 'bg-red-50' :
                          'bg-purple-50'
                        }`}>
                          {item.type === 'interac' && <DollarSign size={18} className="text-[#00874e]" />}
                          {item.type === 'payment' && <TrendingUp size={18} className="text-blue-600" />}
                          {item.type === 'nsf' && <AlertTriangle size={18} className="text-red-500" />}
                          {item.type === 'newfile' && <FileText size={18} className="text-purple-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.type === 'interac' && 'Interac recu'}
                            {item.type === 'payment' && 'Paiement envoye'}
                            {item.type === 'nsf' && 'NSF detecte'}
                            {item.type === 'newfile' && 'Nouveau dossier'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          item.type === 'nsf' ? 'text-red-500' :
                          item.type === 'interac' ? 'text-[#00874e]' :
                          'text-gray-900'
                        }`}>
                          {item.type === 'payment' ? '-' : '+'}{formatCurrency(item.amount)}
                        </p>
                        <p className="text-sm text-gray-400">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Statistiques rapides</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Taux de succes</span>
                      <span className="font-semibold text-[#00874e]">{vopayData.successRate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00874e] rounded-full"
                        style={{ width: `${vopayData.successRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-gray-500 text-sm">Interac en attente</span>
                      <span className="font-semibold text-blue-600">{vopayData.pendingInterac}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">NSF ce mois</span>
                      <span className="font-semibold text-red-500">{margillData.nsf}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Montant gele</span>
                      <span className="font-semibold text-amber-600">{formatCurrency(vopayData.frozen)}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Messages */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Messages recents</h3>
                    {stats.nonLus > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">
                        {stats.nonLus} nouveau(x)
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {messages.slice(0, 3).map((msg) => (
                      <div key={msg.id} className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#e8f5e9] flex items-center justify-center text-sm font-semibold text-[#00874e]">
                            {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{msg.nom}</p>
                              {!msg.lu && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{msg.question}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedView('messages')}
                    className="w-full px-6 py-3 text-sm font-medium text-[#00874e] hover:bg-gray-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1"
                  >
                    Voir tous les messages
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Messages View */}
        {selectedView === 'messages' && (
          <div className="flex gap-6">
            {/* Liste des messages */}
            <div className={`${selectedMessage ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-[#003d2c]">Messages</h1>
                  <p className="text-gray-500 mt-1">{stats.total} message(s) au total</p>
                </div>
                <button
                  onClick={fetchMessages}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={16} />
                  Actualiser
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="divide-y divide-gray-100">
                  {messages.map((msg) => {
                    const { option, message: cleanMsg } = extractOptionFromMessage(msg.question)
                    return (
                      <div
                        key={msg.id}
                        onClick={() => fetchMessageDetails(msg)}
                        className={`px-6 py-5 hover:bg-gray-50 transition-colors cursor-pointer ${!msg.lu ? 'bg-blue-50/50' : ''} ${selectedMessage?.id === msg.id ? 'ring-2 ring-[#00874e] ring-inset' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#e8f5e9] flex items-center justify-center text-sm font-bold text-[#00874e]">
                            {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{msg.nom}</p>
                              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 font-mono">#{msg.reference}</span>
                              {!msg.lu && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 font-medium">Nouveau</span>
                              )}
                            </div>
                            {/* Option Badge */}
                            {option && (
                              <div className="mb-2">
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getOptionColor(option)}`}>
                                  {option}
                                </span>
                              </div>
                            )}
                            <p className="text-gray-700 mb-3 truncate">{cleanMsg}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Mail size={14} />
                                {msg.email || 'N/A'}
                              </span>
                              {msg.telephone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={14} />
                                  {msg.telephone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {new Date(msg.date).toLocaleString('fr-CA')}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Panneau de details */}
            {selectedMessage && (
              <div className="w-1/2 bg-white rounded-lg border border-gray-200 sticky top-24 h-fit max-h-[calc(100vh-120px)] overflow-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#00874e]" />
                    Details du message
                  </h2>
                  <button
                    onClick={closeDetail}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>

                {detailLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#00874e]" />
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Info Client */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={14} />
                        Information Client
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-[#00874e] flex items-center justify-center text-lg font-bold text-white">
                            {selectedMessage.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{selectedMessage.nom}</p>
                            <p className="text-sm text-gray-500 font-mono">#{selectedMessage.reference}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 mt-4">
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Mail size={18} className="text-[#00874e]" />
                            <div>
                              <p className="text-xs text-gray-500">Courriel</p>
                              <a href={`mailto:${selectedMessage.email}`} className="text-gray-900 font-medium hover:text-[#00874e]">
                                {selectedMessage.email || 'Non fourni'}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Phone size={18} className="text-[#00874e]" />
                            <div>
                              <p className="text-xs text-gray-500">Telephone</p>
                              <a href={`tel:${selectedMessage.telephone}`} className="text-gray-900 font-medium hover:text-[#00874e]">
                                {selectedMessage.telephone || 'Non fourni'}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Clock size={18} className="text-[#00874e]" />
                            <div>
                              <p className="text-xs text-gray-500">Date de reception</p>
                              <p className="text-gray-900 font-medium">{new Date(selectedMessage.date).toLocaleString('fr-CA')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Option Selectionnee */}
                    {(() => {
                      const { option } = extractOptionFromMessage(selectedMessage.question)
                      return option ? (
                        <div className="bg-gray-50 rounded-xl p-5">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Tag size={14} />
                            Option Selectionnee
                          </h3>
                          <span className={`inline-block text-sm px-4 py-2 rounded-full font-semibold ${getOptionColor(option)}`}>
                            {option}
                          </span>
                        </div>
                      ) : null
                    })()}

                    {/* Message */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare size={14} />
                        Message du Client
                      </h3>
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {extractOptionFromMessage(selectedMessage.question).message}
                      </p>
                    </div>

                    {/* Emails Envoyes */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Send size={14} />
                        Emails Envoyes ({messageEmails.length})
                      </h3>
                      {messageEmails.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">Aucun email enregistre</p>
                      ) : (
                        <div className="space-y-3">
                          {messageEmails.map((email) => (
                            <div key={email.id} className="bg-white rounded-lg p-4 border border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  email.type === 'system' ? 'bg-purple-100 text-purple-700' :
                                  email.type === 'manual' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {email.type === 'system' ? 'Auto' : 'Manuel'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(email.date).toLocaleString('fr-CA')}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                A: {email.to}
                              </p>
                              <p className="text-sm text-gray-700 font-medium mb-2">
                                {email.subject}
                              </p>
                              <details className="text-sm">
                                <summary className="text-[#00874e] cursor-pointer hover:underline">
                                  Voir le contenu
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-40">
                                  {email.content}
                                </pre>
                              </details>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <a
                        href={`mailto:${selectedMessage.email}`}
                        className="flex-1 py-3 bg-[#00874e] text-white rounded-lg text-sm font-semibold hover:bg-[#006d3f] transition-colors flex items-center justify-center gap-2"
                      >
                        <Mail size={16} />
                        Repondre par email
                      </a>
                      {selectedMessage.telephone && (
                        <a
                          href={`tel:${selectedMessage.telephone}`}
                          className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Phone size={16} />
                          Appeler
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VoPay View */}
        {selectedView === 'vopay' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-[#003d2c]">VoPay</h1>
                <p className="text-gray-500 mt-1">Gestion des paiements Interac</p>
              </div>
              <button
                onClick={fetchVopayData}
                disabled={vopayLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#00874e] text-white rounded-lg text-sm font-medium hover:bg-[#006d3f] transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={vopayLoading ? 'animate-spin' : ''} />
                {vopayLoading ? 'Chargement...' : 'Rafraichir'}
              </button>
            </div>

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

            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Solde total</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.balance)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Disponible</span>
                <p className="text-2xl font-bold text-[#00874e] mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.available)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Gele</span>
                <p className="text-2xl font-bold text-amber-600 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.frozen)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">En attente</span>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {vopayLoading ? '...' : vopayData.pendingInterac}
                </p>
              </div>
            </div>

            {/* Stats supplémentaires */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Volume aujourd'hui</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.todayInterac)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Volume 7 jours</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {vopayLoading ? '...' : formatCurrency(vopayData.weeklyVolume)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Taux de succès</span>
                <p className="text-2xl font-bold text-[#00874e] mt-2">
                  {vopayLoading ? '...' : `${vopayData.successRate}%`}
                </p>
              </div>
            </div>

            {/* Transactions récentes */}
            {!vopayLoading && vopayData.recentTransactions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Transactions récentes</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {vopayData.recentTransactions.map((tx, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.status === 'completed' ? 'bg-[#e8f5e9]' :
                          tx.status === 'pending' ? 'bg-blue-50' :
                          'bg-red-50'
                        }`}>
                          {tx.status === 'completed' && <CheckCircle size={18} className="text-[#00874e]" />}
                          {tx.status === 'pending' && <Clock size={18} className="text-blue-600" />}
                          {(tx.status === 'failed' || tx.status === 'error') && <XCircle size={18} className="text-red-500" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tx.reference || tx.transaction_id}</p>
                          <p className="text-sm text-gray-500">{tx.description || tx.transaction_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(tx.amount)}</p>
                        <p className="text-sm text-gray-400">{new Date(tx.created_at).toLocaleString('fr-CA')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!vopayLoading && !vopayError && vopayData.balance === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="font-semibold text-blue-900 mb-2">Données VoPay chargées</h2>
                <p className="text-blue-700">Les statistiques VoPay sont maintenant connectées en temps réel.</p>
              </div>
            )}
          </div>
        )}

        {/* Margill View */}
        {selectedView === 'margill' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-[#003d2c]">Margill</h1>
                <p className="text-gray-500 mt-1">Gestion des prets et collections</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#00874e] text-white rounded-lg text-sm font-medium hover:bg-[#006d3f] transition-colors">
                <RefreshCw size={16} />
                Rafraichir
              </button>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Prets actifs</span>
                <p className="text-2xl font-bold text-gray-900 mt-2">{margillData.activeLoans}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Nouveaux dossiers</span>
                <p className="text-2xl font-bold text-[#00874e] mt-2">{margillData.newFiles}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">Collecte ce mois</span>
                <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(margillData.monthlyCollected)}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <span className="text-gray-500 text-sm">NSF</span>
                <p className="text-2xl font-bold text-red-500 mt-2">{margillData.nsf}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Connexion API requise</h2>
              <p className="text-gray-500">Les donnees affichees sont des donnees de demonstration. Connectez l'API Margill pour voir les vraies donnees.</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Solution Argent Rapide. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  )
}
