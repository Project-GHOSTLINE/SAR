/**
 * 🚀 Loan Application Form - Version Ultra-Moderne 2026
 * Formulaire avec animations Framer Motion, auto-save, micro-interactions
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, CheckCircle } from 'lucide-react'
import type { LoanApplicationFormData } from '@/lib/types/titan'
import FormProgressModern from './FormProgressModern'
import Step1Modern from './steps/Step1Modern'
import Step2Modern from './steps/Step2Modern'
import Step3Modern from './steps/Step3Modern'
import Step4Modern from './steps/Step4Modern'
import Step5Modern from './steps/Step5Modern'

export interface FormStepState {
  currentStep: number
  completedSteps: Set<number>
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
}

const AUTOSAVE_KEY = 'loan_application_autosave'
const AUTOSAVE_DELAY = 2000 // 2 secondes

export default function LoanApplicationFormModern({
  origin,
}: {
  origin: 'argentrapide' | 'creditsecours'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load from localStorage on mount
  const [state, setState] = useState<FormStepState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(AUTOSAVE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return {
            ...parsed,
            completedSteps: new Set(parsed.completedSteps || []),
            formData: { ...parsed.formData, origin },
          }
        } catch (e) {
          console.error('Failed to parse autosave:', e)
        }
      }
    }
    return {
      currentStep: 1,
      completedSteps: new Set(),
      formData: { origin },
      errors: {},
    }
  })

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        setAutoSaving(true)
        const saveData = {
          ...state,
          completedSteps: Array.from(state.completedSteps),
        }
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData))
        setLastSaved(new Date())
        setTimeout(() => setAutoSaving(false), 500)
      }
    }, AUTOSAVE_DELAY)

    return () => clearTimeout(timer)
  }, [state.formData])

  const updateFormData = (data: Partial<LoanApplicationFormData>) => {
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...data,
      },
      errors: {},
    }))
  }

  const setErrors = (errors: Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      errors,
    }))
  }

  const nextStep = () => {
    const newCompleted = new Set(state.completedSteps)
    newCompleted.add(state.currentStep)

    setState((prev) => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      completedSteps: newCompleted,
      errors: {},
    }))

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
      errors: {},
    }))

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.formData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Clear autosave
        localStorage.removeItem(AUTOSAVE_KEY)

        // Redirect to success page
        router.push(`/demande-de-pret/success?ref=${result.data.reference}`)
      } else {
        // Show errors
        if (result.errors) {
          const errorMap: Record<string, string> = {}
          result.errors.forEach((err: any) => {
            errorMap[err.field] = err.message
          })
          setErrors(errorMap)
        }
        setLoading(false)
      }
    } catch (error) {
      console.error('Submission error:', error)
      setErrors({ submit: 'Une erreur est survenue. Veuillez réessayer.' })
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Step1Modern
            formData={state.formData}
            errors={state.errors}
            onChange={updateFormData}
            onNext={nextStep}
          />
        )
      case 2:
        return (
          <Step2Modern
            formData={state.formData}
            errors={state.errors}
            onChange={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 3:
        return (
          <Step3Modern
            formData={state.formData}
            errors={state.errors}
            onChange={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 4:
        return (
          <Step4Modern
            formData={state.formData}
            errors={state.errors}
            onChange={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 5:
        return (
          <Step5Modern
            formData={state.formData}
            errors={state.errors}
            onSubmit={handleSubmit}
            onBack={prevStep}
            loading={loading}
          />
        )
      default:
        return <div className="text-center p-8">Step {state.currentStep}</div>
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Auto-save Indicator */}
      <AnimatePresence>
        {(autoSaving || lastSaved) && (
          <motion.div
            className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {autoSaving ? (
              <>
                <Save className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Sauvegarde...
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Sauvegardé {lastSaved?.toLocaleTimeString()}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Indicator */}
      <FormProgressModern
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
      />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.currentStep}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            <motion.div
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Envoi de votre demande...
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
