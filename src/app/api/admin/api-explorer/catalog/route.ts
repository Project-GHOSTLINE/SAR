import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/api-explorer/route-matcher';

/**
 * GET /api/admin/api-explorer/catalog
 * Retourne le catalogue complet des routes API
 */
export async function GET() {
  try {
    const catalog = getCatalog();

    return NextResponse.json({
      success: true,
      ...catalog
    });
  } catch (error) {
    console.error('Error loading catalog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load catalog' },
      { status: 500 }
    );
  }
}
