/**
 * ✅ Page de Confirmation - Demande Soumise
 */

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Mail, Phone, Download } from 'lucide-react'
import Link from 'next/link'

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('ref')

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Main Message */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-sar-navy mb-4">
              Demande soumise avec succès!
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              Votre demande de prêt a été reçue et est en cours de traitement.
            </p>

            {/* Reference Number */}
            {reference && (
              <div className="bg-gradient-to-r from-sar-orange/10 to-orange-100/50 rounded-lg p-6 mb-8 border-2 border-sar-orange">
                <p className="text-sm text-gray-600 mb-2">Numéro de référence</p>
                <p className="text-3xl font-bold text-sar-orange font-mono tracking-wider">
                  {reference}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Conservez ce numéro pour toute communication future
                </p>
              </div>
            )}

            {/* Next Steps */}
            <div className="text-left mb-8">
              <h2 className="text-xl font-semibold text-sar-navy mb-4">Prochaines étapes</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-sar-orange text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-sar-navy">Confirmation par courriel</p>
                    <p className="text-sm text-gray-600">
                      Vous recevrez un courriel de confirmation dans les prochaines minutes
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-sar-orange text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-sar-navy">Analyse de votre dossier</p>
                    <p className="text-sm text-gray-600">
                      Notre équipe analysera votre demande dans les 24-48 heures
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-sar-orange text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-sar-navy">Réponse et prochaines étapes</p>
                    <p className="text-sm text-gray-600">
                      Nous vous contacterons par téléphone ou courriel avec notre décision
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-sar-navy mb-3">Des questions?</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-sar-orange" />
                  <a href="mailto:info@solutionargentrapide.ca" className="hover:text-sar-orange">
                    info@solutionargentrapide.ca
                  </a>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-sar-orange" />
                  <a href="tel:+15145551234" className="hover:text-sar-orange">
                    (514) 555-1234
                  </a>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="px-8 py-3 bg-sar-orange text-white rounded-lg hover:bg-orange-600 transition font-semibold text-center"
              >
                Retour à l'accueil
              </Link>
              <button
                onClick={() => window.print()}
                className="px-8 py-3 border-2 border-sar-orange text-sar-orange rounded-lg hover:bg-sar-orange hover:text-white transition font-semibold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Imprimer la confirmation
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              Vous n'avez pas reçu de courriel?{' '}
              <a href="/nous-joindre" className="text-sar-orange hover:underline font-semibold">
                Contactez-nous
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sar-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
}
