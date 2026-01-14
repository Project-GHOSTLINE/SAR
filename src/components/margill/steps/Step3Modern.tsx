/**
 * 💰 Step 3 - Détails du Prêt et Dettes
 */

'use client'

import { motion } from 'framer-motion'
import { DollarSign, CreditCard, Home, FileText } from 'lucide-react'
import { ModernInput, ModernSelect } from '../ModernInput'
import type { LoanApplicationFormData } from '@/lib/types/titan'

interface Step3ModernProps {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  onChange: (data: Partial<LoanApplicationFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step3Modern({ formData, errors, onChange, onNext, onBack }: Step3ModernProps) {
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
          Détails du Prêt
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Montant désiré et vos engagements financiers
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Montant demandé */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
            <ModernInput
              label="Montant demandé"
              type="number"
              icon={<DollarSign size={20} />}
              value={formData.montant_demande ? formData.montant_demande / 100 : ''}
              onChange={(e) => handleChange('montant_demande', parseInt(e.target.value) * 100)}
              error={errors.montant_demande}
              required
              min={500}
              max={50000}
              placeholder="5000"
              helpText="Entre 500$ et 50,000$"
            />
          </div>

          {/* Raison et Durée */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernInput
              label="Raison du prêt"
              icon={<FileText size={20} />}
              value={formData.raison_pret || ''}
              onChange={(e) => handleChange('raison_pret', e.target.value)}
              error={errors.raison_pret}
              placeholder="Ex: Consolidation de dettes"
            />
            <ModernInput
              label="Durée souhaitée (mois)"
              type="number"
              value={formData.duree_pret_mois || ''}
              onChange={(e) => handleChange('duree_pret_mois', parseInt(e.target.value))}
              error={errors.duree_pret_mois}
              min={1}
              max={60}
              placeholder="24"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Dettes Mensuelles
            </h3>

            {/* Loyer/Hypothèque */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModernInput
                label="Loyer ou hypothèque ($/mois)"
                type="number"
                icon={<Home size={20} />}
                value={formData.paiement_loyer_hypotheque ? formData.paiement_loyer_hypotheque / 100 : ''}
                onChange={(e) => handleChange('paiement_loyer_hypotheque', parseInt(e.target.value || '0') * 100)}
                error={errors.paiement_loyer_hypotheque}
                min={0}
                placeholder="1200"
              />
              <ModernInput
                label="Autres prêts ($/mois)"
                type="number"
                icon={<DollarSign size={20} />}
                value={formData.autres_prets ? formData.autres_prets / 100 : ''}
                onChange={(e) => handleChange('autres_prets', parseInt(e.target.value || '0') * 100)}
                error={errors.autres_prets}
                min={0}
                placeholder="0"
              />
            </div>

            {/* Cartes de crédit et autres dettes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <ModernInput
                label="Cartes de crédit ($/mois)"
                type="number"
                icon={<CreditCard size={20} />}
                value={formData.cartes_credit ? formData.cartes_credit / 100 : ''}
                onChange={(e) => handleChange('cartes_credit', parseInt(e.target.value || '0') * 100)}
                error={errors.cartes_credit}
                min={0}
                placeholder="0"
              />
              <ModernInput
                label="Autres dettes ($/mois)"
                type="number"
                icon={<DollarSign size={20} />}
                value={formData.autres_dettes ? formData.autres_dettes / 100 : ''}
                onChange={(e) => handleChange('autres_dettes', parseInt(e.target.value || '0') * 100)}
                error={errors.autres_dettes}
                min={0}
                placeholder="0"
              />
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
            Continuer →
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}
