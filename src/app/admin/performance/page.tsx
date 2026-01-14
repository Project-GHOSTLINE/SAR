'use client'

import AdminNav from '@/components/admin/AdminNav'

export default function PerformanceDiagnosticPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/performance" />
      <div style={{ paddingTop: '80px', height: '100vh' }}>
        <iframe
          src="/performance-diagnostic.html"
          style={{
            width: '100%',
            height: 'calc(100vh - 80px)',
            border: 'none'
          }}
          title="Performance Diagnostic"
        />
      </div>
    </div>
  )
}
