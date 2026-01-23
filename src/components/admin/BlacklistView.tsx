'use client'

import { useState } from 'react'
import {
  Shield, Search, AlertTriangle, DollarSign, TrendingDown, Activity, Database
} from 'lucide-react'

export default function BlacklistView() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="text-red-600" size={28} />
            </div>
            Blacklist OSINT
          </h1>
          <p className="mt-2 text-gray-600">
            Intelligence sur la fraude et gestion des clients à risque
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={<DollarSign size={24} />}
          label="Total fraude (montant)"
          value="N/A"
          color="red"
        />
        <StatCard
          icon={<TrendingDown size={24} />}
          label="Non remboursé"
          value="N/A"
          color="orange"
        />
        <StatCard
          icon={<TrendingDown size={24} />}
          label="Récupéré"
          value="N/A"
          color="green"
        />
        <StatCard
          icon={<Activity size={24} />}
          label="Cas actifs"
          value="N/A"
          color="blue"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            disabled
          >
            <Search size={20} />
            Rechercher
          </button>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Database size={20} />
            Cas récents
          </h2>
        </div>

        {/* Empty State */}
        <div className="py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-gray-400" size={40} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Les données de la blacklist OSINT ne sont pas configurées. Veuillez créer la table <code className="bg-gray-100 px-2 py-1 rounded">fraud_cases</code> dans Supabase pour activer cette fonctionnalité.
          </p>

          {/* Configuration Notice */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="text-yellow-600" size={20} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Configuration requise</h4>
                <div className="text-sm text-yellow-700">
                  <p className="mb-2">Pour activer la blacklist OSINT, créez la table suivante dans Supabase:</p>
                  <pre className="bg-yellow-100 p-3 rounded text-xs overflow-x-auto">
{`CREATE TABLE fraud_cases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  reason TEXT NOT NULL,
  fraud_amount NUMERIC DEFAULT 0,
  amount_recovered NUMERIC DEFAULT 0,
  status TEXT CHECK (status IN ('blacklisted', 'watchlist', 'cleared')),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  confidence INTEGER,
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ
);`}
                  </pre>
                  <p className="mt-2">
                    Puis créez l'API route <code className="bg-yellow-100 px-1 rounded">src/app/api/admin/blacklist/route.ts</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: 'red' | 'orange' | 'green' | 'blue'
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-400">{value}</p>
    </div>
  )
}
