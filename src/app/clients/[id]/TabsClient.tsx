'use client'

import { useState } from 'react'
import { ClientTimeline, ClientTimelineStats } from '@/components/ClientTimeline'
import { VoPayStats } from '@/components/VoPayStats'
import { AuditHistory } from '@/components/AuditHistory'

export function TabsClient({ clientId }: { clientId: string }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'vopay' | 'audit'>('timeline')

  return (
    <>
      {/* Tab Headers */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-4 font-medium border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📅 Timeline
          </button>
          <button
            onClick={() => setActiveTab('vopay')}
            className={`px-6 py-4 font-medium border-b-2 transition ${
              activeTab === 'vopay'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🏦 VoPay
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-4 font-medium border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 Historique
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <ClientTimelineStats clientId={clientId} />
            <ClientTimeline clientId={clientId} limit={100} />
          </div>
        )}

        {activeTab === 'vopay' && (
          <VoPayStats clientId={clientId} />
        )}

        {activeTab === 'audit' && (
          <AuditHistory clientId={clientId} limit={50} />
        )}
      </div>
    </>
  )
}
