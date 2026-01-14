/**
 * ✅ Step 5: Révision et Soumission
 */

'use client'

import type { LoanApplicationFormData } from '@/lib/types/titan'
import { ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'

interface Step5Props {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  updateFormData: (data: Partial<LoanApplicationFormData>) => void
  setErrors: (errors: Record<string, string>) => void
  prevStep: () => void
  onSubmit: () => Promise<void>
  loading: boolean
}

export default function Step5Review({
  formData,
  prevStep,
  onSubmit,
  loading,
}: Step5Props) {
  const formatCurrency = (cents: number | undefined) => {
    if (!cents) return '0$'
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Non spécifié'
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-sar-navy mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-sar-orange" />
          Révision de votre demande
        </h2>
        <p className="text-gray-600">
          Veuillez vérifier que toutes les informations sont exactes avant de soumettre votre
          demande.
        </p>
      </div>

      {/* Section 1: Informations personnelles */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-sar-navy mb-4">Informations personnelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Nom complet</p>
            <p className="font-semibold">
              {formData.prenom} {formData.nom}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Date de naissance</p>
            <p className="font-semibold">{formatDate(formData.date_naissance)}</p>
          </div>
          <div>
            <p className="text-gray-600">Courriel</p>
            <p className="font-semibold">{formData.courriel}</p>
          </div>
          <div>
            <p className="text-gray-600">Téléphone</p>
            <p className="font-semibold">{formData.telephone}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-600">Adresse</p>
            <p className="font-semibold">
              {formData.adresse_rue}, {formData.adresse_ville}, {formData.adresse_province}{' '}
              {formData.adresse_code_postal}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Type de logement</p>
            <p className="font-semibold">
              {formData.type_logement === 'proprietaire'
                ? 'Propriétaire'
                : formData.type_logement === 'locataire'
                ? 'Locataire'
                : 'Autre'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Durée de résidence</p>
            <p className="font-semibold">{formData.duree_residence_mois} mois</p>
          </div>
        </div>
      </div>

      {/* Section 2: Emploi et revenus */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-sar-navy mb-4">Emploi et revenus</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Statut d'emploi</p>
            <p className="font-semibold capitalize">{formData.statut_emploi?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-gray-600">Employeur</p>
            <p className="font-semibold">{formData.employeur || 'Non spécifié'}</p>
          </div>
          <div>
            <p className="text-gray-600">Revenu annuel</p>
            <p className="font-semibold text-green-600">
              {formatCurrency(formData.revenu_annuel)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Ancienneté</p>
            <p className="font-semibold">{formData.anciennete_emploi_mois} mois</p>
          </div>
          <div>
            <p className="text-gray-600">Fréquence de paie</p>
            <p className="font-semibold capitalize">
              {formData.frequence_paie?.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Prochaine paie</p>
            <p className="font-semibold">{formatDate(formData.prochaine_paie)}</p>
          </div>
        </div>
      </div>

      {/* Section 3: Détails du prêt */}
      <div className="bg-gradient-to-br from-sar-orange/10 to-orange-100/50 rounded-lg p-6 border-2 border-sar-orange">
        <h3 className="text-lg font-semibold text-sar-navy mb-4">Détails du prêt</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Montant demandé</p>
            <p className="font-bold text-2xl text-sar-orange">
              {formatCurrency(formData.montant_demande)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Durée</p>
            <p className="font-semibold text-lg">{formData.duree_pret_mois} mois</p>
          </div>
          <div>
            <p className="text-gray-600">Raison</p>
            <p className="font-semibold">{formData.raison_pret || 'Non spécifiée'}</p>
          </div>
        </div>
      </div>

      {/* Section 4: Informations bancaires */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-sar-navy mb-4">Informations bancaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Institution</p>
            <p className="font-semibold">{formData.institution_financiere}</p>
          </div>
          <div>
            <p className="text-gray-600">Type de compte</p>
            <p className="font-semibold capitalize">{formData.type_compte}</p>
          </div>
          <div>
            <p className="text-gray-600">Transit</p>
            <p className="font-semibold font-mono">{formData.transit}</p>
          </div>
          <div>
            <p className="text-gray-600">Numéro de compte</p>
            <p className="font-semibold font-mono">
              ****{formData.numero_compte?.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {/* Consentement */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2">Consentement et déclaration</p>
            <p className="mb-2">
              En soumettant cette demande, je certifie que toutes les informations fournies sont
              exactes et complètes. Je comprends que Solution Argent Rapide et ses partenaires
              utiliseront ces informations pour évaluer ma demande de prêt.
            </p>
            <p>
              J'autorise la vérification de mon crédit et accepte les{' '}
              <a href="/mentions-legales" className="underline font-semibold" target="_blank">
                conditions d'utilisation
              </a>{' '}
              et la{' '}
              <a
                href="/politique-de-confidentialite"
                className="underline font-semibold"
                target="_blank"
              >
                politique de confidentialité
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={prevStep}
          disabled={loading}
          className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-sar-orange to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition flex items-center gap-2 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Soumission en cours...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Soumettre ma demande
            </>
          )}
        </button>
      </div>
    </div>
  )
}
