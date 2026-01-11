'use client'

import { useState, useEffect } from 'react'
import { Copy, RefreshCw, Key, CheckCircle, AlertCircle } from 'lucide-react'
import AdminNav from '@/components/admin/AdminNav'

export default function ExtensionTokenPage() {
  const [token, setToken] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer le token depuis le cookie admin-session
    const cookies = document.cookie.split(';')
    const adminSessionCookie = cookies.find(c => c.trim().startsWith('admin-session='))

    if (adminSessionCookie) {
      const tokenValue = adminSessionCookie.split('=')[1]
      setToken(tokenValue)
    }

    setLoading(false)
  }, [])

  const copyToken = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshToken = () => {
    // Rafraîchir la page pour recharger le cookie
    window.location.reload()
  }

  if (loading) {
    return (
      <>
        <AdminNav currentPage="/admin/extension-token" />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="animate-pulse bg-gray-200 h-64 rounded-2xl"></div>
        </div>
      </>
    )
  }

  if (!token) {
    return (
      <>
        <AdminNav currentPage="/admin/extension-token" />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle size={56} className="text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Session non trouvée</h2>
            <p className="text-lg text-red-700 mb-6">
              Impossible de récupérer votre token. Vous n'êtes peut-être pas connecté.
            </p>
            <button
              onClick={() => window.location.href = '/admin'}
              className="px-8 py-4 bg-red-600 text-white text-lg rounded-xl hover:bg-red-700 transition-colors"
            >
              Retour au Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNav currentPage="/admin/extension-token" />
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Token d'Extension</h1>
        <p className="text-lg text-gray-600 mt-2">
          Pour l'extension Chrome IBV Crawler V1
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header with Icon */}
        <div className="bg-gradient-to-r from-[#00874e] to-emerald-600 p-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Key size={40} className="text-white" />
            </div>
            <div className="text-white">
              <h2 className="text-3xl font-bold">Votre Token d'Authentification</h2>
              <p className="text-lg text-emerald-100">Utilisez ce token pour configurer l'extension</p>
            </div>
          </div>
        </div>

        {/* Token Display */}
        <div className="p-8">
          <div className="mb-8">
            <label className="block text-base font-medium text-gray-700 mb-4">
              Token Bearer (JWT)
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={token}
                  readOnly
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-lg font-mono text-base text-gray-900 pr-14"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {copied && (
                    <CheckCircle size={24} className="text-green-500" />
                  )}
                </div>
              </div>
              <button
                onClick={copyToken}
                className="px-8 py-4 bg-[#00874e] text-white text-lg rounded-lg hover:bg-[#00653a] transition-colors flex items-center gap-3 font-medium shadow-lg hover:shadow-xl"
              >
                <Copy size={22} />
                {copied ? 'Copié!' : 'Copier'}
              </button>
              <button
                onClick={refreshToken}
                className="px-5 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Rafraîchir le token"
              >
                <RefreshCw size={22} />
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 mb-8">
            <h3 className="font-bold text-xl text-blue-900 mb-6 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              Instructions d'installation
            </h3>
            <ol className="list-decimal list-inside space-y-4 text-lg text-blue-800">
              <li className="font-medium">
                Copiez le token ci-dessus (bouton "Copier")
              </li>
              <li className="font-medium">
                Ouvrez l'extension Chrome "IBV Crawler V1"
                <p className="text-base text-blue-600 mt-2 ml-6">
                  Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
                </p>
              </li>
              <li className="font-medium">
                Collez le token dans le champ "Token d'Authentification"
              </li>
              <li className="font-medium">
                Cliquez sur "Sauvegarder"
              </li>
              <li className="font-medium">
                Retournez sur votre page Inverite et testez!
              </li>
            </ol>
          </div>

          {/* Token Info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-base text-gray-600 mb-2">Longueur du token</p>
              <p className="text-3xl font-bold text-gray-900">{token.length} caractères</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-base text-gray-600 mb-2">Type</p>
              <p className="text-3xl font-bold text-gray-900">JWT Bearer</p>
            </div>
          </div>

          {/* Warnings */}
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex gap-4">
                <AlertCircle size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-lg text-yellow-900 mb-2">⚠️ Important - Expiration du token</p>
                  <p className="text-base text-yellow-800">
                    Ce token expire lorsque vous vous <strong>déconnectez</strong> du dashboard.
                    Vous devrez générer un nouveau token après chaque nouvelle connexion.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex gap-4">
                <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-lg text-red-900 mb-2">🔒 Sécurité</p>
                  <p className="text-base text-red-800">
                    Ne partagez <strong>JAMAIS</strong> ce token avec qui que ce soit.
                    Ce token donne accès complet à l'API admin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border border-gray-200">
        <h3 className="font-bold text-xl text-gray-900 mb-4">💡 Besoin d'aide?</h3>
        <div className="space-y-3 text-base text-gray-700">
          <p>
            <strong>Q: L'extension ne fonctionne pas?</strong><br />
            R: Vérifiez que vous avez bien collé le token ET cliqué sur "Sauvegarder"
          </p>
          <p>
            <strong>Q: Erreur "Token invalide"?</strong><br />
            R: Revenez sur cette page et générez un nouveau token
          </p>
          <p>
            <strong>Q: Où trouver l'extension?</strong><br />
            R: Cliquez sur l'icône puzzle (🧩) dans Chrome, puis "IBV Crawler V1"
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
