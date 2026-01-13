'use client'

import AdminNav from '@/components/admin/AdminNav'
import VoPayDashboard from '@/components/admin/VoPayDashboard'

export default function VoPayPage() {
  return (
    <>
      <AdminNav currentPage="/admin/vopay" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <VoPayDashboard />
        </div>
      </div>
    </>
  )
}
