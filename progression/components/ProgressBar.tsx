'use client'

import { ProgressStep } from '@/types'
import { Check } from 'lucide-react'

interface ProgressBarProps {
  steps: ProgressStep[]
  currentStep: number
}

export default function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep

          return (
            <div key={step.key} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-300 z-10
                    ${isCompleted ? 'bg-sar-green text-white' : ''}
                    ${isCurrent ? 'bg-sar-green text-white ring-4 ring-sar-green/30 scale-110' : ''}
                    ${isUpcoming ? 'bg-gray-200 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check size={24} />
                  ) : (
                    <span className="font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p
                    className={`
                      text-sm font-semibold
                      ${isCurrent ? 'text-sar-green' : ''}
                      ${isCompleted ? 'text-gray-700' : ''}
                      ${isUpcoming ? 'text-gray-400' : ''}
                    `}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className="absolute top-6 left-1/2 w-full h-1 -z-0"
                  style={{ transform: 'translateY(-50%)' }}
                >
                  <div
                    className={`
                      h-full transition-all duration-500
                      ${index < currentStep ? 'bg-sar-green' : 'bg-gray-200'}
                    `}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current step description */}
      <div className="text-center p-4 bg-sar-green/10 rounded-lg">
        <p className="text-sar-green-dark font-medium">
          {steps[currentStep]?.description}
        </p>
      </div>
    </div>
  )
}
