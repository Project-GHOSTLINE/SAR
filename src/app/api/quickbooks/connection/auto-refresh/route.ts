import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/quickbooks/connection-manager';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quickbooks/connection/auto-refresh
 * Démarre ou arrête le rafraîchissement automatique
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    const manager = getConnectionManager();

    if (action === 'start') {
      await manager.startAutoRefresh();
      return NextResponse.json({
        success: true,
        message: 'Auto-refresh started',
        autoRefreshEnabled: true
      });
    } else if (action === 'stop') {
      manager.stopAutoRefresh();
      return NextResponse.json({
        success: true,
        message: 'Auto-refresh stopped',
        autoRefreshEnabled: false
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use "start" or "stop"'
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error managing auto-refresh:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
