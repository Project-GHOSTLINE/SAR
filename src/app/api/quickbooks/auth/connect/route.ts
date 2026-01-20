import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Initiate QuickBooks OAuth 2.0 flow
 * Redirects user to QuickBooks authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.INTUIT_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/auth/callback`
    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'

    if (!clientId) {
      return NextResponse.json(
        { error: 'QuickBooks not configured. Missing INTUIT_CLIENT_ID' },
        { status: 500 }
      )
    }

    // Generate random state for CSRF protection
    const state = crypto.randomUUID()

    // Build auth URL
    const authUrl = buildAuthUrl(clientId, redirectUri, state, environment)

    // Return JSON with authUrl for frontend to redirect
    const response = NextResponse.json({
      authUrl
    })

    response.cookies.set('qb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })

    return response

  } catch (error: any) {
    console.error('Error initiating QuickBooks OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow', message: error.message },
      { status: 500 }
    )
  }
}

function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  environment: string
): string {
  const baseUrl = environment === 'production'
    ? 'https://appcenter.intuit.com/connect/oauth2'
    : 'https://appcenter.intuit.com/connect/oauth2'

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'com.intuit.quickbooks.accounting openid profile email',
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state
  })

  return `${baseUrl}?${params.toString()}`
}
