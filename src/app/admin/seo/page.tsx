'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import SEOView from '@/components/admin/SEOView'
import { Loader2 } from 'lucide-react'

export default function SEOPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Vérifier l'authentification
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/analytics', {
          credentials: 'include'
        })

        if (!res.ok) {
          throw new Error('Non authentifié')
        }

        setLoading(false)
      } catch (err) {
        console.error('Erreur auth:', err)
        router.push('/admin')
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <AdminNav currentPage="/admin/seo" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#10B981]" />
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <AdminNav currentPage="/admin/seo" />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-red-50 border-l-4 border-red-500 px-6 py-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <AdminNav currentPage="/admin/seo" />
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <SEOView />
      </main>
    </div>
  )
}
