/**
 * 📝 Step 1: Informations Personnelles
 */

'use client'

import { useState } from 'react'
import type { LoanApplicationFormData } from '@/lib/types/titan'
import { validateStep1 } from '@/lib/validators/margill-validation'
import { ChevronRight, User, Home } from 'lucide-react'

interface Step1Props {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  updateFormData: (data: Partial<LoanApplicationFormData>) => void
  setErrors: (errors: Record<string, string>) => void
  nextStep: () => void
}

const PROVINCES = [
  { code: 'QC', name: 'Québec' },
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'Colombie-Britannique' },
  { code: 'AB', name: 'Alberta' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nouvelle-Écosse' },
  { code: 'NB', name: 'Nouveau-Brunswick' },
  { code: 'NL', name: 'Terre-Neuve-et-Labrador' },
  { code: 'PE', name: 'Île-du-Prince-Édouard' },
  { code: 'NT', name: 'Territoires du Nord-Ouest' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NU', name: 'Nunavut' },
]

export default function Step1PersonalInfo({
  formData,
  errors,
  updateFormData,
  setErrors,
  nextStep,
}: Step1Props) {
  const handleChange = (field: keyof LoanApplicationFormData, value: string | number) => {
    updateFormData({ [field]: value })
  }

  const handleNext = () => {
    const validation = validateStep1(formData)

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
          <User className="w-6 h-6 text-sar-orange" />
          Informations personnelles
        </h2>
        <p className="text-gray-600">
          Veuillez fournir vos informations personnelles pour débuter votre demande de prêt.
        </p>
      </div>

      {/* Informations personnelles */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.prenom || ''}
              onChange={(e) => handleChange('prenom', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                errors.prenom ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Jean"
            />
            {errors.prenom && <p className="text-red-500 text-sm mt-1">{errors.prenom}</p>}
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nom || ''}
              onChange={(e) => handleChange('nom', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                errors.nom ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tremblay"
            />
            {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}
          </div>
        </div>

        {/* Courriel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse courriel <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.courriel || ''}
            onChange={(e) => handleChange('courriel', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.courriel ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="jean.tremblay@exemple.com"
          />
          {errors.courriel && <p className="text-red-500 text-sm mt-1">{errors.courriel}</p>}
        </div>

        {/* Téléphone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.telephone || ''}
            onChange={(e) => handleChange('telephone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.telephone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="(514) 123-4567"
          />
          {errors.telephone && <p className="text-red-500 text-sm mt-1">{errors.telephone}</p>}
        </div>

        {/* Date de naissance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de naissance <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.date_naissance || ''}
            onChange={(e) => handleChange('date_naissance', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
              errors.date_naissance ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date_naissance && (
            <p className="text-red-500 text-sm mt-1">{errors.date_naissance}</p>
          )}
        </div>
      </div>

      {/* Adresse */}
      <div>
        <h3 className="text-lg font-semibold text-sar-navy mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-sar-orange" />
          Adresse résidentielle
        </h3>

        <div className="space-y-4">
          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.adresse_rue || ''}
              onChange={(e) => handleChange('adresse_rue', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                errors.adresse_rue ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="123 Rue Principale"
            />
            {errors.adresse_rue && (
              <p className="text-red-500 text-sm mt-1">{errors.adresse_rue}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ville */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.adresse_ville || ''}
                onChange={(e) => handleChange('adresse_ville', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                  errors.adresse_ville ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Montréal"
              />
              {errors.adresse_ville && (
                <p className="text-red-500 text-sm mt-1">{errors.adresse_ville}</p>
              )}
            </div>

            {/* Province */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.adresse_province || ''}
                onChange={(e) => handleChange('adresse_province', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                  errors.adresse_province ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner...</option>
                {PROVINCES.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
              {errors.adresse_province && (
                <p className="text-red-500 text-sm mt-1">{errors.adresse_province}</p>
              )}
            </div>

            {/* Code postal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code postal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.adresse_code_postal || ''}
                onChange={(e) => handleChange('adresse_code_postal', e.target.value.toUpperCase())}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                  errors.adresse_code_postal ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="H1A 1A1"
                maxLength={7}
              />
              {errors.adresse_code_postal && (
                <p className="text-red-500 text-sm mt-1">{errors.adresse_code_postal}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Durée résidence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée de résidence (mois) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.duree_residence_mois || ''}
                onChange={(e) =>
                  handleChange('duree_residence_mois', parseInt(e.target.value) || 0)
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                  errors.duree_residence_mois ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="24"
                min="0"
              />
              {errors.duree_residence_mois && (
                <p className="text-red-500 text-sm mt-1">{errors.duree_residence_mois}</p>
              )}
            </div>

            {/* Type logement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de logement <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type_logement || ''}
                onChange={(e) => handleChange('type_logement', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sar-orange focus:border-transparent ${
                  errors.type_logement ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner...</option>
                <option value="proprietaire">Propriétaire</option>
                <option value="locataire">Locataire</option>
                <option value="autre">Autre</option>
              </select>
              {errors.type_logement && (
                <p className="text-red-500 text-sm mt-1">{errors.type_logement}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t">
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
