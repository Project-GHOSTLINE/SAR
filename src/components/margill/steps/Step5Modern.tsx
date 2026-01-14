/**
 * ✅ Step 5 - Révision et Soumission
 */

'use client'

import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Send } from 'lucide-react'
import type { LoanApplicationFormData } from '@/lib/types/titan'

interface Step5ModernProps {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  onSubmit: () => void
  onBack: () => void
  loading?: boolean
}

export default function Step5Modern({
  formData,
  errors,
  onSubmit,
  onBack,
  loading = false,
}: Step5ModernProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <motion.div
      className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500" />
        {title}
      </h3>
      <div className="space-y-2 text-gray-700 dark:text-gray-300">{children}</div>
    </motion.div>
  )

  const Field = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <span className="text-gray-600 dark:text-gray-400">{label}:</span>
      <span className="font-medium">{value || 'Non spécifié'}</span>
    </div>
  )

  return (
    <motion.div
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 md:p-12"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Révision de Votre Demande
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Vérifiez vos informations avant de soumettre
        </p>
      </div>

      {/* Error Banner */}
      {errors.submit && (
        <motion.div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200">Erreur de soumission</p>
            <p className="text-sm text-red-600 dark:text-red-300">{errors.submit}</p>
          </div>
        </motion.div>
      )}

      {/* Montant Demandé - Highlight */}
      <motion.div
        className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 mb-6 text-white text-center"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-lg opacity-90 mb-2">Montant Demandé</p>
        <p className="text-5xl font-bold">
          {formatCurrency(formData.montant_demande || 0)}
        </p>
        {formData.duree_pret_mois && (
          <p className="text-sm opacity-80 mt-2">
            sur {formData.duree_pret_mois} mois
          </p>
        )}
      </motion.div>

      {/* Sections */}
      <Section title="Informations Personnelles">
        <Field label="Nom complet" value={`${formData.prenom} ${formData.nom}`} />
        <Field label="Courriel" value={formData.courriel} />
        <Field label="Téléphone" value={formData.telephone} />
        <Field
          label="Date de naissance"
          value={formData.date_naissance ? formatDate(formData.date_naissance) : undefined}
        />
        <Field
          label="Adresse"
          value={`${formData.adresse_rue}, ${formData.adresse_ville}, ${formData.adresse_province} ${formData.adresse_code_postal}`}
        />
        <Field label="Type de logement" value={formData.type_logement} />
      </Section>

      <Section title="Situation Professionnelle">
        <Field label="Statut" value={formData.statut_emploi} />
        <Field label="Employeur" value={formData.employeur} />
        <Field label="Poste" value={formData.poste} />
        <Field
          label="Revenu annuel"
          value={formData.revenu_annuel ? formatCurrency(formData.revenu_annuel) : undefined}
        />
        <Field
          label="Ancienneté"
          value={formData.anciennete_emploi_mois ? `${formData.anciennete_emploi_mois} mois` : undefined}
        />
      </Section>

      <Section title="Dettes Mensuelles">
        <Field
          label="Loyer/Hypothèque"
          value={formData.paiement_loyer_hypotheque ? formatCurrency(formData.paiement_loyer_hypotheque) : undefined}
        />
        <Field
          label="Autres prêts"
          value={formData.autres_prets ? formatCurrency(formData.autres_prets) : undefined}
        />
        <Field
          label="Cartes de crédit"
          value={formData.cartes_credit ? formatCurrency(formData.cartes_credit) : undefined}
        />
      </Section>

      <Section title="Informations Bancaires">
        <Field label="Institution" value={formData.institution_financiere} />
        <Field label="Transit" value={formData.transit} />
        <Field label="Type de compte" value={formData.type_compte} />
      </Section>

      {/* Consent */}
      <motion.div
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          En soumettant cette demande, vous confirmez que toutes les informations fournies
          sont exactes et vous acceptez nos conditions d'utilisation et notre politique de
          confidentialité.
        </p>
      </motion.div>

      {/* Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <motion.button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50"
          whileHover={{ scale: loading ? 1 : 1.05 }}
          whileTap={{ scale: loading ? 1 : 0.95 }}
        >
          ← Retour
        </motion.button>

        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold
            hover:from-green-600 hover:to-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2"
          whileHover={{ scale: loading ? 1 : 1.05 }}
          whileTap={{ scale: loading ? 1 : 0.95 }}
        >
          {loading ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Soumettre ma demande
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
