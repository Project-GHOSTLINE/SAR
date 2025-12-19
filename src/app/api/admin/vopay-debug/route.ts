import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const accountId = process.env.VOPAY_ACCOUNT_ID || ''
    const apiKey = process.env.VOPAY_API_KEY || ''
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const apiUrl = process.env.VOPAY_API_URL || ''

    const today = new Date().toISOString().split('T')[0]
    const signatureString = apiKey + sharedSecret + today
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex')

    const debug = {
      env: {
        accountId: accountId ? `${accountId.substring(0, 10)}... (${accountId.length} chars)` : 'MISSING',
        apiKey: apiKey ? `${apiKey.substring(0, 10)}... (${apiKey.length} chars)` : 'MISSING',
        sharedSecret: sharedSecret ? `${sharedSecret.substring(0, 10)}... (${sharedSecret.length} chars)` : 'MISSING',
        apiUrl: apiUrl || 'MISSING',
      },
      date: today,
      signature: signature.substring(0, 20) + '...',
      signatureStringLength: signatureString.length,
      url: `${apiUrl}account/balance?AccountID=${accountId}&Key=${apiKey}&Signature=${signature}`.substring(0, 100) + '...'
    }

    // Test real call
    const fullUrl = `${apiUrl}account/balance?AccountID=${accountId}&Key=${apiKey}&Signature=${signature}`

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    const data = await response.json()

    return NextResponse.json({
      debug,
      vopayResponse: data,
      httpStatus: response.status
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
