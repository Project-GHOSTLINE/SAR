/**
 * Page: partners.* root (/)
 *
 * PROTECTION: Formulaire de connexion avec mot de passe
 * - Si non connecté: affiche formulaire login
 * - Si connecté: redirige vers /dashboard
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnersRootPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/partners/check-session')
      if (response.ok) {
        // Déjà authentifié - rediriger vers dashboard
        router.push('/partners/dashboard')
      } else {
        // Non authentifié - afficher le formulaire
        setIsAuthenticated(false)
        setIsChecking(false)
      }
    } catch (error) {
      setIsAuthenticated(false)
      setIsChecking(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/partners/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Connexion réussie - rediriger vers dashboard
        router.push('/partners/dashboard')
      } else {
        setError(data.error || 'Mot de passe incorrect')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  // Afficher loader pendant vérification
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification...</p>
        </div>
      </div>
    )
  }

  // Afficher formulaire de connexion
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Accès Partenaire
            </h1>
            <p className="text-sm text-gray-600">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Entrez le mot de passe"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Accès réservé aux partenaires autorisés
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
