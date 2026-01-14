/**
 * 🏦 Step 4: Informations Bancaires
 */

'use client'

import type { LoanApplicationFormData } from '@/lib/types/titan'
import { validateStep4 } from '@/lib/validators/margill-validation'
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react'

interface Step4Props {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  updateFormData: (data: Partial<LoanApplicationFormData>) => void
  setErrors: (errors: Record<string, string>) => void
  nextStep: () => void
  prevStep: () => void
}

export default function Step4Banking({
  formData,
  errors,
  updateFormData,
  setErrors,
  nextStep,
  prevStep,
}: Step4Props) {
  const handleChange = (field: keyof LoanApplicationFormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  const handleNext = () => {
    const validation = validateStep4(formData)

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
          <Building2 className="w-6 h-6 text-sar-orange" />
          Informations bancaires
        </h2>
        <p className="text-gray-600">
          Ces informations sont requises pour le virement des fonds en cas d'approbation.
        </p>
      </div>

      <div className="space-y-4">
        {/* Institution financière */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Institution financière <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.institution_financiere || ''}
            onChange={(e) => handleChange('institution_financiere', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.institution_financiere ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ex: Banque Nationale, Desjardins, RBC..."
          />
          {errors.institution_financiere && (
            <p className="text-red-500 text-sm mt-1">{errors.institution_financiere}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Numéro de transit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de transit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.transit || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                handleChange('transit', value)
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                errors.transit ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="12345"
              maxLength={5}
            />
            {errors.transit && <p className="text-red-500 text-sm mt-1">{errors.transit}</p>}
            <p className="text-sm text-gray-500 mt-1">5 chiffres</p>
          </div>

          {/* Type de compte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de compte <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type_compte || ''}
              onChange={(e) => handleChange('type_compte', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                errors.type_compte ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner...</option>
              <option value="cheque">Compte chèque</option>
              <option value="epargne">Compte épargne</option>
            </select>
            {errors.type_compte && <p className="text-red-500 text-sm mt-1">{errors.type_compte}</p>}
          </div>
        </div>

        {/* Numéro de compte */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de compte <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.numero_compte || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 12)
              handleChange('numero_compte', value)
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.numero_compte ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="1234567"
            maxLength={12}
          />
          {errors.numero_compte && (
            <p className="text-red-500 text-sm mt-1">{errors.numero_compte}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">Entre 7 et 12 chiffres</p>
        </div>

        {/* Avertissement sécurité */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Vos informations sont sécurisées</p>
              <p>
                Toutes vos données bancaires sont cryptées et stockées en toute sécurité. Nous ne
                partageons jamais vos informations avec des tiers non autorisés.
              </p>
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
