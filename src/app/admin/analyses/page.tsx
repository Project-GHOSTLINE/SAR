'use client'

import AdminNav from '@/components/admin/AdminNav'
import AnalysesView from '@/components/admin/AnalysesView'

export default function AnalysesPage() {
  return (
    <>
      <AdminNav currentPage="/admin/analyses" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AnalysesView />
        </div>
      </div>
    </>
  )
}
