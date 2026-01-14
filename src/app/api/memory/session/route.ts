// API: Enregistrer une session de travail
// POST /api/memory/session

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      project_name,
      summary,
      tasks_completed = [],
      learnings = [],
      next_steps = [],
      files_modified = [],
      session_duration
    } = body;

    // Validation
    if (!project_name) {
      return NextResponse.json(
        { error: 'Missing required field: project_name' },
        { status: 400 }
      );
    }

    // Insérer dans claude_sessions
    const { data, error } = await supabase
      .from('claude_sessions')
      .insert({
        project_name,
        summary,
        tasks_completed,
        learnings,
        next_steps,
        files_modified,
        session_duration,
        session_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to store session', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session stored successfully',
      data
    });

  } catch (error: any) {
    console.error('Erreur dans /api/memory/session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Récupérer les sessions récentes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_name = searchParams.get('project');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!project_name) {
      return NextResponse.json(
        { error: 'Missing required parameter: project' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('claude_sessions')
      .select('*')
      .eq('project_name', project_name)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to get sessions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      sessions: data || []
    });

  } catch (error: any) {
    console.error('Erreur dans /api/memory/session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
