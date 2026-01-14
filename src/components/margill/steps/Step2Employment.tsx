/**
 * 💼 Step 2: Emploi et Revenus
 */

'use client'

import type { LoanApplicationFormData } from '@/lib/types/titan'
import { validateStep2 } from '@/lib/validators/margill-validation'
import { ChevronLeft, ChevronRight, Briefcase, DollarSign } from 'lucide-react'

interface Step2Props {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  updateFormData: (data: Partial<LoanApplicationFormData>) => void
  setErrors: (errors: Record<string, string>) => void
  nextStep: () => void
  prevStep: () => void
}

export default function Step2Employment({
  formData,
  errors,
  updateFormData,
  setErrors,
  nextStep,
  prevStep,
}: Step2Props) {
  const handleChange = (field: keyof LoanApplicationFormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  const handleNext = () => {
    const validation = validateStep2(formData)

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

  const needsEmployer =
    formData.statut_emploi === 'salarie' || formData.statut_emploi === 'autonome'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-sar-navy mb-2 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-sar-orange" />
          Emploi et revenus
        </h2>
        <p className="text-gray-600">
          Renseignements sur votre situation professionnelle et vos revenus.
        </p>
      </div>

      <div className="space-y-4">
        {/* Statut d'emploi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut d'emploi <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.statut_emploi || ''}
            onChange={(e) => handleChange('statut_emploi', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.statut_emploi ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionner...</option>
            <option value="salarie">Salarié</option>
            <option value="autonome">Travailleur autonome</option>
            <option value="retraite">Retraité</option>
            <option value="sans_emploi">Sans emploi</option>
          </select>
          {errors.statut_emploi && (
            <p className="text-red-500 text-sm mt-1">{errors.statut_emploi}</p>
          )}
        </div>

        {/* Employeur (si salarié ou autonome) */}
        {needsEmployer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employeur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employeur || ''}
                onChange={(e) => handleChange('employeur', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                  errors.employeur ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nom de l'entreprise"
              />
              {errors.employeur && <p className="text-red-500 text-sm mt-1">{errors.employeur}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
              <input
                type="text"
                value={formData.poste || ''}
                onChange={(e) => handleChange('poste', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
                placeholder="Titre du poste"
              />
            </div>
          </div>
        )}

        {/* Revenu annuel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-sar-orange" />
            Revenu annuel brut <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.revenu_annuel ? formData.revenu_annuel / 100 : ''}
            onChange={(e) =>
              handleChange('revenu_annuel', Math.round(parseFloat(e.target.value) * 100) || 0)
            }
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.revenu_annuel ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="50000"
            min="0"
            step="1000"
          />
          {errors.revenu_annuel && (
            <p className="text-red-500 text-sm mt-1">{errors.revenu_annuel}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Montant avant impôts et déductions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ancienneté emploi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ancienneté d'emploi (mois) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.anciennete_emploi_mois || ''}
              onChange={(e) =>
                handleChange('anciennete_emploi_mois', parseInt(e.target.value) || 0)
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                errors.anciennete_emploi_mois ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="36"
              min="0"
            />
            {errors.anciennete_emploi_mois && (
              <p className="text-red-500 text-sm mt-1">{errors.anciennete_emploi_mois}</p>
            )}
          </div>

          {/* Fréquence de paie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fréquence de paie <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.frequence_paie || ''}
              onChange={(e) => handleChange('frequence_paie', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                errors.frequence_paie ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner...</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="bi_hebdomadaire">Aux 2 semaines</option>
              <option value="mensuel">Mensuel</option>
            </select>
            {errors.frequence_paie && (
              <p className="text-red-500 text-sm mt-1">{errors.frequence_paie}</p>
            )}
          </div>
        </div>

        {/* Prochaine paie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de la prochaine paie <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.prochaine_paie || ''}
            onChange={(e) => handleChange('prochaine_paie', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.prochaine_paie ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.prochaine_paie && (
            <p className="text-red-500 text-sm mt-1">{errors.prochaine_paie}</p>
          )}
        </div>

        {/* Autres revenus */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold text-sar-navy mb-4">Autres revenus (optionnel)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant mensuel
              </label>
              <input
                type="number"
                value={formData.autres_revenus ? formData.autres_revenus / 100 : ''}
                onChange={(e) =>
                  handleChange(
                    'autres_revenus',
                    Math.round(parseFloat(e.target.value) * 100) || 0
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text"
                value={formData.source_autres_revenus || ''}
                onChange={(e) => handleChange('source_autres_revenus', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent"
                placeholder="Ex: Pension, allocation, etc."
              />
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
