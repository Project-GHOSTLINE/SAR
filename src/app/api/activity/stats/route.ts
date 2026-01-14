// API: Stats d'activité réelles
// GET /api/activity/stats?project=sar

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

    // Récupérer les stats via la fonction SQL
    const { data: stats, error: statsError } = await supabase
      .rpc('get_claude_stats', {
        p_project: project
      });

    if (statsError) {
      console.error('Erreur récupération stats:', statsError);

      // Fallback: calculer les stats manuellement
      const { data: actions, error: actionsError } = await supabase
        .from('claude_actions')
        .select('*')
        .eq('project_name', project);

      if (actionsError) {
        return NextResponse.json({
          success: true,
          stats: {
            total_actions: 0,
            actions_today: 0,
            files_changed: 0,
            avg_duration_ms: 0,
            by_type: {},
            recent_thoughts: []
          }
        });
      }

      // Calculer les stats manuellement
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const actionsToday = actions?.filter(a => new Date(a.created_at) >= today).length || 0;

      const byType: any = {};
      actions?.forEach(a => {
        byType[a.action_type] = (byType[a.action_type] || 0) + 1;
      });

      const durations = actions?.filter(a => a.duration_ms).map(a => a.duration_ms) || [];
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      const recentThoughts = actions
        ?.filter(a => a.thought)
        .map(a => a.thought)
        .slice(0, 10) || [];

      return NextResponse.json({
        success: true,
        stats: {
          total_actions: actions?.length || 0,
          actions_today: actionsToday,
          files_changed: 0,
          avg_duration_ms: avgDuration,
          by_type: byType,
          recent_thoughts: recentThoughts
        }
      });
    }

    return NextResponse.json({
      success: true,
      stats: stats || {
        total_actions: 0,
        actions_today: 0,
        files_changed: 0,
        avg_duration_ms: 0,
        by_type: {},
        recent_thoughts: []
      }
    });

  } catch (error: any) {
    console.error('Erreur dans /api/activity/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
