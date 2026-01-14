/**
 * 💰 Step 3: Détails du Prêt
 */

'use client'

import type { LoanApplicationFormData } from '@/lib/types/titan'
import { validateStep3 } from '@/lib/validators/margill-validation'
import { ChevronLeft, ChevronRight, DollarSign, CreditCard } from 'lucide-react'

interface Step3Props {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  updateFormData: (data: Partial<LoanApplicationFormData>) => void
  setErrors: (errors: Record<string, string>) => void
  nextStep: () => void
  prevStep: () => void
}

export default function Step3LoanDetails({
  formData,
  errors,
  updateFormData,
  setErrors,
  nextStep,
  prevStep,
}: Step3Props) {
  const handleChange = (field: keyof LoanApplicationFormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  const handleNext = () => {
    const validation = validateStep3(formData)

    if (!validation.valid) {
      const errorMap: Record<string, string> = {}
      validation.errors.forEach((err) => {
        errorMap[err.field] = err.message
      })
      setErrors(errorMap)
      return
    }

    nextStep()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-sar-navy mb-2 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-sar-orange" />
          Détails du prêt
        </h2>
        <p className="text-gray-600">
          Indiquez le montant souhaité et vos obligations financières actuelles.
        </p>
      </div>

      <div className="space-y-4">
        {/* Montant demandé */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Montant demandé <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={formData.montant_demande ? formData.montant_demande / 100 : ''}
              onChange={(e) =>
                handleChange('montant_demande', Math.round(parseFloat(e.target.value) * 100) || 0)
              }
              className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent text-lg font-semibold ${
                errors.montant_demande ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="5000"
              min="500"
              max="50000"
              step="100"
            />
          </div>
          {errors.montant_demande && (
            <p className="text-red-500 text-sm mt-1">{errors.montant_demande}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">Montant entre 500$ et 50 000$</p>
        </div>

        {/* Durée du prêt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durée du prêt (mois) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.duree_pret_mois || ''}
            onChange={(e) => handleChange('duree_pret_mois', parseInt(e.target.value) || 0)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.duree_pret_mois ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="12"
            min="1"
            max="120"
          />
          {errors.duree_pret_mois && (
            <p className="text-red-500 text-sm mt-1">{errors.duree_pret_mois}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">Entre 1 et 120 mois (10 ans)</p>
        </div>

        {/* Raison du prêt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Raison du prêt (optionnel)
          </label>
          <textarea
            value={formData.raison_pret || ''}
            onChange={(e) => handleChange('raison_pret', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
            placeholder="Ex: Consolidation de dettes, rénovations, urgence médicale..."
            rows={3}
            maxLength={200}
          />
          <p className="text-sm text-gray-500 mt-1">
            Maximum 200 caractères ({(formData.raison_pret || '').length}/200)
          </p>
        </div>

        {/* Dettes actuelles */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold text-sar-navy mb-2 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sar-orange" />
            Obligations financières mensuelles
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Indiquez vos paiements mensuels actuels. Ces informations nous aident à évaluer votre
            capacité de remboursement.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loyer/Hypothèque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loyer ou hypothèque
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={
                    formData.paiement_loyer_hypotheque
                      ? formData.paiement_loyer_hypotheque / 100
                      : ''
                  }
                  onChange={(e) =>
                    handleChange(
                      'paiement_loyer_hypotheque',
                      Math.round(parseFloat(e.target.value) * 100) || 0
                    )
                  }
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Autres prêts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autres prêts
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.autres_prets ? formData.autres_prets / 100 : ''}
                  onChange={(e) =>
                    handleChange(
                      'autres_prets',
                      Math.round(parseFloat(e.target.value) * 100) || 0
                    )
                  }
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Cartes de crédit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cartes de crédit
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.cartes_credit ? formData.cartes_credit / 100 : ''}
                  onChange={(e) =>
                    handleChange(
                      'cartes_credit',
                      Math.round(parseFloat(e.target.value) * 100) || 0
                    )
                  }
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Autres dettes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autres dettes
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.autres_dettes ? formData.autres_dettes / 100 : ''}
                  onChange={(e) =>
                    handleChange(
                      'autres_dettes',
                      Math.round(parseFloat(e.target.value) * 100) || 0
                    )
                  }
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={prevStep}
          className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 font-semibold"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 bg-sar-orange text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 font-semibold"
        >
          Continuer
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
