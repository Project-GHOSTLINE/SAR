'use client'

import AdminNav from '@/components/admin/AdminNav'
import ClientsSARView from '@/components/admin/ClientsSARView'

export default function ClientsSARPage() {
  return (
    <>
      <AdminNav currentPage="/admin/clients-sar" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ClientsSARView />
        </div>
      </div>
    </>
  )
}
