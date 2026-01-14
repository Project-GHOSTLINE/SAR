/**
 * 💼 Step 2 - Emploi et Revenus
 */

'use client'

import { motion } from 'framer-motion'
import { Briefcase, Building, DollarSign, Calendar, Wallet } from 'lucide-react'
import { ModernInput, ModernSelect } from '../ModernInput'
import type { LoanApplicationFormData } from '@/lib/types/titan'

interface Step2ModernProps {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  onChange: (data: Partial<LoanApplicationFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2Modern({ formData, errors, onChange, onNext, onBack }: Step2ModernProps) {
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
          Situation Professionnelle
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Parlez-nous de votre emploi et vos revenus
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Statut Emploi */}
          <ModernSelect
            label="Statut d'emploi"
            icon={<Briefcase size={20} />}
            value={formData.statut_emploi || ''}
            onChange={(e) => handleChange('statut_emploi', e.target.value)}
            error={errors.statut_emploi}
            required
            options={[
              { value: 'salarie', label: 'Salarié' },
              { value: 'autonome', label: 'Travailleur autonome' },
              { value: 'retraite', label: 'Retraité' },
              { value: 'sans_emploi', label: 'Sans emploi' },
            ]}
          />

          {/* Employeur et Poste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernInput
              label="Employeur"
              icon={<Building size={20} />}
              value={formData.employeur || ''}
              onChange={(e) => handleChange('employeur', e.target.value)}
              error={errors.employeur}
            />
            <ModernInput
              label="Poste occupé"
              icon={<Briefcase size={20} />}
              value={formData.poste || ''}
              onChange={(e) => handleChange('poste', e.target.value)}
              error={errors.poste}
            />
          </div>

          {/* Revenu annuel */}
          <ModernInput
            label="Revenu annuel brut"
            type="number"
            icon={<DollarSign size={20} />}
            value={formData.revenu_annuel ? formData.revenu_annuel / 100 : ''}
            onChange={(e) => handleChange('revenu_annuel', parseInt(e.target.value) * 100)}
            error={errors.revenu_annuel}
            required
            min={0}
            placeholder="50000"
            helpText="Votre salaire annuel avant impôts"
          />

          {/* Ancienneté et Fréquence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernInput
              label="Ancienneté (mois)"
              type="number"
              icon={<Calendar size={20} />}
              value={formData.anciennete_emploi_mois || ''}
              onChange={(e) => handleChange('anciennete_emploi_mois', parseInt(e.target.value))}
              error={errors.anciennete_emploi_mois}
              required
              min={0}
            />
            <ModernSelect
              label="Fréquence de paie"
              icon={<Wallet size={20} />}
              value={formData.frequence_paie || ''}
              onChange={(e) => handleChange('frequence_paie', e.target.value)}
              error={errors.frequence_paie}
              required
              options={[
                { value: 'hebdomadaire', label: 'Hebdomadaire' },
                { value: 'bi_hebdomadaire', label: 'Aux 2 semaines' },
                { value: 'mensuel', label: 'Mensuel' },
              ]}
            />
          </div>

          {/* Prochaine paie */}
          <ModernInput
            label="Prochaine date de paie"
            type="date"
            icon={<Calendar size={20} />}
            value={formData.prochaine_paie || ''}
            onChange={(e) => handleChange('prochaine_paie', e.target.value)}
            error={errors.prochaine_paie}
            required
          />

          {/* Autres revenus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernInput
              label="Autres revenus (annuel)"
              type="number"
              icon={<DollarSign size={20} />}
              value={formData.autres_revenus ? formData.autres_revenus / 100 : ''}
              onChange={(e) => handleChange('autres_revenus', parseInt(e.target.value || '0') * 100)}
              error={errors.autres_revenus}
              min={0}
              placeholder="0"
              helpText="Revenus de location, investissements, etc."
            />
            <ModernInput
              label="Source des autres revenus"
              value={formData.source_autres_revenus || ''}
              onChange={(e) => handleChange('source_autres_revenus', e.target.value)}
              error={errors.source_autres_revenus}
              placeholder="Ex: Revenus locatifs"
            />
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
