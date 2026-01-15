/**
 * Page Profil Client Complet
 * Exemple d'intégration de tous les composants
 */

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { TabsClient } from './TabsClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side, OK to use service_role
  )

  // Récupérer client et résumé
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) {
    notFound()
  }

  const { data: summary } = await supabase
    .from('vw_client_summary')
    .select('*')
    .eq('client_id', id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>📧 {client.primary_email}</span>
                {client.primary_phone && <span>📱 {client.primary_phone}</span>}
                {client.dob && (
                  <span>🎂 {new Date(client.dob).toLocaleDateString('fr-CA')}</span>
                )}
              </div>
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  client.status === 'active' ? 'bg-green-100 text-green-800'
                  : client.status === 'suspended' ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                ✏️ Modifier
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                📄 Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Stats Overview */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Applications"
              value={summary.applications_count}
              subtext={`${summary.applications_approved} approuvées`}
              icon="📝"
              color="blue"
            />
            <StatCard
              label="Loans"
              value={summary.loans_count}
              subtext={`${summary.loans_active} actifs`}
              icon="💰"
              color="green"
            />
            <StatCard
              label="Communications"
              value={summary.communications_count}
              subtext={summary.last_communication_at
                ? `Dernière: ${new Date(summary.last_communication_at).toLocaleDateString('fr-CA')}`
                : 'Aucune'}
              icon="📧"
              color="purple"
            />
            <StatCard
              label="VoPay"
              value={summary.vopay_transactions_count}
              subtext={`$${summary.vopay_total_successful?.toFixed(2) || '0.00'}`}
              icon="🏦"
              color="orange"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border rounded-lg">
          <TabsContent clientId={id} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, subtext, icon, color }: {
  label: string
  value: number
  subtext: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-green-50 text-green-900',
    purple: 'bg-purple-50 text-purple-900',
    orange: 'bg-orange-50 text-orange-900'
  }

  return (
    <div className={`rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      <div className="text-xs opacity-75 mt-1">{subtext}</div>
    </div>
  )
}

/**
 * Tabs Component (Client-side pour interactivité)
 * Doit être dans un fichier séparé ou utiliser le pattern ci-dessous
 */
function TabsContent({ clientId }: { clientId: string }) {
  return (
    <TabsClient clientId={clientId} />
  )
}
