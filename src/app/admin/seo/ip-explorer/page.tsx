'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Search, MapPin, Loader2, ArrowRight, TrendingUp } from 'lucide-react'

export default function IpExplorerPage() {
  const router = useRouter()
  const [ipInput, setIpInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recentIps, setRecentIps] = useState<string[]>([
    '142.127.223.188',
    '192.0.2.44',
    '198.51.100.21'
  ])

  const handleSearch = async (ip: string) => {
    if (!ip.trim()) return

    setLoading(true)

    // Navigate to IP dossier page
    router.push(`/admin/seo/ip/${ip.trim()}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(ipInput)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <AdminNav currentPage="/admin/seo/ip-explorer" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-4">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">IP Explorer</h1>
          <p className="text-lg text-gray-600">
            Recherchez une adresse IP pour voir son dossier complet
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Entrez une adresse IP (ex: 192.0.2.44)"
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              disabled={loading}
            />
            <button
              onClick={() => handleSearch(ipInput)}
              disabled={loading || !ipInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  Rechercher
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Formats acceptés:</span> IPv4 (192.0.2.44), IPv6 (2001:db8::1)
          </div>
        </div>

        {/* Recent IPs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            IPs Récentes
          </h2>
          <div className="space-y-2">
            {recentIps.map((ip) => (
              <button
                key={ip}
                onClick={() => handleSearch(ip)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all group"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  <span className="font-mono text-sm text-gray-900">{ip}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="text-blue-600 font-bold text-2xl mb-1">1000+</div>
            <div className="text-blue-800 text-sm">IPs trackées</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="text-green-600 font-bold text-2xl mb-1">20+</div>
            <div className="text-green-800 text-sm">Métriques par IP</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="text-purple-600 font-bold text-2xl mb-1">30d</div>
            <div className="text-purple-800 text-sm">Historique par défaut</div>
          </div>
        </div>
      </main>
    </div>
  )
}
