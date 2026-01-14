// API: Récupérer l'activité récente réelle
// GET /api/activity/recent?project=sar&limit=50

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project') || 'sar';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Récupérer les actions via la fonction SQL
    const { data: actions, error: actionsError } = await supabase
      .rpc('get_claude_activity', {
        p_project: project,
        p_limit: limit
      });

    if (actionsError) {
      console.error('Erreur récupération actions:', actionsError);
      // Si la fonction n'existe pas encore, fallback sur requête directe
      const { data: fallbackActions, error: fallbackError } = await supabase
        .from('claude_actions')
        .select('*')
        .eq('project_name', project)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackError) {
        return NextResponse.json(
          { error: 'Failed to fetch activity', details: fallbackError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        actions: fallbackActions || [],
        count: fallbackActions?.length || 0
      });
    }

    return NextResponse.json({
      success: true,
      actions: actions || [],
      count: actions?.length || 0
    });

  } catch (error: any) {
    console.error('Erreur dans /api/activity/recent:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
