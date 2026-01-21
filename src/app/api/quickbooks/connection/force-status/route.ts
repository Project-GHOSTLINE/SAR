import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/quickbooks/connection/force-status
 * Force check DB and return TRUE status (bypass all caches)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[FORCE-STATUS] Starting fresh query...');

    // Direct Supabase query - NO CACHE
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[FORCE-STATUS] Querying quickbooks_tokens table...');

    const { data: tokens, error, count } = await supabase
      .from('quickbooks_tokens')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('[FORCE-STATUS] Query complete:', {
      tokenCount: tokens?.length || 0,
      totalCount: count,
      hasError: !!error,
      errorMessage: error?.message
    });

    const isConnected = tokens && tokens.length > 0;
    const token = tokens?.[0];

    if (!isConnected) {
      console.log('[FORCE-STATUS] NO TOKENS - Generating OAuth URL...');

      const clientId = process.env.INTUIT_CLIENT_ID;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.solutionargentrapide.ca';
      const redirectUri = `${baseUrl}/api/quickbooks/auth/callback`;
      const state = `force-${Date.now()}`;
      const scope = 'com.intuit.quickbooks.accounting openid profile email';

      const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
        `client_id=${clientId}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&state=${state}`;

      return NextResponse.json({
        success: true,
        forceChecked: true,
        dbTokenCount: 0,
        connection: {
          connected: false,
          message: 'No tokens in database'
        },
        authUrl,
        instructions: [
          'DB has 0 tokens',
          'Open authUrl to connect',
          'Authorize with new scopes (openid, profile, email)',
          'You will be redirected back automatically'
        ]
      });
    }

    console.log('[FORCE-STATUS] TOKENS FOUND:', {
      realmId: token.realm_id,
      expiresAt: token.expires_at
    });

    return NextResponse.json({
      success: true,
      forceChecked: true,
      dbTokenCount: tokens.length,
      connection: {
        connected: true,
        realmId: token.realm_id,
        expiresAt: token.expires_at,
        lastRefresh: token.updated_at
      }
    });

  } catch (error: any) {
    console.error('[FORCE-STATUS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
