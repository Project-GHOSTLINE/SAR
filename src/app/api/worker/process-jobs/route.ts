/**
 * API Route pour traiter les jobs d'analyse en attente
 * Peut être appelée manuellement ou via un cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { processAnalysisJob } from '@/lib/analysis/analysis-worker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/worker/process-jobs
 * Traite tous les jobs en attente (max 10 à la fois)
 */
export async function GET(request: NextRequest) {
  console.log('[Worker API] Démarrage du traitement des jobs');

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      );
    }

    // Récupérer les jobs en attente
    const { data: jobs, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('[Worker API] Erreur récupération jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: error.message },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log('[Worker API] Aucun job en attente');
      return NextResponse.json({
        success: true,
        message: 'No pending jobs',
        processed: 0
      });
    }

    console.log(`[Worker API] ${jobs.length} jobs à traiter`);

    // Traiter chaque job
    const results = await Promise.all(
      jobs.map(job => processAnalysisJob(job.id))
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[Worker API] Traitement terminé: ${successCount} succès, ${failureCount} échecs`);

    return NextResponse.json({
      success: true,
      message: `Processed ${jobs.length} jobs`,
      processed: jobs.length,
      succeeded: successCount,
      failed: failureCount,
      results: results.map(r => ({
        jobId: r.jobId,
        analysisId: r.analysisId,
        success: r.success,
        error: r.error
      }))
    });

  } catch (error) {
    console.error('[Worker API] Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Worker processing failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worker/process-jobs
 * Traite un job spécifique par ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId required' },
        { status: 400 }
      );
    }

    console.log(`[Worker API] Traitement du job ${jobId}`);

    const result = await processAnalysisJob(jobId);

    if (result.success) {
      console.log(`[Worker API] Job ${jobId} traité avec succès`);
      return NextResponse.json({
        success: true,
        message: 'Job processed successfully',
        result
      });
    } else {
      console.error(`[Worker API] Job ${jobId} a échoué:`, result.error);
      return NextResponse.json(
        {
          success: false,
          message: 'Job processing failed',
          error: result.error
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Worker API] Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Worker processing failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
