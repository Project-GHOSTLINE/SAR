import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/quickbooks/connection-manager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quickbooks/connection/status
 * Retourne le statut détaillé de la connexion QuickBooks
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getConnectionManager();
    const status = await manager.getConnectionStatus();
    const companyInfo = status.connected ? await manager.getCompanyInfo() : null;

    return NextResponse.json({
      success: true,
      connection: status,
      company: companyInfo ? {
        name: companyInfo.CompanyName,
        legalName: companyInfo.LegalName,
        email: companyInfo.Email,
        phone: companyInfo.PrimaryPhone?.FreeFormNumber,
        address: companyInfo.CompanyAddr,
        fiscalYearStart: companyInfo.FiscalYearStartMonth
      } : null
    });
  } catch (error: any) {
    console.error('Error getting connection status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
