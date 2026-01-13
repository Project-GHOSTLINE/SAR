'use client'

import AdminNav from '@/components/admin/AdminNav'
import SupportView from '@/components/admin/SupportView'

export default function SupportPage() {
  return (
    <>
      <AdminNav currentPage="/admin/support" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SupportView />
        </div>
      </div>
    </>
  )
}
