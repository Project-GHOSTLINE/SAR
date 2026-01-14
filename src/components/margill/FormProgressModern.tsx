/**
 * 🎯 Form Progress - Version Ultra-Moderne 2026
 * Progress indicator avec animations Framer Motion
 */

'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface Step {
  number: number
  title: string
  description: string
}

const steps: Step[] = [
  { number: 1, title: 'Informations', description: 'Vos coordonnées' },
  { number: 2, title: 'Emploi', description: 'Situation professionnelle' },
  { number: 3, title: 'Prêt', description: 'Détails de votre demande' },
  { number: 4, title: 'Banque', description: 'Informations bancaires' },
  { number: 5, title: 'Révision', description: 'Vérification finale' },
]

interface FormProgressModernProps {
  currentStep: number
  completedSteps: Set<number>
}

export default function FormProgressModern({ currentStep, completedSteps }: FormProgressModernProps) {
  const progress = (currentStep / steps.length) * 100

  return (
    <div className="w-full mb-12">
      {/* Progress Bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-8">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between items-start">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.number)
          const isCurrent = currentStep === step.number
          const isUpcoming = currentStep < step.number

          return (
            <div key={step.number} className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <motion.div
                className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-transparent'
                    : isCurrent
                    ? 'bg-white dark:bg-gray-800 border-blue-500 shadow-lg shadow-blue-500/50'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  rotate: isCompleted ? 360 : 0,
                }}
                transition={{
                  scale: { duration: 0.3 },
                  rotate: { duration: 0.6, ease: 'easeOut' },
                }}
                whileHover={{ scale: 1.15 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, ease: 'backOut' }}
                  >
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                ) : (
                  <span
                    className={`text-lg font-semibold ${
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {step.number}
                  </span>
                )}

                {/* Pulse Animation for Current Step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-500"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </motion.div>

              {/* Step Info */}
              <motion.div
                className="mt-3 text-center"
                initial={false}
                animate={{
                  opacity: isUpcoming ? 0.5 : 1,
                  y: isCurrent ? -2 : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <p
                  className={`text-sm font-medium ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : isCompleted
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {step.description}
                </p>
              </motion.div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className="absolute top-6 left-1/2 w-full h-0.5 -z-10"
                  style={{ marginLeft: '24px', width: 'calc(100% - 48px)' }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: completedSteps.has(step.number) ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress Text */}
      <motion.div
        className="text-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Étape <span className="font-semibold text-blue-600">{currentStep}</span> sur{' '}
          {steps.length} • {Math.round(progress)}% complété
        </p>
      </motion.div>
    </div>
  )
}
