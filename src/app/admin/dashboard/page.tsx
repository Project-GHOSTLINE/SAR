'use client'

import { useState } from 'react'
import { LogOut, Users, FileText, Settings, Home } from 'lucide-react'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      window.location.href = '/admin'
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-sar-green text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Administration - Solution Argent Rapide</h1>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition"
          >
            <LogOut size={18} />
            {loading ? 'Deconnexion...' : 'Deconnexion'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stats Cards */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Demandes</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Approuvees</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Settings className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">En attente</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Home className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Visiteurs</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bienvenue dans l'administration</h3>
          <p className="text-gray-600">
            Ce tableau de bord vous permet de gerer les demandes de credit et de suivre l'activite du site.
            Les fonctionnalites seront ajoutees progressivement.
          </p>
        </div>
      </main>
    </div>
  )
}
