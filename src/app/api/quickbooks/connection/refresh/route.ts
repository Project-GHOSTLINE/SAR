import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/quickbooks/connection-manager';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quickbooks/connection/refresh
 * Force le rafraîchissement des tokens QuickBooks
 */
export async function POST(request: NextRequest) {
  try {
    const manager = getConnectionManager();
    const success = await manager.forceRefresh();

    if (success) {
      const status = await manager.getConnectionStatus();
      return NextResponse.json({
        success: true,
        message: 'Tokens refreshed successfully',
        connection: status
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to refresh tokens'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error refreshing tokens:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
