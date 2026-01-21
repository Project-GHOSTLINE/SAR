import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/quickbooks/connection-manager';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quickbooks/connection/disconnect
 * Déconnecte QuickBooks et supprime les tokens
 */
export async function POST(request: NextRequest) {
  try {
    const manager = getConnectionManager();
    const success = await manager.disconnect();

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'QuickBooks disconnected successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to disconnect QuickBooks'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error disconnecting QuickBooks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
