// API: Récupérer des mémoires
// GET /api/memory/recall?project=sar&category=architecture&search=auth

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
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const importance_min = parseInt(searchParams.get('importance_min') || '0');

    // Validation
    if (!project_name) {
      return NextResponse.json(
        { error: 'Missing required parameter: project' },
        { status: 400 }
      );
    }

    // Construire la requête
    let query = supabase
      .from('claude_memory')
      .select('*')
      .eq('project_name', project_name)
      .gte('importance', importance_min)
      .order('importance', { ascending: false })
      .order('last_accessed_at', { ascending: false })
      .limit(limit);

    // Filtrer par catégorie si spécifié
    if (category) {
      query = query.eq('category', category);
    }

    // Recherche textuelle si spécifié
    if (search) {
      query = query.or(`context.ilike.%${search}%,key.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to recall memories', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      memories: data || []
    });

  } catch (error: any) {
    console.error('Erreur dans /api/memory/recall:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
