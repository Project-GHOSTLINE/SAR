/**
 * 📊 Form Progress Bar
 * Barre de progression pour le formulaire multi-étapes
 */

'use client'

import { Check } from 'lucide-react'

interface FormProgressProps {
  currentStep: number
  totalSteps: number
  completedSteps: Set<number>
}

const STEP_LABELS = [
  'Informations personnelles',
  'Emploi et revenus',
  'Détails du prêt',
  'Informations bancaires',
  'Révision',
]

export default function FormProgress({
  currentStep,
  totalSteps,
  completedSteps,
}: FormProgressProps) {
  return (
    <div className="w-full py-8">
      {/* Barre de progression visuelle */}
      <div className="relative">
        {/* Ligne de fond */}
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-300" />

        {/* Ligne de progression */}
        <div
          className="absolute top-5 left-0 h-1 bg-sar-orange transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />

        {/* Étapes */}
        <div className="relative flex justify-between">
          {Array.from({ length: totalSteps }, (_, i) => {
            const stepNumber = i + 1
            const isCompleted = completedSteps.has(stepNumber)
            const isCurrent = stepNumber === currentStep
            const isPast = stepNumber < currentStep

            return (
              <div
                key={stepNumber}
                className="flex flex-col items-center"
                style={{ width: `${100 / totalSteps}%` }}
              >
                {/* Cercle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300 relative z-10
                    ${
                      isCompleted || isPast
                        ? 'bg-sar-orange text-white'
                        : isCurrent
                        ? 'bg-sar-orange text-white ring-4 ring-orange-200'
                        : 'bg-white text-gray-400 border-2 border-gray-300'
                    }
                  `}
                >
                  {isCompleted && stepNumber !== currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{stepNumber}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    mt-2 text-xs text-center hidden sm:block
                    ${
                      isCurrent
                        ? 'text-sar-orange font-semibold'
                        : isCompleted || isPast
                        ? 'text-gray-700'
                        : 'text-gray-400'
                    }
                  `}
                  style={{ maxWidth: '120px' }}
                >
                  {STEP_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Label mobile (en dessous) */}
      <div className="block sm:hidden mt-4 text-center">
        <span className="text-sar-orange font-semibold">
          Étape {currentStep}: {STEP_LABELS[currentStep - 1]}
        </span>
      </div>
    </div>
  )
}
