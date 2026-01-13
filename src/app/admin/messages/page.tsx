'use client'

import AdminNav from '@/components/admin/AdminNav'
import MessagesView from '@/components/admin/MessagesView'

export default function MessagesPage() {
  return (
    <>
      <AdminNav currentPage="/admin/messages" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <MessagesView />
        </div>
      </div>
    </>
  )
}
