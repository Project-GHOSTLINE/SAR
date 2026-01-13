'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCw, Mail, Phone, ChevronRight, Loader2,
  Clock, CheckCircle, X, User, Send, MessageSquare, Tag, ExternalLink,
  Monitor, Smartphone, Chrome, MapPin, Languages,
  Maximize2, Link2, Target, Activity, AlertTriangle, Globe
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
  assigned_to?: string
  assigned_at?: string
  assigned_by?: string
  system_responded?: boolean
  client_ip?: string
  client_user_agent?: string
  client_device?: string
  client_browser?: string
  client_os?: string
  client_timezone?: string
  client_language?: string
  client_screen_resolution?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
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

// Extraire l'option selectionnee et la source du message
function extractOptionFromMessage(question: string): { source: string | null; option: string | null; message: string } {
  // Format: [Source] [Option] Message
  // Ex: [Espace Client - Reporter un paiement] message
  // Ex: [Analyse Demande] [Ou en est ma demande de credit?] message
  // Ex: [Formulaire Contact] [Espace Client - Releve ou solde de compte] message

  let source: string | null = null
  let option: string | null = null
  let cleanMessage = question

  // Detecter source Analyse Demande ou Formulaire Accueil
  const analyseMatch = question.match(/\[(Analyse Demande|Formulaire Accueil)\]/)
  if (analyseMatch) {
    source = analyseMatch[1]
    cleanMessage = cleanMessage.replace(/\[(Analyse Demande|Formulaire Accueil)\]\s*/g, '')
  }

  // Detecter option Analyse (entre crochets apres la source)
  const analyseOptionMatch = cleanMessage.match(/\[([^\]]+)\]/)
  if (analyseOptionMatch && source) {
    option = analyseOptionMatch[1]
    cleanMessage = cleanMessage.replace(/\[[^\]]+\]\s*/g, '').trim()
  }

  // Detecter format Espace Client
  const espaceClientMatch = question.match(/\[Espace Client - ([^\]]+)\]/)
  if (espaceClientMatch) {
    source = 'Espace Client'
    option = espaceClientMatch[1]
    cleanMessage = question.replace(/\[Formulaire Contact\]\s*/g, '').replace(/\[Espace Client - [^\]]+\]\s*/g, '').trim()
  }

  // Detecter Formulaire Contact simple
  if (!source && question.includes('[Formulaire Contact]')) {
    source = 'Formulaire Contact'
    cleanMessage = question.replace(/\[Formulaire Contact\]\s*/g, '').trim()
  }

  return {
    source,
    option,
    message: cleanMessage || 'Aucun message additionnel'
  }
}

// Couleur selon la source
function getSourceColor(source: string | null): string {
  if (!source) return 'bg-gray-100 text-gray-600'
  const colors: Record<string, string> = {
    'Espace Client': 'bg-purple-100 text-purple-700',
    'Analyse Demande': 'bg-blue-100 text-blue-700',
    'Formulaire Accueil': 'bg-indigo-100 text-indigo-700',
    'Formulaire Contact': 'bg-cyan-100 text-cyan-700'
  }
  return colors[source] || 'bg-gray-100 text-gray-600'
}

// Formatter la date du dernier message
function formatLastMessageDate(dateString: string | null): string {
  if (!dateString) return 'Aucun message'

  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays === 1) return 'Hier'

  // Format: "7 jan, 19h27"
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  return date.toLocaleDateString('fr-CA', options).replace(',', ' à')
}

// Couleur selon l'option (badge)
function getOptionColor(option: string | null): string {
  if (!option) return 'bg-gray-100 text-gray-600'
  const colors: Record<string, string> = {
    // Espace Client options
    'Reporter un paiement': 'bg-blue-100 text-blue-700',
    'Reduire mes paiements': 'bg-emerald-100 text-emerald-700',
    'Signaler un changement': 'bg-violet-100 text-violet-700',
    'Releve ou solde de compte': 'bg-amber-100 text-amber-700',
    'Arrangement de paiement': 'bg-rose-100 text-rose-700',
    // Analyse Demande options
    'Ou en est ma demande de credit?': 'bg-sky-100 text-sky-700',
    'Je veux annuler ma demande': 'bg-red-100 text-red-700',
    'Question sur mon remboursement': 'bg-orange-100 text-orange-700',
    'Autre question': 'bg-gray-100 text-gray-700'
  }
  return colors[option] || 'bg-gray-100 text-gray-600'
}

