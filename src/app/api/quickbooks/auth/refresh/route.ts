import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Refresh QuickBooks Access Token
 * Called automatically when token expires
 */
export async function POST(request: NextRequest) {
  try {
    // Get current tokens from database
    const { data: tokens, error } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !tokens) {
      return NextResponse.json(
        { error: 'No QuickBooks connection found' },
        { status: 404 }
      )
    }

    // Check if refresh is needed
    const expiryDate = new Date(tokens.expires_at)
    const now = new Date()
    const minutesUntilExpiry = (expiryDate.getTime() - now.getTime()) / 1000 / 60

    if (minutesUntilExpiry > 10) {
      // Token still valid for more than 10 minutes
      return NextResponse.json({
        success: true,
        message: 'Token still valid',
        expiresIn: minutesUntilExpiry
      })
    }

    // Refresh the token
    const newTokens = await refreshAccessToken(tokens.refresh_token)

    if (!newTokens) {
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 500 }
      )
    }

    // Update tokens in database
    await supabase
      .from('quickbooks_tokens')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        refresh_token_expires_at: new Date(Date.now() + newTokens.x_refresh_token_expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tokens.id)

    console.log('✅ QuickBooks token refreshed successfully')

    return NextResponse.json({
      success: true,
      message: 'Token refreshed',
      expiresIn: newTokens.expires_in / 60
    })

  } catch (error: any) {
    console.error('Error refreshing QuickBooks token:', error)
    return NextResponse.json(
      { error: 'Token refresh failed', message: error.message },
      { status: 500 }
    )
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const clientId = process.env.INTUIT_CLIENT_ID!
    const clientSecret = process.env.INTUIT_CLIENT_SECRET!
    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'

    const tokenEndpoint = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Token refresh error:', error)
      return null
    }

    return await response.json()

  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

/**
 * Auto-refresh cron job (call this every hour)
 * GET /api/quickbooks/auth/refresh
 */
export async function GET(request: NextRequest) {
  return POST(request)
}
