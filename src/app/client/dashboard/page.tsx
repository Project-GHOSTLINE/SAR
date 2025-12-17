'use client'

import { useState } from 'react'
import { LogOut, CreditCard, Clock, DollarSign, FileText, Phone, CheckCircle } from 'lucide-react'

export default function ClientDashboard() {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/client/logout', { method: 'POST' })
      window.location.href = '/client'
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
          <div>
            <h1 className="text-xl font-bold">Espace Client</h1>
            <p className="text-sm text-white/80">Solution Argent Rapide</p>
          </div>
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
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Bienvenue!</h2>
          <p className="text-gray-600">Consultez l'etat de votre dossier et vos informations de pret.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Credit approuve</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Solde restant</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Prochain paiement</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Paiements effectues</p>
                <p className="text-2xl font-bold text-gray-800">--</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="text-sar-green" size={20} />
              Mon dossier
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Statut</span>
                <span className="font-medium text-green-600">Actif</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Date d'ouverture</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Taux d'interet</span>
                <span className="font-medium">18.99%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Frequence de paiement</span>
                <span className="font-medium">Bihebdomadaire</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Phone className="text-sar-green" size={20} />
              Besoin d'aide?
            </h3>
            <p className="text-gray-600 mb-4">
              Notre equipe est disponible 24h/24 pour repondre a vos questions.
            </p>
            <div className="space-y-3">
              <a
                href="tel:5145891946"
                className="flex items-center justify-center gap-2 w-full bg-sar-green hover:bg-sar-green-dark text-white font-medium py-3 px-4 rounded-lg transition"
              >
                <Phone size={18} />
                514 589 1946
              </a>
              <a
                href="mailto:info@solutionargentrapide.ca"
                className="flex items-center justify-center gap-2 w-full border border-sar-green text-sar-green hover:bg-sar-green hover:text-white font-medium py-3 px-4 rounded-lg transition"
              >
                Envoyer un courriel
              </a>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Historique des paiements</h3>
          <div className="text-center py-8 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Aucun paiement enregistre pour le moment.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            Solution Argent Rapide - Tous droits reserves
          </p>
        </div>
      </footer>
    </div>
  )
}
