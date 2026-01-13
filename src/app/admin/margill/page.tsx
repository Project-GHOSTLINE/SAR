'use client'

import AdminNav from '@/components/admin/AdminNav'
import { FileText, Clock } from 'lucide-react'

export default function MargillPage() {
  return (
    <>
      <AdminNav currentPage="/admin/margill" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-indigo-600" />
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Margill
            </h1>

            <p className="text-xl text-gray-600 mb-8">
              Gestion des échéanciers de paiement
            </p>

            <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-full">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Bientôt disponible</span>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Cette section sera ajoutée prochainement pour gérer les échéanciers de paiement Margill.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
