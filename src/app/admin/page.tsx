'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('[Admin Login] Starting login process...')

    try {
      console.log('[Admin Login] Fetching /api/admin/login...')
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()
      console.log('[Admin Login] Response:', { ok: res.ok, data })

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de connexion')
      }

      console.log('[Admin Login] Login successful, redirecting to /admin/dashboard')
      router.push('/admin/dashboard')
    } catch (err) {
      console.error('[Admin Login] Error:', err)
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00874e] rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">$</span>
            </div>
            <span className="text-[#003d2c] text-xl font-semibold">Solution Argent Rapide</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-[#f7f7f7]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="max-w-md mx-auto">
            {/* Title */}
            <h1 className="text-[#003d2c] text-2xl font-semibold mb-2">
              Portail administrateur
            </h1>
            <p className="text-gray-600 mb-8">
              Connectez-vous pour accéder au tableau de bord
            </p>

            {/* Login Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="w-12 h-12 bg-[#e8f5e9] rounded-full flex items-center justify-center">
                  <Lock size={22} className="text-[#00874e]" />
                </div>
                <div>
                  <h2 className="text-gray-900 font-semibold">Connexion sécurisée</h2>
                  <p className="text-gray-500 text-sm">Accès réservé aux administrateurs</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6" data-hydrated="true">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    className="w-full px-4 py-3 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00874e] focus:border-[#00874e] transition-all"
                    autoFocus
                    required
                    data-testid="admin-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#00874e] hover:bg-[#006d3f] text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  data-testid="admin-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>
            </div>

            {/* Security Info */}
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
              <Lock size={12} />
              <span>Connexion chiffrée SSL/TLS</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Solution Argent Rapide. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}
