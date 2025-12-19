/**
 * VoPay API Client
 * Documentation: https://docs.vopay.com/
 */

import crypto from 'crypto'

interface VoPayConfig {
  accountId: string
  apiKey: string
  sharedSecret: string
  apiUrl: string
}

interface VoPayBalance {
  Success: boolean
  ErrorMessage: string
  AccountBalance: string
  PendingFunds: string
  SecurityDeposit: string
  Reserve: string
  AvailableImmediately: string
  AvailableFunds: string
  OffbookBalance: string
  Currency: string
  AsOfDate: string
}

interface VoPayTransaction {
  transaction_id: string
  transaction_type: string
  amount: number
  status: string
  created_at: string
  reference: string
  description?: string
}

interface VoPayStats {
  balance: number
  available: number
  frozen: number
  pendingInterac: number
  todayInterac: number
  weeklyVolume: number
  successRate: number
  recentTransactions: VoPayTransaction[]
}

class VoPayClient {
  private config: VoPayConfig

  constructor(config: VoPayConfig) {
    this.config = config
  }

  /**
   * Génère la signature SHA1 pour l'authentification VoPay
   * Signature = SHA1(APIKey + SharedSecret + Date(YYYY-MM-DD))
   */
  private generateSignature(): string {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const signatureString = this.config.apiKey + this.config.sharedSecret + today
    return crypto.createHash('sha1').update(signatureString).digest('hex')
  }

  /**
   * Construit les paramètres d'authentification pour les requêtes GET
   */
  private getAuthParams(): URLSearchParams {
    const params = new URLSearchParams()
    params.set('AccountID', this.config.accountId)
    params.set('Key', this.config.apiKey)
    params.set('Signature', this.generateSignature())
    return params
  }

  /**
   * Construit les headers de base
   */
  private getHeaders(): HeadersInit {
    return {
      'Accept': 'application/json',
    }
  }

  /**
   * Récupère le solde du compte
   */
  async getBalance(): Promise<VoPayBalance> {
    const authParams = this.getAuthParams()
    const url = `${this.config.apiUrl}account/balance?${authParams.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`VoPay API Error (${response.status}): ${error}`)
    }

    const data = await response.json()

    // VoPay renvoie { Success: true/false, ... }
    if (data.Success === false) {
      throw new Error(data.ErrorMessage || 'VoPay API Error')
    }

    return data
  }

  /**
   * Récupère les transactions
   */
  async getTransactions(params?: {
    limit?: number
    start_date?: string
    end_date?: string
    status?: string
  }): Promise<{ transactions: VoPayTransaction[] }> {
    const authParams = this.getAuthParams()

    if (params?.limit) authParams.set('limit', params.limit.toString())
    if (params?.start_date) authParams.set('start_date', params.start_date)
    if (params?.end_date) authParams.set('end_date', params.end_date)
    if (params?.status) authParams.set('status', params.status)

    const url = `${this.config.apiUrl}account/transactions?${authParams.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`VoPay API Error (${response.status}): ${error}`)
    }

    const data = await response.json()

    // VoPay renvoie { Success: true/false, ... }
    if (data.Success === false) {
      throw new Error(data.ErrorMessage || 'VoPay API Error')
    }

    return data
  }

  /**
   * Récupère les statistiques complètes
   */
  async getStats(): Promise<VoPayStats> {
    try {
      // Pour l'instant, on récupère juste le solde
      // Les transactions nécessitent un endpoint différent que nous testerons plus tard
      const balanceData = await this.getBalance()

      const accountBalance = parseFloat(balanceData.AccountBalance)
      const availableFunds = parseFloat(balanceData.AvailableFunds)
      const pendingFunds = parseFloat(balanceData.PendingFunds)
      const frozen = accountBalance - availableFunds

      return {
        balance: accountBalance,
        available: availableFunds,
        frozen: frozen,
        pendingInterac: 0, // Nécessite l'endpoint transactions
        todayInterac: pendingFunds, // On utilise pending funds comme approximation
        weeklyVolume: 0, // Nécessite l'endpoint transactions
        successRate: 100, // Valeur par défaut
        recentTransactions: []
      }
    } catch (error) {
      console.error('VoPay Stats Error:', error)
      throw error
    }
  }
}

/**
 * Crée une instance du client VoPay
 */
export function createVoPayClient(): VoPayClient {
  const config: VoPayConfig = {
    accountId: (process.env.VOPAY_ACCOUNT_ID || '').trim(),
    apiKey: (process.env.VOPAY_API_KEY || '').trim(),
    sharedSecret: (process.env.VOPAY_SHARED_SECRET || '').trim(),
    apiUrl: (process.env.VOPAY_API_URL || 'https://earthnode.vopay.com/api/v2/').trim(),
  }

  // Validation
  if (!config.accountId || !config.apiKey || !config.sharedSecret) {
    throw new Error('VoPay credentials missing in environment variables')
  }

  return new VoPayClient(config)
}

export type { VoPayStats, VoPayTransaction, VoPayBalance }
