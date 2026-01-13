'use client'

import AdminNav from '@/components/admin/AdminNav'
import BlacklistView from '@/components/admin/BlacklistView'

export default function BlacklistPage() {
  return (
    <>
      <AdminNav currentPage="/admin/blacklist" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BlacklistView />
        </div>
      </div>
    </>
  )
}
