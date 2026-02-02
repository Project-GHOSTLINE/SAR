/**
 * Page: partners.* root (/)
 *
 * PROTECTION: Vérifie authentification
 * - Si connecté: redirige vers /dashboard
 * - Si non connecté: redirige vers /invite
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnersRootPage() {
  const router = useRouter()

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  const checkAuthAndRedirect = async () => {
    try {
      // Vérifier l'authentification via l'API /me
      const response = await fetch('/api/partners/me')

      if (response.ok) {
        // Authentifié - rediriger vers dashboard
        router.push('/partners/dashboard')
      } else {
        // Non authentifié - rediriger vers invite
        router.push('/partners/invite')
      }
    } catch (error) {
      // Erreur - rediriger vers invite par défaut
      router.push('/partners/invite')
    }
  }

  // Afficher un loader pendant la vérification
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirection...</p>
      </div>
    </div>
  )
}
