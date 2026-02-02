// API: Obtenir le contexte complet d'un projet
export const dynamic = 'force-dynamic'

// GET /api/memory/context?project=sar

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_name = searchParams.get('project');
    const top_n = parseInt(searchParams.get('top_n') || '20');

    // Validation
    if (!project_name) {
      return NextResponse.json(
        { error: 'Missing required parameter: project' },
        { status: 400 }
      );
    }

    // Appeler la fonction SQL get_project_context
    const { data, error } = await supabase
      .rpc('get_project_context', {
        p_project_name: project_name,
        p_top_n: top_n
      });

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to get project context', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      context: data
    });

  } catch (error: any) {
    console.error('Erreur dans /api/memory/context:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
