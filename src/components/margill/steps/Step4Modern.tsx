/**
 * 🏦 Step 4 - Informations Bancaires et Références
 */

'use client'

import { motion } from 'framer-motion'
import { Building, CreditCard, User, Phone } from 'lucide-react'
import { ModernInput, ModernSelect } from '../ModernInput'
import type { LoanApplicationFormData } from '@/lib/types/titan'

interface Step4ModernProps {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  onChange: (data: Partial<LoanApplicationFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step4Modern({ formData, errors, onChange, onNext, onBack }: Step4ModernProps) {
  const handleChange = (field: keyof LoanApplicationFormData, value: any) => {
    onChange({ [field]: value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <motion.div
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 md:p-12"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Informations Bancaires
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Coordonnées bancaires et références
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Infos bancaires */}
          <div className="bg-blue-50 dark:bg-gray-800 p-6 rounded-xl space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Compte Bancaire
            </h3>

            <ModernInput
              label="Institution financière"
              icon={<Building size={20} />}
              value={formData.institution_financiere || ''}
              onChange={(e) => handleChange('institution_financiere', e.target.value)}
              error={errors.institution_financiere}
              required
              placeholder="Banque Nationale"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModernInput
                label="Numéro de transit"
                value={formData.transit || ''}
                onChange={(e) => handleChange('transit', e.target.value)}
                error={errors.transit}
                required
                maxLength={5}
                placeholder="00001"
              />
              <ModernInput
                label="Numéro de compte"
                value={formData.numero_compte || ''}
                onChange={(e) => handleChange('numero_compte', e.target.value)}
                error={errors.numero_compte}
                required
                placeholder="1234567"
              />
            </div>

            <ModernSelect
              label="Type de compte"
              icon={<CreditCard size={20} />}
              value={formData.type_compte || ''}
              onChange={(e) => handleChange('type_compte', e.target.value)}
              error={errors.type_compte}
              required
              options={[
                { value: 'cheque', label: 'Chèque' },
                { value: 'epargne', label: 'Épargne' },
              ]}
            />
          </div>

          {/* Références */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Références Personnelles
            </h3>

            {/* Référence 1 */}
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Première Référence
              </h4>
              <div className="space-y-4">
                <ModernInput
                  label="Nom complet"
                  icon={<User size={20} />}
                  value={formData.reference_1_nom || ''}
                  onChange={(e) => handleChange('reference_1_nom', e.target.value)}
                  error={errors.reference_1_nom}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModernInput
                    label="Téléphone"
                    type="tel"
                    icon={<Phone size={20} />}
                    value={formData.reference_1_telephone || ''}
                    onChange={(e) => handleChange('reference_1_telephone', e.target.value)}
                    error={errors.reference_1_telephone}
                    required
                    placeholder="(514) 123-4567"
                  />
                  <ModernInput
                    label="Relation"
                    value={formData.reference_1_relation || ''}
                    onChange={(e) => handleChange('reference_1_relation', e.target.value)}
                    error={errors.reference_1_relation}
                    required
                    placeholder="Ami, Collègue..."
                  />
                </div>
              </div>
            </div>

            {/* Référence 2 */}
            <div className="bg-purple-50 dark:bg-gray-800 p-6 rounded-xl">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Deuxième Référence
              </h4>
              <div className="space-y-4">
                <ModernInput
                  label="Nom complet"
                  icon={<User size={20} />}
                  value={formData.reference_2_nom || ''}
                  onChange={(e) => handleChange('reference_2_nom', e.target.value)}
                  error={errors.reference_2_nom}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModernInput
                    label="Téléphone"
                    type="tel"
                    icon={<Phone size={20} />}
                    value={formData.reference_2_telephone || ''}
                    onChange={(e) => handleChange('reference_2_telephone', e.target.value)}
                    error={errors.reference_2_telephone}
                    required
                    placeholder="(514) 123-4567"
                  />
                  <ModernInput
                    label="Relation"
                    value={formData.reference_2_relation || ''}
                    onChange={(e) => handleChange('reference_2_relation', e.target.value)}
                    error={errors.reference_2_relation}
                    required
                    placeholder="Ami, Collègue..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <motion.button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Retour
          </motion.button>
          <motion.button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Réviser →
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}
