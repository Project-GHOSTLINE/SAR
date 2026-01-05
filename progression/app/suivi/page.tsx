'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  RefreshCw,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MessageSquare,
  User,
} from 'lucide-react'
import ModernProgressBar from '@/components/ModernProgressBar'
import { ClientStatusResponse } from '@/types'

function SuiviContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')

  const [data, setData] = useState<ClientStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async (showRefreshing = false) => {
    if (!token) {
      setError('Lien invalide. Veuillez vérifier votre lien.')
      setLoading(false)
      return
    }

    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await fetch(`/api/status?t=${encodeURIComponent(token)}`)
      const result: ClientStatusResponse = await response.json()

      if (!result.success) {
        setError(result.error || 'Erreur lors du chargement')
      } else {
        setData(result)
        setError(null)
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-medium mb-2">Lien invalide ou expiré</h1>
          <p className="text-slate-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500">
            Si vous avez besoin d&apos;aide, veuillez contacter notre équipe.
          </p>
        </div>
      </div>
    )
  }

  const { application, notes, progress } = data.data

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-12 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-light tracking-tight text-slate-900 mb-1 sm:mb-2">
                Suivi de votre demande
              </h1>
              <p className="text-xs sm:text-sm font-mono tracking-wider text-slate-500">
                ID: {application.id}
              </p>
            </div>
            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="rounded-xl bg-white shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md p-2 sm:px-4 sm:py-2 transition-all duration-300 disabled:opacity-50 flex-shrink-0"
            >
              <RefreshCw
                className={`w-5 h-5 text-slate-600 hover:text-indigo-600 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section Progression */}
        <div className="card mb-6 sm:mb-8 animate-slide-up">
          <h2 className="text-lg sm:text-xl font-serif font-medium text-slate-900 mb-4 sm:mb-8">
            Progression
          </h2>
          <ModernProgressBar steps={progress.steps} currentStep={progress.currentStep} />
        </div>

        {/* Grid Informations & Messages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Carte Informations */}
          <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-medium text-slate-900">Informations</h2>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* Nom */}
              {application.name && (
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    Nom
                  </label>
                  <p className="text-base sm:text-lg font-medium text-slate-900 mt-1">{application.name}</p>
                </div>
              )}

              {/* Email */}
              {application.email && (
                <div className="active:bg-slate-50 -mx-2 sm:-mx-3 px-2 sm:px-3 py-2 rounded-lg transition-colors duration-300">
                  <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1.5 sm:gap-2">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                    Email
                  </label>
                  <p className="text-sm sm:text-base font-medium text-slate-900 mt-1 break-all">{application.email}</p>
                </div>
              )}

              {/* Téléphone */}
              {application.phone && (
                <div className="active:bg-slate-50 -mx-2 sm:-mx-3 px-2 sm:px-3 py-2 rounded-lg transition-colors duration-300">
                  <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1.5 sm:gap-2">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                    Téléphone
                  </label>
                  <p className="text-base sm:text-lg font-medium text-slate-900 mt-1">{application.phone}</p>
                </div>
              )}

              {/* Montant */}
              {application.amount_cents && (
                <div className="active:bg-slate-50 -mx-2 sm:-mx-3 px-2 sm:px-3 py-2 rounded-lg transition-colors duration-300">
                  <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1.5 sm:gap-2">
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                    Montant
                  </label>
                  <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">
                    {(application.amount_cents / 100).toLocaleString('fr-CA', {
                      style: 'currency',
                      currency: 'CAD',
                    })}
                  </p>
                </div>
              )}

              {/* Date */}
              <div className="active:bg-slate-50 -mx-2 sm:-mx-3 px-2 sm:px-3 py-2 rounded-lg transition-colors duration-300">
                <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                  Date de création
                </label>
                <p className="text-sm sm:text-base font-medium text-slate-900 mt-1">
                  {new Date(application.created_at).toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Carte Messages */}
          <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-medium text-slate-900">Messages</h2>
            </div>

            {notes && notes.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-4 sm:p-6 border border-slate-200/50"
                  >
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-3 sm:mb-4">{note.message}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="text-xs">
                        {new Date(note.created_at).toLocaleString('fr-CA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Carte astuce */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <p className="text-xs sm:text-sm text-indigo-800">
                    💡 Astuce: Consultez votre boîte de réception pour le lien de signature.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm sm:text-base text-slate-500 text-center py-6 sm:py-8">Aucun message pour le moment</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuiviPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      }
    >
      <SuiviContent />
    </Suspense>
  )
}
