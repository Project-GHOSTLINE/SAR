'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, TrendingUp, Users, MousePointer, Search, Link2, RefreshCw } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

export default function SEOPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav currentPage="/admin/seo" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Métriques SEO</h1>
          <p className="mt-2 text-gray-600">
            Tableau de bord complet des performances SEO de Solution Argent Rapide
          </p>
        </div>

        {/* Google Analytics 4 Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Google Analytics 4</h2>
                <p className="text-sm text-gray-500">Données agrégées des 30 derniers jours</p>
              </div>
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>30 derniers jours</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <MetricCard
              icon={<Users size={20} />}
              label="Utilisateurs"
              value="N/A"
              trend={null}
              color="blue"
            />
            <MetricCard
              icon={<MousePointer size={20} />}
              label="Sessions"
              value="N/A"
              trend={null}
              color="green"
            />
            <MetricCard
              icon={<TrendingUp size={20} />}
              label="Taux d'engagement"
              value="N/A"
              trend={null}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<TrendingUp size={20} />}
              label="Conversions"
              value="N/A"
              trend={null}
              color="orange"
            />
            <MetricCard
              icon={<Search size={20} />}
              label="Trafic organique"
              value="N/A"
              trend={null}
              color="indigo"
            />
            <MetricCard
              icon={<MousePointer size={20} />}
              label="Mobile"
              value="N/A"
              trend={null}
              color="green"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              ⚠️ Données non disponibles - Credentials Google Analytics non configurés
            </p>
          </div>
        </div>

        {/* Google Search Console Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Search className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Google Search Console</h2>
                <p className="text-sm text-gray-500">Données agrégées des 30 derniers jours</p>
              </div>
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>30 derniers jours</option>
            </select>
          </div>

          <div className="py-12 text-center">
            <Search className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-600 font-medium">Aucune donnée disponible pour cette période</p>
            <p className="text-sm text-gray-500 mt-2">
              API Google Search Console non configurée
            </p>
          </div>
        </div>

        {/* Semrush Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Link2 className="text-orange-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Semrush</h2>
                <p className="text-sm text-gray-500">Données agrégées des 30 derniers jours</p>
              </div>
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>30 derniers jours</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Search size={20} />}
              label="Mots-clés organiques"
              value="N/A"
              trend={null}
              color="blue"
            />
            <MetricCard
              icon={<TrendingUp size={20} />}
              label="Authority Score"
              value="N/A"
              trend={null}
              color="purple"
            />
            <MetricCard
              icon={<BarChart3 size={20} />}
              label="Trafic organique"
              value="N/A"
              trend={null}
              color="green"
            />
            <MetricCard
              icon={<Link2 size={20} />}
              label="Backlinks"
              value="N/A"
              trend={null}
              color="orange"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              ⚠️ Données non disponibles - API Semrush non configurée
            </p>
          </div>
        </div>

        {/* Configuration Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Configuration requise</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Pour afficher les vraies données SEO, veuillez configurer:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Google Analytics 4: <code className="bg-yellow-100 px-1 rounded">GA_SERVICE_ACCOUNT_JSON</code> dans .env.local</li>
                  <li>Google Search Console: Service Account avec accès Search Console</li>
                  <li>Semrush: <code className="bg-yellow-100 px-1 rounded">SEMRUSH_API_KEY</code> dans .env.local</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend: number | null
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo'
}

function MetricCard({ icon, label, value, trend, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-400">{value}</span>
        {trend !== null && (
          <span className={`text-xs flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}
