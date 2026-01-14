/**
 * 🪝 Hook personnalisé pour les données VoPay
 * Permet d'accéder aux données VoPay en temps réel depuis n'importe quel composant
 */

import { useState, useEffect } from 'react'

export interface VoPayTransaction {
  TransactionID: string
  TransactionDateTime: string
  TransactionType: string
  TransactionStatus: string
  DebitAmount: string
  CreditAmount: string
  FullName: string
  ClientReferenceNumber: string
  Notes: string
  Currency: string
}

export interface VoPayData {
  balance: number
  available: number
  frozen: number
  pendingInterac: number
  todayInterac: number
  weeklyVolume: number
  successRate: number
  recentTransactions: VoPayTransaction[]
}

export interface UseVoPayDataOptions {
  autoRefresh?: boolean
  refreshInterval?: number // en millisecondes
  enabled?: boolean
}

export function useVoPayData(options: UseVoPayDataOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 secondes par défaut
    enabled = true
  } = options

  const [data, setData] = useState<VoPayData>({
    balance: 0,
    available: 0,
    frozen: 0,
    pendingInterac: 0,
    todayInterac: 0,
    weeklyVolume: 0,
    successRate: 0,
    recentTransactions: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/vopay', {
        credentials: 'include',
        cache: 'no-store' // Force no cache
      })

      if (res.ok) {
        const result = await res.json()
        if (result.success && result.data) {
          setData(result.data)
          setLastUpdate(new Date())
        }
      } else {
        const error = await res.json()
        setError(error.details || 'Erreur de connexion VoPay')
      }
    } catch (err) {
      console.error('Erreur VoPay:', err)
      setError('Impossible de se connecter à VoPay')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    // Chargement initial
    fetchData()

    // Auto-refresh si activé
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [enabled, autoRefresh, refreshInterval])

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh: fetchData
  }
}
