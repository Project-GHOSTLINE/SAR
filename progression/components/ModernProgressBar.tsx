'use client'

import { ProgressStep } from '@/types'
import { FileText, CheckCircle, Search, Send, ThumbsUp, PenTool, FileCheck, Rocket, ChevronRight } from 'lucide-react'

interface ModernProgressBarProps {
  steps: ProgressStep[]
  currentStep: number
}

const stepIcons = [FileText, CheckCircle, Search, Send, ThumbsUp, PenTool, FileCheck, Rocket]

export default function ModernProgressBar({ steps, currentStep }: ModernProgressBarProps) {
  const totalSteps = steps.length
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="w-full">
      {/* Version Desktop (masquée sur mobile) */}
      <div className="hidden lg:block">
        <div className="relative mb-16">
          {/* Ligne de fond */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-gradient-to-r from-indigo-200 via-blue-200 to-slate-200"></div>

          {/* Ligne de progression */}
          <div
            className="absolute top-6 left-6 h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 transition-all duration-1000"
            style={{ width: `calc((${currentStep}/${totalSteps}) * 100% - 48px)` }}
          ></div>

          {/* Étapes Desktop */}
          <div className="relative flex items-start justify-between">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep
              const Icon = stepIcons[index] || FileText

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-500 hover:scale-110 z-10
                      ${
                        isCompleted || isCurrent
                          ? 'bg-gradient-to-br from-indigo-500 to-blue-500 shadow-md shadow-indigo-200/50'
                          : 'bg-white border-2 border-slate-300 shadow-sm'
                      }
                      ${isCurrent ? 'from-indigo-500 to-blue-600 shadow-lg shadow-indigo-300/50 animate-pulse-soft' : ''}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isCompleted || isCurrent ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <div className="mt-3 text-xs font-medium text-center max-w-[100px]">
                    <p
                      className={`
                        ${isCurrent ? 'text-indigo-700 font-semibold' : ''}
                        ${isCompleted && !isCurrent ? 'text-slate-700' : ''}
                        ${!isCompleted && !isCurrent ? 'text-slate-400' : ''}
                      `}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Version Mobile (affichée uniquement sur mobile) */}
      <div className="lg:hidden space-y-3">
        {/* Barre de progression simple */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-600">
              Étape {currentStep + 1} sur {totalSteps}
            </span>
            <span className="text-xs font-semibold text-indigo-600">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 transition-all duration-1000 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Étapes sous forme de liste compacte */}
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const Icon = stepIcons[index] || FileText

          return (
            <div
              key={step.key}
              className={`
                flex items-center gap-3 p-3 rounded-xl transition-all duration-300
                ${isCurrent ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-300' : ''}
                ${isCompleted && !isCurrent ? 'bg-slate-50 border border-slate-200' : ''}
                ${!isCompleted && !isCurrent ? 'opacity-50' : ''}
              `}
            >
              {/* Icône */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${
                    isCompleted || isCurrent
                      ? 'bg-gradient-to-br from-indigo-500 to-blue-500'
                      : 'bg-slate-200'
                  }
                  ${isCurrent ? 'shadow-lg shadow-indigo-300/50 animate-pulse-soft' : ''}
                `}
              >
                <Icon className={`w-5 h-5 ${isCompleted || isCurrent ? 'text-white' : 'text-slate-400'}`} />
              </div>

              {/* Label */}
              <div className="flex-1">
                <p
                  className={`
                    text-sm font-medium
                    ${isCurrent ? 'text-indigo-700 font-semibold' : ''}
                    ${isCompleted && !isCurrent ? 'text-slate-700' : ''}
                    ${!isCompleted && !isCurrent ? 'text-slate-400' : ''}
                  `}
                >
                  {step.label}
                </p>
              </div>

              {/* Indicateur */}
              {isCompleted && !isCurrent && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              {isCurrent && <ChevronRight className="w-5 h-5 text-indigo-500 flex-shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* Bannière de statut (commune) */}
      <div className="mt-6 lg:mt-10 p-4 lg:p-5 rounded-xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200/50">
        <p className="text-center text-indigo-800 font-medium text-sm lg:text-base">
          ✨ {steps[currentStep]?.description}
        </p>
      </div>
    </div>
  )
}
