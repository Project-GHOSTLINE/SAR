'use client'

import LoanApplicationFormModern from '@/components/margill/LoanApplicationFormModern'

export default function CreditRequestPage() {
  return (
    <div className="py-12 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Demandez votre crédit
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Formulaire intelligent avec sauvegarde automatique
          </p>
        </div>

        <LoanApplicationFormModern origin="argentrapide" />
      </div>
    </div>
  )
}
