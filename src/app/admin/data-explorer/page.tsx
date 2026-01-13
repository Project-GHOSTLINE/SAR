'use client'

import { useState } from 'react'
import { Database, BarChart3 } from 'lucide-react'
import dynamic from 'next/dynamic'
import AdminNav from '@/components/admin/AdminNav'

// Import dynamique pour éviter les erreurs SSR
const MetricInspector = dynamic(
  () => import('@/app/admin/metric-inspector/page'),
  { ssr: false }
)

const DatabaseExplorer = dynamic(
  () => import('@/app/admin/database-explorer/page'),
  { ssr: false }
)

export default function DataExplorerPage() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'database'>('metrics')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Menu Admin fixe en haut */}
      <AdminNav currentPage="/admin/data-explorer" />

      {/* Header avec tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-20 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Data Explorer</h1>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${activeTab === 'metrics'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <BarChart3 className="w-5 h-5" />
              Metric Inspector
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${activeTab === 'database'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Database className="w-5 h-5" />
              Database Explorer
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        {activeTab === 'metrics' && <MetricInspector />}
        {activeTab === 'database' && <DatabaseExplorer />}
      </div>
    </div>
  )
}
