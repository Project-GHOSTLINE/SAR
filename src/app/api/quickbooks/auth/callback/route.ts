import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * QuickBooks OAuth 2.0 Callback
 * Exchanges authorization code for access token
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client at runtime
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId')
    const error = searchParams.get('error')

    console.log('QuickBooks callback received:', { code: !!code, state: !!state, realmId, error })

    // Check for OAuth errors
    if (error) {
      console.error('QuickBooks OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/quickbooks?error=${error}`
      )
    }

    // Verify state parameter
    const storedState = request.cookies.get('qb_oauth_state')?.value
    console.log('State verification:', { received: state, stored: storedState })

    if (!state || state !== storedState) {
      console.error('Invalid OAuth state')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/quickbooks?error=invalid_state`
      )
    }

    if (!code || !realmId) {
      console.error('Missing code or realmId')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/quickbooks?error=missing_params`
      )
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...')
    const tokens = await exchangeCodeForTokens(code, realmId)

    if (!tokens) {
      console.error('Token exchange failed')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/quickbooks?error=token_exchange_failed`
      )
    }

    console.log('Tokens received, fetching company info...')
    // Get company info from QuickBooks
    const companyInfo = await getCompanyInfo(tokens.access_token, realmId)
    console.log('Company info:', companyInfo?.CompanyName)

    // Store tokens in database
    console.log('Storing tokens in database...')
    const { error: dbError } = await supabase
      .from('quickbooks_tokens')
      .upsert({
        realm_id: realmId,
        company_name: companyInfo?.CompanyName || 'Unknown',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        refresh_token_expires_at: new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'realm_id'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/quickbooks?error=db_error`
      )
    }

    console.log('✅ QuickBooks connected successfully:', realmId)

    // Redirect to QuickBooks admin page
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/quickbooks?success=connected`
    )

    // Clear state cookie
    response.cookies.delete('qb_oauth_state')

    return response

  } catch (error: any) {
    console.error('Error in QuickBooks callback:', error.message, error.stack)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/quickbooks?error=callback_failed`
    )
  }
}

async function exchangeCodeForTokens(code: string, realmId: string) {
  try {
    const clientId = process.env.INTUIT_CLIENT_ID!
    const clientSecret = process.env.INTUIT_CLIENT_SECRET!
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/auth/callback`
    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'

    const tokenEndpoint = environment === 'production'
      ? 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
      : 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Token exchange error:', error)
      return null
    }

    return await response.json()

  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    return null
  }
}

async function getCompanyInfo(accessToken: string, realmId: string) {
  try {
    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'
    const baseUrl = environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    const response = await fetch(
      `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.error('Failed to get company info')
      return null
    }

    const data = await response.json()
    return data.CompanyInfo

  } catch (error) {
    console.error('Error getting company info:', error)
    return null
  }
}
