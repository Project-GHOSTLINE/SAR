import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/quickbooks/connection-manager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quickbooks/connection/test
 * Teste la connexion QuickBooks en faisant un appel API réel
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getConnectionManager();
    const result = await manager.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        company: result.data
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          details: result.data
        },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
