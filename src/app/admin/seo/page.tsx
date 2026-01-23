'use client'

import AdminNav from '@/components/admin/AdminNav'
import SEOView from '@/components/admin/SEOView'

export default function SEOPage() {
  // Auth is handled by middleware - no need for client-side checks

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <AdminNav currentPage="/admin/seo" />
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <SEOView />
      </main>
    </div>
  )
}
