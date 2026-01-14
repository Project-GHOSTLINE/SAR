// API: Logger une action réelle de Claude
// POST /api/activity/log

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
      project_name = 'sar',
      session_id,
      action_type,
      target,
      details,
      status = 'success',
      error_message,
      duration_ms,
      thought,
      goal
    } = body;

    // Validation
    if (!action_type || !target) {
      return NextResponse.json(
        { error: 'Missing required fields: action_type, target' },
        { status: 400 }
      );
    }

    // Logger l'action
    const { data, error } = await supabase
      .from('claude_actions')
      .insert({
        project_name,
        session_id,
        action_type,
        target,
        details,
        status,
        error_message,
        duration_ms,
        thought,
        goal
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur logging action:', error);
      return NextResponse.json(
        { error: 'Failed to log action', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('Erreur dans /api/activity/log:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