// Couleur selon l'option (bouton filtre)
function getOptionButtonColor(option: string, isSelected: boolean): string {
  const colors: Record<string, { selected: string, normal: string }> = {
    'Reporter un paiement': {
      selected: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md',
      normal: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    'Reduire mes paiements': {
      selected: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md',
      normal: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
    },
    'Signaler un changement': {
      selected: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md',
      normal: 'bg-violet-100 text-violet-700 hover:bg-violet-200'
    },
    'Releve ou solde de compte': {
      selected: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md',
      normal: 'bg-amber-100 text-amber-700 hover:bg-amber-200'
    },
    'Arrangement de paiement': {
      selected: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md',
      normal: 'bg-rose-100 text-rose-700 hover:bg-rose-200'
    },
    'Ou en est ma demande de credit?': {
      selected: 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md',
      normal: 'bg-sky-100 text-sky-700 hover:bg-sky-200'
    },
    'Je veux annuler ma demande': {
      selected: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md',
      normal: 'bg-red-100 text-red-700 hover:bg-red-200'
    },
    'Question sur mon remboursement': {
      selected: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md',
      normal: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
    },
    'Autre question': {
      selected: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md',
      normal: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  }

  const colorSet = colors[option] || {
    selected: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md',
    normal: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  return isSelected ? colorSet.selected : colorSet.normal
}

export default function MessagesView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState({ total: 0, nonLus: 0 })
  const [messageStats, setMessageStats] = useState({
    totalDuMois: 0,
    reponsesEnvoyees: 0,
    reponsesNonEnvoyees: 0,
    acheminesSandra: 0,
    acheminesMichel: 0,
    nonAchemines: 0,
    lastAll: null as string | null,
    lastReponse: null as string | null,
    lastSandra: null as string | null,
    lastMichel: null as string | null,
    lastNone: null as string | null,
    byColleague: {} as Record<string, number>
  })

  // Detail panel states
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [messageEmails, setMessageEmails] = useState<EmailLog[]>([])
  const [messageNotes, setMessageNotes] = useState<NoteLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null)

  // Filtre pour messages stats
  type MessageFilterType = 'all' | 'reponses' | 'sandra' | 'michel' | 'none' | 'no_response'
  const [messageFilter, setMessageFilter] = useState<MessageFilterType>('all')
  const [messageSubFilter, setMessageSubFilter] = useState<string | null>(null)

  // Helper pour changer le filtre et réinitialiser le sous-filtre
  const changeMessageFilter = (newFilter: MessageFilterType) => {
    setMessageFilter(newFilter)
    setMessageSubFilter(null) // Reset sub-filter when main filter changes
  }

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

  const fetchMessageStats = async () => {
    try {
      const res = await fetch('/api/admin/messages/assign', { credentials: 'include' })

      if (res.ok) {
        const data = await res.json()

        if (data.success && data.stats) {
          setMessageStats(data.stats)
        }
      }
    } catch (error) {
      console.error('Erreur stats:', error)
    }
  }

  const assignMessage = async (messageId: string, assignTo: string) => {
    try {
      const res = await fetch('/api/admin/messages/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId, assignTo })
      })

      if (res.ok) {
        // Rafraîchir les données
        await Promise.all([fetchMessages(), fetchMessageStats()])

        // Mettre à jour le message sélectionné si c'est le même
        if (selectedMessage && selectedMessage.id === messageId) {
          const updatedMessage = messages.find(m => m.id === messageId)
          if (updatedMessage) {
            setSelectedMessage({
              ...updatedMessage,
              assigned_to: assignTo === 'Unassigned' ? undefined : assignTo,
              assigned_at: new Date().toISOString()
            })
          }
        }
      }
    } catch (error) {
      console.error('Erreur assignation:', error)
    }
  }

  useEffect(() => {
    fetchMessages()
    fetchMessageStats()
    const interval = setInterval(() => {
      fetchMessages()
      fetchMessageStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex gap-4">
      {/* Liste des messages */}
      <div className={`${selectedMessage ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#003d2c] flex items-center gap-4">
              <div className="w-1 h-8 bg-gradient-to-b from-[#10B981] to-emerald-600 rounded-full"></div>
              Messages
            </h1>
            <p className="text-gray-600 mt-2 ml-7 font-medium">{stats.total} message(s) au total</p>
          </div>
          <button
            onClick={() => { fetchMessages(); fetchMessageStats(); }}
            className="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm hover:shadow hover:scale-105"
          >
            <RefreshCw size={20} />
            Actualiser
          </button>
        </div>

        {/* Statistiques Messages - Ligne fluide avec 5 cartes */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {/* Tous */}
          <button
            onClick={() => changeMessageFilter('all')}
            className={`min-w-[180px] rounded-2xl p-7 transition-all hover:shadow-xl hover:scale-105 ${
              messageFilter === 'all'
                ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg'
                : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                messageFilter === 'all' ? 'bg-white/30' : 'bg-blue-300'
              }`}>
                <MessageSquare size={24} className={messageFilter === 'all' ? 'text-white' : 'text-blue-700'} />
              </div>
              <p className={`text-4xl font-bold ${messageFilter === 'all' ? 'text-white' : 'text-blue-900'}`}>
                {messageStats.totalDuMois}
              </p>
            </div>
            <p className={`text-base font-semibold ${messageFilter === 'all' ? 'text-white' : 'text-blue-700'}`}>
              Tous
            </p>
            <p className={`text-sm mt-1 ${messageFilter === 'all' ? 'text-blue-100' : 'text-blue-600'}`}>
              {formatLastMessageDate(messageStats.lastAll)}
            </p>
          </button>

          {/* Réponses Envoyées */}
          <button
            onClick={() => changeMessageFilter(messageFilter === 'reponses' ? 'all' : 'reponses')}
            className={`min-w-[200px] rounded-2xl p-7 transition-all hover:shadow-xl hover:scale-105 ${
              messageFilter === 'reponses'
                ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg'
                : 'bg-gradient-to-br from-green-50 via-green-100 to-green-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                messageFilter === 'reponses' ? 'bg-white/30' : 'bg-green-300'
              }`}>
                <CheckCircle size={24} className={messageFilter === 'reponses' ? 'text-white' : 'text-green-700'} />
              </div>
              <p className={`text-4xl font-bold ${messageFilter === 'reponses' ? 'text-white' : 'text-green-900'}`}>
                {messageStats.reponsesEnvoyees}
              </p>
            </div>
            <p className={`text-base font-semibold ${messageFilter === 'reponses' ? 'text-white' : 'text-green-700'}`}>
              Réponses envoyées
            </p>
            <p className={`text-sm mt-1 ${messageFilter === 'reponses' ? 'text-green-100' : 'text-green-600'}`}>
              {formatLastMessageDate(messageStats.lastReponse)}
            </p>
          </button>

          {/* Sandra */}
          <button
            onClick={() => changeMessageFilter(messageFilter === 'sandra' ? 'all' : 'sandra')}
            className={`min-w-[180px] rounded-2xl p-7 transition-all hover:shadow-xl hover:scale-105 ${
              messageFilter === 'sandra'
                ? 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 shadow-lg'
                : 'bg-gradient-to-br from-pink-50 via-pink-100 to-pink-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                messageFilter === 'sandra' ? 'bg-white/30' : 'bg-pink-300'
              }`}>
                <User size={24} className={messageFilter === 'sandra' ? 'text-white' : 'text-pink-700'} />
              </div>
              <p className={`text-4xl font-bold ${messageFilter === 'sandra' ? 'text-white' : 'text-pink-900'}`}>
                {messageStats.acheminesSandra}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-base font-semibold ${messageFilter === 'sandra' ? 'text-white' : 'text-pink-700'}`}>
                Sandra
              </p>
              {messageStats.acheminesSandra === 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  messageFilter === 'sandra' ? 'bg-white/30 text-white' : 'bg-pink-300 text-pink-800'
                }`}>
                  À configurer!
                </span>
              )}
            </div>
            <p className={`text-sm mt-1 ${messageFilter === 'sandra' ? 'text-pink-100' : 'text-pink-600'}`}>
              {formatLastMessageDate(messageStats.lastSandra)}
            </p>
          </button>

          {/* Michel */}
          <button
            onClick={() => changeMessageFilter(messageFilter === 'michel' ? 'all' : 'michel')}
            className={`min-w-[180px] rounded-2xl p-7 transition-all hover:shadow-xl hover:scale-105 ${
              messageFilter === 'michel'
                ? 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600 shadow-lg'
                : 'bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                messageFilter === 'michel' ? 'bg-white/30' : 'bg-indigo-300'
              }`}>
                <User size={24} className={messageFilter === 'michel' ? 'text-white' : 'text-indigo-700'} />
              </div>
              <p className={`text-4xl font-bold ${messageFilter === 'michel' ? 'text-white' : 'text-indigo-900'}`}>
                {messageStats.acheminesMichel}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-base font-semibold ${messageFilter === 'michel' ? 'text-white' : 'text-indigo-700'}`}>
                Michel
              </p>
              {messageStats.acheminesMichel === 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  messageFilter === 'michel' ? 'bg-white/30 text-white' : 'bg-indigo-300 text-indigo-800'
                }`}>
                  À configurer!
                </span>
              )}
            </div>
            <p className={`text-sm mt-1 ${messageFilter === 'michel' ? 'text-indigo-100' : 'text-indigo-600'}`}>
              {formatLastMessageDate(messageStats.lastMichel)}
            </p>
          </button>

          {/* Non Acheminés */}
          <button
            onClick={() => changeMessageFilter(messageFilter === 'none' ? 'all' : 'none')}
            className={`min-w-[200px] rounded-2xl p-7 transition-all hover:shadow-xl hover:scale-105 ${
              messageFilter === 'none'
                ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-lg'
                : 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                messageFilter === 'none' ? 'bg-white/30' : 'bg-amber-300'
              }`}>
                <AlertTriangle size={24} className={messageFilter === 'none' ? 'text-white' : 'text-amber-700'} />
              </div>
              <p className={`text-4xl font-bold ${messageFilter === 'none' ? 'text-white' : 'text-amber-900'}`}>
                {messageStats.nonAchemines}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-base font-semibold ${messageFilter === 'none' ? 'text-white' : 'text-amber-700'}`}>
                Non acheminés
              </p>
              {messageStats.nonAchemines === 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  messageFilter === 'none' ? 'bg-white/30 text-white' : 'bg-green-300 text-green-800'
                }`}>
                  Tout assigné!
                </span>
              )}
            </div>
            <p className={`text-sm mt-1 ${messageFilter === 'none' ? 'text-amber-100' : 'text-amber-600'}`}>
              {formatLastMessageDate(messageStats.lastNone)}
            </p>
          </button>
        </div>

        {/* Filtres par Type de Demande */}
        {(() => {
          const uniqueOptions = Array.from(
            new Set(
              messages
                .map(msg => extractOptionFromMessage(msg.question).option)
                .filter(opt => opt !== null)
            )
          ).sort()

          if (uniqueOptions.length === 0) return null

          // Compter les messages "Autres demandes" (ceux sans option)
          const autresCount = messages.filter(msg => !extractOptionFromMessage(msg.question).option).length

          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <p className="text-base font-semibold text-gray-700 mb-3">Filtrer par type de demande:</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setMessageSubFilter(null)}
                  className={`px-5 py-3 rounded-xl text-base font-medium transition-all ${
                    messageSubFilter === null
                      ? 'bg-gradient-to-r from-[#10B981] to-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous les types
                </button>
                {uniqueOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setMessageSubFilter(option)}
                    className={`px-5 py-3 rounded-xl text-base font-medium transition-all ${getOptionButtonColor(option, messageSubFilter === option)}`}
                  >
                    {option}
                  </button>
                ))}
                {autresCount > 0 && (
                  <button
                    onClick={() => setMessageSubFilter('__autres__')}
                    className={`px-5 py-3 rounded-xl text-base font-medium transition-all ${
                      messageSubFilter === '__autres__'
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    Autres demandes ({autresCount})
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {messages
              .filter((msg) => {
                // Filtrer selon le filtre actif
                if (messageFilter === 'all') return true
                if (messageFilter === 'reponses') return msg.system_responded === true
                if (messageFilter === 'sandra') return msg.assigned_to === 'Sandra'
                if (messageFilter === 'michel') return msg.assigned_to === 'Michel'
                if (messageFilter === 'none') return !msg.assigned_to || msg.assigned_to === null
                if (messageFilter === 'no_response') return !msg.system_responded
                return true
              })
              .filter((msg) => {
                // Sous-filtre par option/sujet
                if (!messageSubFilter) return true
                const { option } = extractOptionFromMessage(msg.question)
                // Cas spécial: "Autres demandes" = messages sans option
                if (messageSubFilter === '__autres__') return !option
                return option === messageSubFilter
              })
              .map((msg) => {
              const { option, message: cleanMsg } = extractOptionFromMessage(msg.question)

              // Définir les couleurs selon le filtre actif
              const filterColors = {
                hover: messageFilter === 'reponses' ? 'hover:from-green-50' :
                       messageFilter === 'sandra' ? 'hover:from-pink-50' :
                       messageFilter === 'michel' ? 'hover:from-indigo-50' :
                       messageFilter === 'none' ? 'hover:from-amber-50' :
                       messageFilter === 'no_response' ? 'hover:from-red-50' :
                       'hover:from-gray-50',
                selected: messageFilter === 'reponses' ? 'ring-green-500 bg-green-50/30' :
                          messageFilter === 'sandra' ? 'ring-pink-500 bg-pink-50/30' :
                          messageFilter === 'michel' ? 'ring-indigo-500 bg-indigo-50/30' :
                          messageFilter === 'none' ? 'ring-amber-500 bg-amber-50/30' :
                          messageFilter === 'no_response' ? 'ring-red-500 bg-red-50/30' :
                          'ring-[#10B981] bg-emerald-50/30',
                avatarBg: messageFilter === 'reponses' ? 'from-green-100 to-green-200' :
                          messageFilter === 'sandra' ? 'from-pink-100 to-pink-200' :
                          messageFilter === 'michel' ? 'from-indigo-100 to-indigo-200' :
                          messageFilter === 'none' ? 'from-amber-100 to-amber-200' :
                          messageFilter === 'no_response' ? 'from-red-100 to-red-200' :
                          'from-[#e8f5e9] to-emerald-100',
                avatarText: messageFilter === 'reponses' ? 'text-green-700' :
                            messageFilter === 'sandra' ? 'text-pink-700' :
                            messageFilter === 'michel' ? 'text-indigo-700' :
                            messageFilter === 'none' ? 'text-amber-700' :
                            messageFilter === 'no_response' ? 'text-red-700' :
                            'text-[#10B981]'
              }

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    // Toggle: si déjà sélectionné, fermer, sinon ouvrir
                    if (selectedMessage?.id === msg.id) {
                      closeDetail()
                    } else {
                      fetchMessageDetails(msg)
                    }
                  }}
                  className={`px-6 py-5 hover:bg-gradient-to-r ${filterColors.hover} hover:to-transparent transition-all cursor-pointer group ${!msg.lu ? 'bg-gradient-to-r from-blue-50/30 to-transparent' : ''} ${selectedMessage?.id === msg.id ? `ring-2 ${filterColors.selected} ring-inset` : ''}`}
                >
                  <div className="flex items-start gap-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${filterColors.avatarBg} flex items-center justify-center text-base font-bold ${filterColors.avatarText} group-hover:scale-110 transition-transform shadow-sm`}>
                      {msg.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{msg.nom}</p>
                        <span className="text-sm px-2 py-1 rounded-xl bg-gray-100 text-gray-500 font-mono font-semibold">#{msg.reference}</span>
                        {!msg.lu && (
                          <span className="text-sm px-2 py-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-sm">Nouveau</span>
                        )}
                        {msg.system_responded ? (
                          <span className="text-sm px-2 py-1 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 font-semibold flex items-center gap-1">
                            <CheckCircle size={16} />
                            Répondu
                          </span>
                        ) : (
                          <span className="text-sm px-2 py-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 font-semibold flex items-center gap-1">
                            <Clock size={16} />
                            En attente
                          </span>
                        )}
                        {msg.assigned_to && (
                          <span className={`text-sm px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${
                            msg.assigned_to === 'Sandra'
                              ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700'
                              : 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700'
                          }`}>
                            <User size={16} />
                            {msg.assigned_to}
                          </span>
                        )}
                        {selectedMessage?.id === msg.id && (
                          <span className="text-sm px-2 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-md animate-pulse flex items-center gap-1">
                            <ChevronRight size={16} />
                            Ouvert
                          </span>
                        )}
                      </div>
                      {/* Option Badge */}
                      {option && (
                        <div className="mb-2">
                          <span className={`text-sm px-3 py-1 rounded-full font-medium ${getOptionColor(option)}`}>
                            {option}
                          </span>
                        </div>
                      )}
                      <p className="text-gray-700 mb-3 truncate">{cleanMsg}</p>
                      <div className="flex items-center gap-6 text-base text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail size={18} />
                          {msg.email || 'N/A'}
                        </span>
                        {msg.telephone && (
                          <span className="flex items-center gap-1">
                            <Phone size={18} />
                            {msg.telephone}
                          </span>
                        )}
                        <span className="flex items-center gap-1" suppressHydrationWarning>
                          <Clock size={18} />
                          {new Date(msg.date).toLocaleString('fr-CA')}
                        </span>
                      </div>
                      {/* Métriques Techniques - Aperçu Rapide */}
                      {(msg.client_device || msg.client_browser || msg.client_ip) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {/* Description en langage simple */}
                          <div className="mb-2 flex items-start gap-3">
                            <Activity size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Ce message provient
                              {msg.client_device && (
                                <span className="font-semibold text-blue-700"> d'un {msg.client_device === 'Mobile' ? 'téléphone mobile' : 'ordinateur'}</span>
                              )}
                              {msg.client_os && (
                                <span className="font-semibold text-purple-700"> utilisant {msg.client_os}</span>
                              )}
                              {msg.client_browser && (
                                <span className="font-semibold text-indigo-700"> et le navigateur {msg.client_browser}</span>
                              )}
                              {msg.client_ip && (
                                <span className="font-semibold text-emerald-700"> depuis l'adresse IP {msg.client_ip}</span>
                              )}
                              {msg.client_language && (
                                <span className="font-semibold text-teal-700"> avec la langue {msg.client_language.toUpperCase()}</span>
                              )}
                              {(msg.utm_source || msg.utm_medium || msg.utm_campaign) && (
                                <span className="font-semibold text-pink-700"> via une campagne marketing</span>
                              )}
                              .
                            </p>
                          </div>
                          {/* Badges */}
                          <div className="flex items-center gap-4 flex-wrap">
                          {msg.client_device && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                              {msg.client_device === 'Mobile' ? (
                                <Smartphone size={13} className="text-blue-600" />
                              ) : (
                                <Monitor size={13} className="text-blue-600" />
                              )}
                              <span className="text-sm font-semibold text-blue-700">{msg.client_device}</span>
                            </div>
                          )}
                          {msg.client_browser && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                              <Chrome size={13} className="text-indigo-600" />
                              <span className="text-sm font-semibold text-indigo-700">{msg.client_browser}</span>
                            </div>
                          )}
                          {msg.client_os && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                              <Monitor size={13} className="text-purple-600" />
                              <span className="text-sm font-semibold text-purple-700">{msg.client_os}</span>
                            </div>
                          )}
                          {msg.client_ip && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                              <MapPin size={13} className="text-emerald-600" />
                              <span className="text-sm font-mono font-semibold text-emerald-700">{msg.client_ip}</span>
                            </div>
                          )}
                          {msg.client_language && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
                              <Languages size={13} className="text-teal-600" />
                              <span className="text-sm font-mono font-semibold text-teal-700 uppercase">{msg.client_language}</span>
                            </div>
                          )}
                          {(msg.utm_source || msg.utm_medium || msg.utm_campaign) && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200">
                              <Target size={13} className="text-pink-600" />
                              <span className="text-sm font-bold text-pink-700">UTM</span>
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={24} className="text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Panneau de details */}
      {selectedMessage && (
        <div
          onClick={closeDetail}
          className="w-1/2 bg-white rounded-xl shadow-lg border border-gray-100 sticky top-24 h-fit max-h-[calc(100vh-120px)] overflow-auto cursor-pointer"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 rounded-t-xl">
            <h2 className="font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare size={22} className="text-[#10B981]" />
              Details du message
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeDetail()
              }}
              className="flex items-center gap-3 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-all hover:scale-105 border border-red-200 hover:border-red-300"
            >
              <X size={24} />
              <span className="text-base font-medium">Fermer</span>
            </button>
          </div>

          {detailLoading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#10B981]" />
            </div>
          ) : (
            <div className="p-8 space-y-6">
              {/* Info Client */}
              <div className="bg-gray-50 rounded-xl p-7">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-3">
                  <User size={18} />
                  Information Client
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#10B981] flex items-center justify-center text-xl font-bold text-white">
                      {selectedMessage.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xl">{selectedMessage.nom}</p>
                      <p className="text-base text-gray-500 font-mono">#{selectedMessage.reference}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div className="flex items-center gap-4 p-3 bg-white rounded-xl">
                      <Mail size={22} className="text-[#10B981]" />
                      <div>
                        <p className="text-sm text-gray-500">Courriel</p>
                        <a
                          href={`mailto:${selectedMessage.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-900 font-medium hover:text-[#10B981]"
                        >
                          {selectedMessage.email || 'Non fourni'}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-white rounded-xl">
                      <Phone size={22} className="text-[#10B981]" />
                      <div>
                        <p className="text-sm text-gray-500">Telephone</p>
                        <a
                          href={`tel:${selectedMessage.telephone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-900 font-medium hover:text-[#10B981]"
                        >
                          {selectedMessage.telephone || 'Non fourni'}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-white rounded-xl">
                      <Clock size={22} className="text-[#10B981]" />
                      <div>
                        <p className="text-sm text-gray-500">Date de reception</p>
                        <p className="text-gray-900 font-medium">{new Date(selectedMessage.date).toLocaleString('fr-CA')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignation et Réponse Système */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-7 border border-blue-100">
                <h3 className="text-base font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-3">
                  <User size={18} />
                  Gestion du Message
                </h3>

                {/* Statut Réponse Système */}
                <div className="mb-6 p-3 bg-white rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-gray-600 font-medium">Réponse Système</span>
                    {selectedMessage.system_responded ? (
                      <span className="text-base px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 font-semibold flex items-center gap-1">
                        <CheckCircle size={18} />
                        Envoyée
                      </span>
                    ) : (
                      <span className="text-base px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 font-semibold flex items-center gap-1">
                        <Clock size={18} />
                        En attente
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignation Actuelle */}
                {selectedMessage.assigned_to && (
                  <div className="mb-6 p-3 bg-white rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-base text-gray-600 font-medium">Assigné à</span>
                      <span className={`text-base px-3 py-1 rounded-full font-semibold flex items-center gap-1 ${
                        selectedMessage.assigned_to === 'Sandra'
                          ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700'
                          : 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700'
                      }`}>
                        <User size={18} />
                        {selectedMessage.assigned_to}
                      </span>
                    </div>
                    {selectedMessage.assigned_at && (
                      <p className="text-sm text-gray-500 mt-2">
                        Assigné le {new Date(selectedMessage.assigned_at).toLocaleString('fr-CA')}
                      </p>
                    )}
                  </div>
                )}

                {/* Boutons d'Assignation */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium mb-3">Assigner à un collègue:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        assignMessage(selectedMessage.id, 'Sandra')
                      }}
                      disabled={selectedMessage.assigned_to === 'Sandra'}
                      className={`px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                        selectedMessage.assigned_to === 'Sandra'
                          ? 'bg-pink-200 text-pink-800 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold">
                          S
                        </div>
                        Sandra
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        assignMessage(selectedMessage.id, 'Michel')
                      }}
                      disabled={selectedMessage.assigned_to === 'Michel'}
                      className={`px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                        selectedMessage.assigned_to === 'Michel'
                          ? 'bg-indigo-200 text-indigo-800 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold">
                          M
                        </div>
                        Michel
                      </div>
                    </button>
                  </div>
                  {selectedMessage.assigned_to && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        assignMessage(selectedMessage.id, 'Unassigned')
                      }}
                      className="w-full px-5 py-3 rounded-xl text-base font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 transition-all"
                    >
                      Retirer l'assignation
                    </button>
                  )}
                </div>
              </div>

              {/* Option Selectionnee */}
              {(() => {
                const { option } = extractOptionFromMessage(selectedMessage.question)
                return option ? (
                  <div className="bg-gray-50 rounded-xl p-7">
                    <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-3">
                      <Tag size={18} />
                      Option Selectionnee
                    </h3>
                    <span className={`inline-block text-base px-5 py-3 rounded-full font-semibold ${getOptionColor(option)}`}>
                      {option}
                    </span>
                  </div>
                ) : null
              })()}

              {/* Message */}
              <div className="bg-gray-50 rounded-xl p-7">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-3">
                  <MessageSquare size={18} />
                  Message du Client
                </h3>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {extractOptionFromMessage(selectedMessage.question).message}
                </p>
              </div>

              {/* Métriques Techniques & Analytiques - Version Enrichie */}
              {(selectedMessage.client_ip || selectedMessage.client_device) && (
                <div className="space-y-4">
                  {/* Section 1: Appareil & Matériel */}
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-7 border border-blue-200">
                    <h3 className="text-base font-bold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-3">
                      {selectedMessage.client_device === 'Mobile' ? (
                        <Smartphone size={20} className="text-blue-600" />
                      ) : (
                        <Monitor size={20} className="text-blue-600" />
                      )}
                      Appareil & Matériel
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedMessage.client_device && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-blue-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                            {selectedMessage.client_device === 'Mobile' ? (
                              <Smartphone size={22} className="text-blue-600" />
                            ) : (
                              <Monitor size={22} className="text-blue-600" />
                            )}
                            <p className="text-sm text-gray-600 font-semibold">Type d'appareil</p>
                          </div>
                          <p className="text-gray-900 font-bold text-base">{selectedMessage.client_device}</p>
                        </div>
                      )}
                      {selectedMessage.client_browser && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-blue-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                            <Chrome size={22} className="text-blue-600" />
                            <p className="text-sm text-gray-600 font-semibold">Navigateur</p>
                          </div>
                          <p className="text-gray-900 font-bold text-base">{selectedMessage.client_browser}</p>
                        </div>
                      )}
                      {selectedMessage.client_os && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-blue-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                            <Monitor size={22} className="text-blue-600" />
                            <p className="text-sm text-gray-600 font-semibold">Système d'exploitation</p>
                          </div>
                          <p className="text-gray-900 font-bold text-base">{selectedMessage.client_os}</p>
                        </div>
                      )}
                      {selectedMessage.client_screen_resolution && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-blue-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                            <Maximize2 size={22} className="text-blue-600" />
                            <p className="text-sm text-gray-600 font-semibold">Résolution écran</p>
                          </div>
                          <p className="text-gray-900 font-bold text-base font-mono">{selectedMessage.client_screen_resolution}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Localisation & Réseau */}
                  <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-7 border border-emerald-200">
                    <h3 className="text-base font-bold text-emerald-700 uppercase tracking-wider mb-4 flex items-center gap-3">
                      <Globe size={20} className="text-emerald-600" />
                      Localisation & Réseau
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedMessage.client_ip && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-sm col-span-2">
                          <div className="flex items-center gap-3 mb-2">
                            <MapPin size={22} className="text-emerald-600" />
                            <p className="text-sm text-gray-600 font-semibold">Adresse IP</p>
                          </div>
                          <p className="text-gray-900 font-bold text-base font-mono">{selectedMessage.client_ip}</p>
                          <p className="text-sm text-emerald-600 mt-1">🌍 Connexion réseau identifiée</p>
                        </div>
                      )}
                      {selectedMessage.client_timezone && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                            <Clock size={22} className="text-emerald-600" />
                            <p className="text-sm text-gray-600 font-semibold">Fuseau horaire</p>
                          </div>
                          <p className="text-gray-900 font-bold text-base font-mono">{selectedMessage.client_timezone}</p>
                        </div>
                      )}
                      {selectedMessage.client_language && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                            <Languages size={22} className="text-emerald-600" />
                            <p className="text-sm text-gray-600 font-semibold">Langue préférée</p>
                          </div>
                          <p className="text-gray-900 font-bold text-base font-mono uppercase">{selectedMessage.client_language}</p>
                        </div>
                      )}
                      {selectedMessage.referrer && (
                        <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-emerald-100 shadow-sm col-span-2">
                          <div className="flex items-center gap-3 mb-2">
                            <Link2 size={22} className="text-emerald-600" />
                            <p className="text-sm text-gray-600 font-semibold">Page de provenance</p>
                          </div>
                          <p className="text-gray-900 font-mono text-sm break-all">{selectedMessage.referrer}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Tracking Marketing (UTM) */}
                  {(selectedMessage.utm_source || selectedMessage.utm_medium || selectedMessage.utm_campaign) && (
                    <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 rounded-xl p-7 border border-pink-200">
                      <h3 className="text-base font-bold text-pink-700 uppercase tracking-wider mb-4 flex items-center gap-3">
                        <Target size={20} className="text-pink-600" />
                        Tracking Campagne Marketing
                      </h3>
                      <div className="space-y-3">
                        {selectedMessage.utm_source && (
                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-pink-100 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                                  <span className="text-pink-700 font-bold text-sm">SRC</span>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 font-medium">UTM Source</p>
                                  <p className="text-gray-900 font-bold text-base">{selectedMessage.utm_source}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedMessage.utm_medium && (
                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-pink-100 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                                  <span className="text-rose-700 font-bold text-sm">MED</span>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 font-medium">UTM Medium</p>
                                  <p className="text-gray-900 font-bold text-base">{selectedMessage.utm_medium}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedMessage.utm_campaign && (
                          <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-pink-100 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                  <span className="text-orange-700 font-bold text-sm">CPG</span>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 font-medium">UTM Campaign</p>
                                  <p className="text-gray-900 font-bold text-base">{selectedMessage.utm_campaign}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* User-Agent Complet (Collapsible) */}
                  {selectedMessage.client_user_agent && (
                    <details className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-7 border border-gray-200">
                      <summary className="text-base font-bold text-gray-700 cursor-pointer hover:text-[#10B981] transition-colors flex items-center gap-3">
                        <Activity size={18} />
                        Afficher User-Agent complet (données techniques avancées)
                      </summary>
                      <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap break-all font-mono leading-relaxed">{selectedMessage.client_user_agent}</pre>
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Analyse Intelligente et Suggestions */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-7 border border-purple-200">
                <h3 className="text-base font-semibold text-purple-700 uppercase tracking-wider mb-4 flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyse Intelligente
                </h3>

                <div className="space-y-3">
                  {/* Statut Assignation */}
                  {!selectedMessage.assigned_to && (
                    <div className="bg-amber-100 border-l-4 border-amber-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-700 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-base font-semibold text-amber-900">Message non acheminé</p>
                          <p className="text-sm text-amber-800 mt-1">Ce message n'a pas encore été assigné à un collègue. Utilisez les boutons ci-dessus pour l'acheminer à Sandra ou Michel.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analyse des données techniques */}
                  {!selectedMessage.client_ip && !selectedMessage.client_device && !selectedMessage.client_browser && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <svg className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-base font-semibold text-blue-900">Données techniques manquantes</p>
                          <p className="text-sm text-blue-800 mt-1">Ce message a été reçu avant l'implémentation du système de tracking technique. Les nouveaux messages capturent automatiquement l'IP, le browser, l'OS et l'appareil utilisé.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggestions basées sur l'appareil */}
                  {selectedMessage.client_device === 'Mobile' && (
                    <div className="bg-green-100 border-l-4 border-green-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={20} className="text-green-700 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-base font-semibold text-green-900">Utilisateur mobile détecté</p>
                          <p className="text-sm text-green-800 mt-1">Client utilise un appareil mobile. Assurez-vous que toute réponse avec liens soit optimisée pour mobile.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMessage.client_device === 'Desktop' && selectedMessage.client_os === 'Windows' && (
                    <div className="bg-indigo-100 border-l-4 border-indigo-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <svg className="w-4 h-4 text-indigo-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-base font-semibold text-indigo-900">Desktop Windows</p>
                          <p className="text-sm text-indigo-800 mt-1">Client utilise un ordinateur Windows. Idéal pour partager des documents PDF ou des formulaires détaillés.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analyse Browser */}
                  {selectedMessage.client_browser === 'Safari' && selectedMessage.client_os === 'iOS' && (
                    <div className="bg-pink-100 border-l-4 border-pink-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <Phone size={20} className="text-pink-700 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-base font-semibold text-pink-900">Utilisateur iPhone/iPad</p>
                          <p className="text-sm text-pink-800 mt-1">Safari sur iOS détecté. Privilégiez les appels téléphoniques directs via liens tel: dans vos réponses.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analyse Langue */}
                  {selectedMessage.client_language && !selectedMessage.client_language.toLowerCase().startsWith('fr') && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <svg className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <div>
                          <p className="text-base font-semibold text-yellow-900">Langue non-française détectée</p>
                          <p className="text-sm text-yellow-800 mt-1">Le navigateur du client est configuré en <strong>{selectedMessage.client_language}</strong>. Considérez une réponse bilingue ou vérifiez la préférence linguistique.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tracking UTM Campaign */}
                  {(selectedMessage.utm_source || selectedMessage.utm_campaign) && (
                    <div className="bg-teal-100 border-l-4 border-teal-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <svg className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <div>
                          <p className="text-base font-semibold text-teal-900">Source trackée : Campagne Marketing</p>
                          <p className="text-sm text-teal-800 mt-1">
                            Ce client provient d'une campagne marketing trackée
                            {selectedMessage.utm_source && <> (<strong>{selectedMessage.utm_source}</strong>)</>}.
                            Assurez un suivi prioritaire pour maximiser le ROI de la campagne.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Réponse système envoyée */}
                  {selectedMessage.system_responded && (
                    <div className="bg-emerald-100 border-l-4 border-emerald-500 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={20} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-base font-semibold text-emerald-900">Email de confirmation envoyé</p>
                          <p className="text-sm text-emerald-800 mt-1">Le client a reçu un email automatique de confirmation. Veillez à répondre dans les 24-48h ouvrables tel qu'indiqué dans la confirmation.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Emails Envoyes */}
              <div className="bg-gray-50 rounded-xl p-7">
                <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-3">
                  <Send size={18} />
                  Emails Envoyes ({messageEmails.length})
                </h3>
                {messageEmails.length === 0 ? (
                  <p className="text-gray-500 text-base italic">Aucun email enregistre</p>
                ) : (
                  <div className="space-y-3">
                    {messageEmails.map((email) => (
                      <div key={email.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm px-2.5 py-1 rounded-full font-semibold ${
                              email.type === 'system' ? 'bg-purple-100 text-purple-700' :
                              email.type === 'manual' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {email.type === 'system' ? '🤖 Auto' : '✍️ Manuel'}
                            </span>
                            <span className="text-sm text-gray-400">
                              {new Date(email.date).toLocaleString('fr-CA', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => setPreviewEmail(email)}
                            className="text-sm px-4 py-2 bg-[#10B981] text-white rounded-xl hover:bg-[#059669] transition-colors font-medium flex items-center gap-1"
                          >
                            <ExternalLink size={16} />
                            Aperçu
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <Mail size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Destinataire</p>
                              <p className="text-base font-medium text-gray-900 truncate">{email.to}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MessageSquare size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Objet</p>
                              <p className="text-base font-semibold text-gray-900">{email.subject}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="flex-1 py-3 bg-[#10B981] text-white rounded-xl text-base font-semibold hover:bg-[#059669] transition-colors flex items-center justify-center gap-3"
                >
                  <Mail size={20} />
                  Repondre par email
                </a>
                {selectedMessage.telephone && (
                  <a
                    href={`tel:${selectedMessage.telephone}`}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
                  >
                    <Phone size={20} />
                    Appeler
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
