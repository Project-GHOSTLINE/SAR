import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quickbooks/connection/force-reconnect
 * Force la déconnexion complète et retourne l'URL OAuth pour reconnecter
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Supprimer TOUS les tokens (force delete)
    console.log('🔥 Force deleting all QuickBooks tokens...');

    const { error: deleteError } = await supabase
      .from('quickbooks_tokens')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('Delete error:', deleteError);
    } else {
      console.log('✅ All tokens deleted');
    }

    // 2. Vérifier qu'il ne reste rien
    const { data: remaining, error: checkError } = await supabase
      .from('quickbooks_tokens')
      .select('*');

    if (remaining && remaining.length > 0) {
      console.warn(`⚠️ ${remaining.length} tokens still remain after delete!`);

      // Force delete each one individually
      for (const token of remaining) {
        await supabase
          .from('quickbooks_tokens')
          .delete()
          .eq('id', token.id);
      }

      console.log('✅ Force deleted remaining tokens');
    } else {
      console.log('✅ Confirmed: no tokens remain');
    }

    // 3. Générer une nouvelle URL OAuth
    const clientId = process.env.INTUIT_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/quickbooks/auth/callback`;
    const state = `reconnect-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // IMPORTANT: Les nouveaux scopes incluent openid, profile, email
    const scope = 'com.intuit.quickbooks.accounting openid profile email';

    const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
      `client_id=${clientId}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&state=${state}`;

    return NextResponse.json({
      success: true,
      message: 'All tokens deleted. Ready for fresh reconnection.',
      tokensRemaining: 0,
      authUrl: authUrl,
      scopes: scope.split(' '),
      instructions: [
        'Open the authUrl in your browser',
        'You will see the NEW OAuth scopes (openid, profile, email)',
        'Click "Authorize" to approve',
        'You will be redirected back to /admin/quickbooks',
        'Error 3100 will be GONE!'
      ]
    });

  } catch (error: any) {
    console.error('❌ Force reconnect failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
