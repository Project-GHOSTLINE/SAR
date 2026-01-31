/**
 * API: GET /api/seo/semrush
 * Returns SEO data from Semrush API
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SEMRUSH_API_KEY = process.env.SEMRUSH_API_KEY!;
const SEMRUSH_API_URL = process.env.SEMRUSH_API_URL!;
const DOMAIN = 'solutionargentrapide.ca';

async function fetchSemrush(endpoint: string, params: Record<string, string>) {
  const url = new URL(endpoint, SEMRUSH_API_URL);
  url.searchParams.append('key', SEMRUSH_API_KEY);
  url.searchParams.append('export_columns', params.export_columns || '');
  url.searchParams.append('domain', params.domain || DOMAIN);
  url.searchParams.append('database', params.database || 'ca');

  const response = await fetch(url.toString());
  const text = await response.text();

  // Parse CSV-like response
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';');
  return lines.slice(1).map((line) => {
    const values = line.split(';');
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

export async function GET(request: NextRequest) {
  try {
    if (!SEMRUSH_API_KEY) {
      return NextResponse.json(
        { error: 'Semrush API key not configured' },
        { status: 500 }
      );
    }

    // Fetch domain overview
    const overview = await fetchSemrush('/analytics/v1/', {
      export_columns: 'Ot,Oc,Or,Ot_cost,Ot_visits',
      domain: DOMAIN,
      database: 'ca',
    });

    // Fetch organic keywords
    const keywords = await fetchSemrush('/analytics/v1/', {
      export_columns: 'Ph,Po,Nq,Cp,Co,Kd,Tr',
      domain: DOMAIN,
      database: 'ca',
    });

    // Fetch backlinks overview
    const backlinks = await fetchSemrush('/analytics/v1/backlinks_overview', {
      export_columns: 'total,domains_num,urls_num,ips_num,ascore',
      domain: DOMAIN,
      database: 'ca',
    });

    // Parse overview data
    const overviewData = overview[0] || {};
    const backlinksData = backlinks[0] || {};

    return NextResponse.json({
      overview: {
        organic_keywords: parseInt(overviewData.Ot || '0'),
        organic_traffic: parseInt(overviewData.Ot_visits || '0'),
        organic_cost: parseFloat(overviewData.Ot_cost || '0'),
        paid_keywords: parseInt(overviewData.Oc || '0'),
      },
      backlinks: {
        total: parseInt(backlinksData.total || '0'),
        domains: parseInt(backlinksData.domains_num || '0'),
        authority_score: parseInt(backlinksData.ascore || '0'),
      },
      top_keywords: keywords.slice(0, 20).map((k) => ({
        keyword: k.Ph,
        position: parseInt(k.Po || '0'),
        volume: parseInt(k.Nq || '0'),
        cpc: parseFloat(k.Cp || '0'),
        competition: parseFloat(k.Co || '0'),
        traffic: parseFloat(k.Tr || '0'),
      })),
      domain: DOMAIN,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/seo/semrush] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Semrush data', details: error.message },
      { status: 500 }
    );
  }
}
