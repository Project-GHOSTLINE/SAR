/**
 * 🏦 Loan Application Form - Container Principal
 * Formulaire multi-étapes pour demande de prêt
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  LoanApplicationFormData,
  ValidationError,
} from '@/lib/types/titan'
import FormProgress from './FormProgress'
import Step1PersonalInfo from './steps/Step1PersonalInfo'
import Step2Employment from './steps/Step2Employment'
import Step3LoanDetails from './steps/Step3LoanDetails'
import Step4Banking from './steps/Step4Banking'
import Step5Review from './steps/Step5Review'

export interface FormStepState {
  currentStep: number
  completedSteps: Set<number>
  formData: Partial<LoanApplicationFormData>
  errors: Record<string, string>
}

export default function LoanApplicationForm({ origin }: { origin: 'argentrapide' | 'creditsecours' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<FormStepState>({
    currentStep: 1,
    completedSteps: new Set(),
    formData: {
      origin,
    },
    errors: {},
  })

  const updateFormData = (data: Partial<LoanApplicationFormData>) => {
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...data,
      },
      errors: {}, // Reset errors when data changes
    }))
  }

  const setErrors = (errors: Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      errors,
    }))
  }

  const nextStep = () => {
    // Ajouter l'étape actuelle aux complétées
    const newCompleted = new Set(state.completedSteps)
    newCompleted.add(state.currentStep)

    setState((prev) => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      completedSteps: newCompleted,
      errors: {},
    }))

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
      errors: {},
    }))

    // Scroll to top
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
        // Succès! Rediriger vers page de confirmation
        router.push(`/demande-de-pret/success?ref=${result.data.reference}`)
      } else {
        // Erreur
        if (result.errors) {
          // Erreurs de validation
          const errorMap: Record<string, string> = {}
          result.errors.forEach((err: ValidationError) => {
            errorMap[err.field] = err.message
          })
          setErrors(errorMap)
        } else {
          // Erreur générique
          alert(result.error || 'Une erreur est survenue. Veuillez réessayer.')
        }
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Erreur de connexion. Veuillez vérifier votre connexion internet.')
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    const commonProps = {
      formData: state.formData,
      errors: state.errors,
      updateFormData,
      setErrors,
      nextStep,
      prevStep,
    }

    switch (state.currentStep) {
      case 1:
        return <Step1PersonalInfo {...commonProps} />
      case 2:
        return <Step2Employment {...commonProps} />
      case 3:
        return <Step3LoanDetails {...commonProps} />
      case 4:
        return <Step4Banking {...commonProps} />
      case 5:
        return <Step5Review {...commonProps} onSubmit={handleSubmit} loading={loading} />
      default:
        return null
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <FormProgress
        currentStep={state.currentStep}
        totalSteps={5}
        completedSteps={state.completedSteps}
      />

      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mt-6">
        {renderStep()}
      </div>
    </div>
  )
}
