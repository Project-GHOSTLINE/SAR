import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface VoPayTransaction {
  TransactionID: string
  TransactionDateTime: string
  TransactionType: string
  TransactionStatus: string
  DebitAmount: string
  CreditAmount: string
  Currency: string
  FullName: string
  Notes: string
}

// Génère la signature VoPay
function generateSignature(): string {
  const apiKey = process.env.VOPAY_API_KEY!
  const sharedSecret = process.env.VOPAY_SHARED_SECRET!
  const today = new Date().toISOString().split('T')[0]
  const signatureString = apiKey + sharedSecret + today
  return crypto.createHash('sha1').update(signatureString).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const accountId = process.env.VOPAY_ACCOUNT_ID
    const apiKey = process.env.VOPAY_API_KEY
    const apiUrl = process.env.VOPAY_API_URL

    if (!accountId || !apiKey || !apiUrl) {
      return NextResponse.json(
        { error: 'VoPay configuration missing' },
        { status: 500 }
      )
    }

    // Paramètres de requête
    const params = new URLSearchParams()
    params.set('AccountID', accountId)
    params.set('Key', apiKey)
    params.set('Signature', generateSignature())

    // Dates (7 derniers jours)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    params.set('StartDateTime', startDate)
    params.set('EndDateTime', endDate)
    params.set('NumberOfTransactions', '50')

    // Appel API VoPay
    const url = `${apiUrl}account/transactions?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`VoPay API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.Success) {
      throw new Error(`VoPay error: ${data.ErrorMessage}`)
    }

    // Convertir objet en array
    const transactions = Object.values(data.Transactions || {}) as VoPayTransaction[]

    // Formater pour l'affichage
    const formatted = transactions.map(t => {
      const debit = parseFloat(t.DebitAmount || '0')
      const credit = parseFloat(t.CreditAmount || '0')
      const amount = credit > 0 ? credit : debit

      return {
        id: t.TransactionID,
        transaction_id: t.TransactionID,
        transaction_type: t.TransactionType,
        transaction_amount: amount,
        currency: t.Currency || 'CAD',
        status: t.TransactionStatus,
        full_name: t.FullName,
        notes: t.Notes,
        received_at: t.TransactionDateTime,
        environment: 'production',
        is_real: true
      }
    })

    return NextResponse.json({
      success: true,
      count: formatted.length,
      transactions: formatted
    })

  } catch (error: any) {
    console.error('Error fetching VoPay transactions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
