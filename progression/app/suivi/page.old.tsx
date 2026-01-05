'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { RefreshCw, AlertCircle, Clock, FileText } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
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
          <div className="w-16 h-16 border-4 border-sar-green/30 border-t-sar-green rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Lien invalide ou expiré</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Si vous avez besoin d&apos;aide, veuillez contacter notre équipe.
          </p>
        </div>
      </div>
    )
  }

  const { application, notes, progress } = data.data

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Suivi de votre demande
          </h1>
          <p className="text-gray-600">ID: {application.id}</p>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>

        {/* Progress Card */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-6">Progression</h2>
          <ProgressBar steps={progress.steps} currentStep={progress.currentStep} />
        </div>

        {/* Application Info */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {application.name && (
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="font-medium">{application.name}</p>
              </div>
            )}
            {application.email && (
              <div>
                <p className="text-sm text-gray-500">Courriel</p>
                <p className="font-medium">{application.email}</p>
              </div>
            )}
            {application.phone && (
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="font-medium">{application.phone}</p>
              </div>
            )}
            {application.amount_cents && (
              <div>
                <p className="text-sm text-gray-500">Montant</p>
                <p className="font-medium">
                  {(application.amount_cents / 100).toLocaleString('fr-CA', {
                    style: 'currency',
                    currency: 'CAD',
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Date de création</p>
              <p className="font-medium">
                {new Date(application.created_at).toLocaleDateString('fr-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {application.first_payment_date && (
              <div>
                <p className="text-sm text-gray-500">Premier paiement</p>
                <p className="font-medium">
                  {new Date(application.first_payment_date).toLocaleDateString('fr-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {notes && notes.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Messages</h2>
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-800">{note.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(note.created_at).toLocaleString('fr-CA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Ce lien est valide pendant 48 heures
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SuiviPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-sar-green/30 border-t-sar-green rounded-full animate-spin"></div>
      </div>
    }>
      <SuiviContent />
    </Suspense>
  )
}
