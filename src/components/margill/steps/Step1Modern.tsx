/**
 * 📝 Step 1 - Version Ultra-Moderne
 * Informations personnelles avec animations et micro-interactions
 */

'use client'

import { motion } from 'framer-motion'
import { User, Mail, Phone, Calendar, Home, MapPin } from 'lucide-react'
import { ModernInput, ModernSelect } from '../ModernInput'
import type { LoanApplicationFormData } from '@/lib/types/titan'

interface Step1ModernProps {
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
  onChange: (data: Partial<LoanApplicationFormData>) => void
  onNext: () => void
  onBack?: () => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

export default function Step1Modern({
  formData,
  errors,
  onChange,
  onNext,
}: Step1ModernProps) {
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
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Informations Personnelles
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Commençons par vos coordonnées de base
        </p>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <ModernInput
                label="Prénom"
                icon={<User size={20} />}
                value={formData.prenom || ''}
                onChange={(e) => handleChange('prenom', e.target.value)}
                error={errors.prenom}
                required
                autoComplete="given-name"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernInput
                label="Nom de famille"
                icon={<User size={20} />}
                value={formData.nom || ''}
                onChange={(e) => handleChange('nom', e.target.value)}
                error={errors.nom}
                required
                autoComplete="family-name"
              />
            </motion.div>
          </div>

          {/* Email et Téléphone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <ModernInput
                label="Adresse courriel"
                type="email"
                icon={<Mail size={20} />}
                value={formData.courriel || ''}
                onChange={(e) => handleChange('courriel', e.target.value)}
                error={errors.courriel}
                required
                autoComplete="email"
                helpText="Nous vous enverrons une confirmation"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernInput
                label="Téléphone"
                type="tel"
                icon={<Phone size={20} />}
                value={formData.telephone || ''}
                onChange={(e) => handleChange('telephone', e.target.value)}
                error={errors.telephone}
                required
                autoComplete="tel"
                placeholder="(514) 123-4567"
              />
            </motion.div>
          </div>

          {/* Date de naissance */}
          <motion.div variants={itemVariants}>
            <ModernInput
              label="Date de naissance"
              type="date"
              icon={<Calendar size={20} />}
              value={formData.date_naissance || ''}
              onChange={(e) => handleChange('date_naissance', e.target.value)}
              error={errors.date_naissance}
              required
            />
          </motion.div>

          {/* Adresse */}
          <motion.div variants={itemVariants}>
            <ModernInput
              label="Adresse complète"
              icon={<Home size={20} />}
              value={formData.adresse_rue || ''}
              onChange={(e) => handleChange('adresse_rue', e.target.value)}
              error={errors.adresse_rue}
              required
              autoComplete="street-address"
              placeholder="123 Rue Example"
            />
          </motion.div>

          {/* Ville, Province, Code Postal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants}>
              <ModernInput
                label="Ville"
                icon={<MapPin size={20} />}
                value={formData.adresse_ville || ''}
                onChange={(e) => handleChange('adresse_ville', e.target.value)}
                error={errors.adresse_ville}
                required
                autoComplete="address-level2"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernSelect
                label="Province"
                icon={<MapPin size={20} />}
                value={formData.adresse_province || ''}
                onChange={(e) => handleChange('adresse_province', e.target.value)}
                error={errors.adresse_province}
                required
                options={[
                  { value: 'QC', label: 'Québec' },
                  { value: 'ON', label: 'Ontario' },
                  { value: 'BC', label: 'Colombie-Britannique' },
                  { value: 'AB', label: 'Alberta' },
                  { value: 'MB', label: 'Manitoba' },
                  { value: 'SK', label: 'Saskatchewan' },
                  { value: 'NS', label: 'Nouvelle-Écosse' },
                  { value: 'NB', label: 'Nouveau-Brunswick' },
                  { value: 'NL', label: 'Terre-Neuve-et-Labrador' },
                  { value: 'PE', label: 'Île-du-Prince-Édouard' },
                ]}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernInput
                label="Code postal"
                value={formData.adresse_code_postal || ''}
                onChange={(e) => handleChange('adresse_code_postal', e.target.value.toUpperCase())}
                error={errors.adresse_code_postal}
                required
                autoComplete="postal-code"
                placeholder="H1A 1A1"
                maxLength={7}
              />
            </motion.div>
          </div>

          {/* Durée de résidence et Type de logement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <ModernInput
                label="Durée de résidence (mois)"
                type="number"
                value={formData.duree_residence_mois || ''}
                onChange={(e) => handleChange('duree_residence_mois', parseInt(e.target.value))}
                error={errors.duree_residence_mois}
                required
                min={0}
                helpText="Depuis combien de temps habitez-vous à cette adresse?"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <ModernSelect
                label="Type de logement"
                icon={<Home size={20} />}
                value={formData.type_logement || ''}
                onChange={(e) => handleChange('type_logement', e.target.value)}
                error={errors.type_logement}
                required
                options={[
                  { value: 'proprietaire', label: 'Propriétaire' },
                  { value: 'locataire', label: 'Locataire' },
                  { value: 'autre', label: 'Autre' },
                ]}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="flex justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold
              hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-4 focus:ring-blue-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continuer →
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  )
}
