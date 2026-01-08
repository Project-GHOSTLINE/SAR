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
  TransactionID: string
  AccountName: string
  TransactionDateTime: string
  SettlementDate: string
  TransactionType: string
  TransactionStatus: string
  Notes: string
  DebitAmount: string
  CreditAmount: string
  Currency: string
  HoldAmount: string
  ConvenienceFeeAmount: string
  LastModified: string
  ParentTransactionID: string
  ParentTransactionDateTime: string
  ChildTransactionIDs: string
  ClientReferenceNumber: string
  ScheduledTransactionID: string
  WalletID: string
  WalletName1: string
  WalletName2: string
  ClientAccountID: string
  TransactionErrorCode: string
  TransactionFailureReason: string
  TransactionFlag: string
  ELinxRequestID: string
  IsRefunded: string
  IsRefund: string
  FullName: string
  GLCode: string
  TransactionTypeCode: string
  PaymentRailID: string
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
    StartDateTime?: string
    EndDateTime?: string
  }): Promise<VoPayTransaction[]> {
    const authParams = this.getAuthParams()

    // StartDateTime et EndDateTime sont OBLIGATOIRES selon l'API VoPay
    // Par défaut: 30 derniers jours
    const endDate = params?.EndDateTime || new Date().toISOString().split('T')[0]
    const startDate = params?.StartDateTime || (() => {
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString().split('T')[0]
    })()

    authParams.set('StartDateTime', startDate)
    authParams.set('EndDateTime', endDate)
    if (params?.limit) authParams.set('NumberOfTransactions', params.limit.toString())

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

    // VoPay renvoie { Success: true/false, Transactions: {...} }
    if (data.Success === false) {
      throw new Error(data.ErrorMessage || 'VoPay API Error')
    }

    // Les transactions sont retournées comme un objet avec des clés numériques
    // Convertir en array
    const transactions = data.Transactions || {}
    return Object.values(transactions) as VoPayTransaction[]
  }

  /**
   * Récupère les statistiques complètes avec transactions
   */
  async getStats(): Promise<VoPayStats> {
    try {
      // Récupération du solde
      const balanceData = await this.getBalance()

      const accountBalance = parseFloat(balanceData.AccountBalance)
      const availableFunds = parseFloat(balanceData.AvailableFunds)
      const pendingFunds = parseFloat(balanceData.PendingFunds)
      const frozen = accountBalance - availableFunds

      // Récupération des transactions (7 derniers jours, limite de 1000 pour avoir toutes les transactions d'aujourd'hui)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      let transactions: VoPayTransaction[] = []
      try {
        transactions = await this.getTransactions({
          limit: 1000,
          StartDateTime: startDate.toISOString().split('T')[0],
          EndDateTime: endDate.toISOString().split('T')[0]
        })
      } catch (txError) {
        console.error('Error fetching transactions:', txError)
        // Continue sans transactions si erreur
      }

      // Calcul des stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const todayTransactions = transactions.filter(t => {
        const txDate = new Date(t.TransactionDateTime)
        return txDate >= today
      })

      const weekTransactions = transactions.filter(t => {
        const txDate = new Date(t.TransactionDateTime)
        return txDate >= weekAgo
      })

      const pendingCount = transactions.filter(t =>
        t.TransactionStatus.toLowerCase().includes('pending')
      ).length

      const completedCount = transactions.filter(t => {
        const status = t.TransactionStatus.toLowerCase()
        return status === 'completed' || status === 'success'
      }).length

      const todayInterac = todayTransactions.reduce((sum, t) => {
        const amount = parseFloat(t.CreditAmount) - parseFloat(t.DebitAmount)
        return sum + amount
      }, 0)

      const weeklyVolume = weekTransactions.reduce((sum, t) => {
        const amount = parseFloat(t.CreditAmount) - parseFloat(t.DebitAmount)
        return sum + amount
      }, 0)

      const successRate = transactions.length > 0
        ? (completedCount / transactions.length) * 100
        : 100

      return {
        balance: accountBalance,
        available: availableFunds,
        frozen: frozen,
        pendingInterac: pendingCount,
        todayInterac,
        weeklyVolume,
        successRate: Math.round(successRate * 10) / 10,
        recentTransactions: transactions.slice(0, 100) // Augmenté de 10 à 100 pour le dropdown "Volume Aujourd'hui"
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
