'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import {
  SUPPORT_CATEGORIES,
  PRIORITY_LEVELS,
  AUTHORIZED_EMPLOYEES,
  isAuthorizedEmployee
} from '@/lib/support-utils'
import {
  collectAllDiagnostics,
  initConsoleMonitoring
} from '@/lib/support-diagnostics'

interface CreateTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onTicketCreated: (ticket: any) => void
  currentUserEmail?: string
  currentUserName?: string
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  onTicketCreated,
  currentUserEmail = '',
  currentUserName = ''
}: CreateTicketModalProps) {
  // Form state
  const [createdBy, setCreatedBy] = useState(currentUserName)
  const [createdByEmail, setCreatedByEmail] = useState(currentUserEmail)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('medium')

  // Options de diagnostics
  const [captureScreenshot, setCaptureScreenshot] = useState(false)
  const [captureDiagnostics, setCaptureDiagnostics] = useState(true)
  const [captureConsoleLogs, setCaptureConsoleLogs] = useState(true)
  const [runConnectionTests, setRunConnectionTests] = useState(true)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Initialiser le monitoring console au mount
  useEffect(() => {
    initConsoleMonitoring()
  }, [])

  // Reset form quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setCategory('')
      setPriority('medium')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!createdBy || !createdByEmail) {
        setError('Nom et email requis')
        setLoading(false)
        return
      }

      if (!isAuthorizedEmployee(createdByEmail)) {
        setError('Email non autorisé. Contactez un administrateur.')
        setLoading(false)
        return
      }

      if (!title || !description || !category) {
        setError('Tous les champs sont requis')
        setLoading(false)
        return
      }

      // Collecter les diagnostics si activé
      let diagnostics: any = {}

      if (captureDiagnostics || captureConsoleLogs || runConnectionTests) {
        diagnostics = await collectAllDiagnostics()

        // Filtrer selon les options
        if (!captureConsoleLogs) {
          delete diagnostics.console_logs
        }
        if (!runConnectionTests) {
          delete diagnostics.connection_tests
        }
      }

      // Créer le ticket
      const res = await fetch('/api/admin/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          created_by: createdBy,
          created_by_email: createdByEmail,
          title,
          description,
          category,
          priority,
          browser_info: diagnostics.browser_info,
          system_info: diagnostics.system_info,
          console_logs: diagnostics.console_logs,
          connection_tests: diagnostics.connection_tests,
          page_url: diagnostics.page_url
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la création du ticket')
      }

      const data = await res.json()

      // Succès!
      setSuccess(true)
      setTimeout(() => {
        onTicketCreated(data.ticket)
        onClose()
      }, 1500)

    } catch (err) {
      console.error('Erreur création ticket:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#10B981] to-emerald-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">➕ Nouveau Ticket de Support</h2>
            <p className="text-emerald-100 mt-1">Décris ton problème, on va t'aider!</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success message */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600" />
              <div>
                <p className="font-bold text-green-900">Ticket créé avec succès!</p>
                <p className="text-green-700 text-sm">L'équipe technique va te répondre rapidement.</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3">
              <AlertCircle size={24} className="text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👤 Ton nom
            </label>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="Ex: Frederic Rosa"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
              required
              disabled={loading || success}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ✉️ Ton email
            </label>
            <input
              type="email"
              value={createdByEmail}
              onChange={(e) => setCreatedByEmail(e.target.value)}
              placeholder="Ex: frederic@solutionargentrapide.ca"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
              required
              disabled={loading || success}
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🏷️ Type de problème
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
              required
              disabled={loading || success}
            >
              <option value="">Sélectionne une catégorie</option>
              {SUPPORT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎯 Priorité
            </label>
            <div className="grid grid-cols-4 gap-3">
              {PRIORITY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setPriority(level.id)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all border-2 ${
                    priority === level.id
                      ? level.color + ' border-gray-900'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading || success}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 Titre court (résume ton problème)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Impossible de me connecter au dashboard"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all"
              required
              maxLength={100}
              disabled={loading || success}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100 caractères</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 Décris ton problème en détails
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique ce qui ne fonctionne pas, ce que tu as essayé, quand ça a commencé..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] transition-all resize-none"
              required
              disabled={loading || success}
            />
            <p className="text-xs text-gray-500 mt-1">Plus tu donnes de détails, plus vite on pourra t'aider!</p>
          </div>

          {/* Options de diagnostic */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              🔍 Tests automatiques
              <span className="text-xs font-normal text-blue-600">(Aide l'équipe à diagnostiquer)</span>
            </h3>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={captureDiagnostics}
                  onChange={(e) => setCaptureDiagnostics(e.target.checked)}
                  className="w-5 h-5 text-[#10B981] rounded focus:ring-2 focus:ring-[#10B981]"
                  disabled={loading || success}
                />
                <span className="text-sm text-gray-700">
                  <strong>Infos système</strong> (Browser, OS, résolution, timezone)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={captureConsoleLogs}
                  onChange={(e) => setCaptureConsoleLogs(e.target.checked)}
                  className="w-5 h-5 text-[#10B981] rounded focus:ring-2 focus:ring-[#10B981]"
                  disabled={loading || success}
                />
                <span className="text-sm text-gray-700">
                  <strong>Logs d'erreurs JavaScript</strong> (Erreurs techniques dans la console)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={runConnectionTests}
                  onChange={(e) => setRunConnectionTests(e.target.checked)}
                  className="w-5 h-5 text-[#10B981] rounded focus:ring-2 focus:ring-[#10B981]"
                  disabled={loading || success}
                />
                <span className="text-sm text-gray-700">
                  <strong>Test de connexion</strong> (Supabase, réseau)
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              disabled={loading || success}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#10B981] to-emerald-600 text-white rounded-xl hover:from-[#059669] hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Création...
                </>
              ) : success ? (
                <>
                  <CheckCircle size={20} />
                  Créé!
                </>
              ) : (
                'Créer le ticket →'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
