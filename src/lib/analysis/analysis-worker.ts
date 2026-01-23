/**
 * Analysis Worker
 * Processus asynchrone qui traite les jobs d'analyse en queue
 */

import { getSupabase } from '@/lib/supabase';
import { WorkerLogger } from '@/lib/utils/logger';
import { calculateFinancialMetrics } from './calculate-metrics';
import { calculateSARScore } from './calculate-sar-score';
import { generateRecommendation } from './generate-recommendation';

import type {
  AnalysisJob,
  CreateAnalysisScore,
  CreateAnalysisRecommendation
} from '@/types/analysis';
import type { InveriteFetchResponse } from '@/types/inverite';

// ============================================================================
// Configuration
// ============================================================================

const WORKER_CONFIG = {
  BATCH_SIZE: 10,           // Nombre de jobs à traiter par batch
  POLL_INTERVAL: 5000,      // Intervalle de polling (5 secondes)
  MAX_RETRIES: 3,           // Nombre max de retries pour un job
  RETRY_DELAY: 2000,        // Délai entre les retries (2 secondes)
  JOB_TIMEOUT: 30000        // Timeout pour un job (30 secondes)
};

// ============================================================================
// Types
// ============================================================================

interface AnalysisData {
  id: string;
  inverite_guid?: string;
  inverite_risk_score?: number;
  risk_level?: string;
  microloans_data?: any;
  raw_data: any;
}

interface ProcessJobResult {
  success: boolean;
  jobId: string;
  analysisId: string;
  error?: string;
}

// ============================================================================
// Récupération et Validation des Données
// ============================================================================

/**
 * Récupère les données d'analyse depuis la DB
 */
async function fetchAnalysisData(
  analysisId: string,
  logger: WorkerLogger
): Promise<AnalysisData | null> {
  logger.log('DB', 'Récupération des données d\'analyse', { analysisId });

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const { data, error } = await supabase
    .from('client_analyses')
    .select('id, inverite_guid, inverite_risk_score, risk_level, microloans_data, raw_data')
    .eq('id', analysisId)
    .single();

  if (error || !data) {
    logger.error('DB', 'Échec récupération données analyse', error || new Error('No data'));
    return null;
  }

  logger.log('DB', 'Données récupérées avec succès', {
    has_inverite_guid: !!data.inverite_guid,
    has_risk_score: !!data.inverite_risk_score,
    has_raw_data: !!data.raw_data
  });

  return data as AnalysisData;
}

/**
 * Valide que les données ont le format Inverite attendu
 */
function validateInveriteData(rawData: any): rawData is InveriteFetchResponse {
  if (!rawData) return false;
  // Vérifier qu'il y a au moins des comptes (le champ name n'est pas toujours présent)
  if (!rawData.accounts || !Array.isArray(rawData.accounts)) return false;
  if (rawData.accounts.length === 0) return false;
  return true;
}

// ============================================================================
// Sauvegarde des Résultats
// ============================================================================

/**
 * Sauvegarde les scores dans la DB
 */
async function saveAnalysisScores(
  analysisId: string,
  metrics: any,
  scoreResult: any,
  logger: WorkerLogger
): Promise<boolean> {
  logger.log('DB', 'Sauvegarde des scores', { analysisId });

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase unavailable');

  const scoreData: CreateAnalysisScore = {
    analysis_id: analysisId,
    sar_score: scoreResult.sar_score,
    sar_score_normalized: scoreResult.sar_score_normalized,
    monthly_income: metrics.monthly_income,
    monthly_expenses: metrics.monthly_expenses,
    dti_ratio: metrics.dti_ratio,
    nsf_count: metrics.nsf_count,
    overdraft_count: metrics.overdraft_count,
    bankruptcy_detected: metrics.bankruptcy_detected,
    microloans_detected: metrics.microloans_detected,
    account_health: metrics.account_health,
    confidence: scoreResult.confidence
  };

  const { error } = await supabase
    .from('analysis_scores')
    .insert([scoreData]);

  if (error) {
    logger.error('DB', 'Échec sauvegarde scores', error);
    return false;
  }

  logger.log('DB', 'Scores sauvegardés avec succès', {
    sar_score: scoreData.sar_score
  });

  return true;
}

/**
 * Sauvegarde la recommandation dans la DB
 */
async function saveAnalysisRecommendation(
  analysisId: string,
  recommendation: any,
  logger: WorkerLogger
): Promise<boolean> {
  logger.log('DB', 'Sauvegarde de la recommandation', { analysisId });

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase unavailable');

  const recommendationData: CreateAnalysisRecommendation = {
    analysis_id: analysisId,
    recommendation: recommendation.recommendation,
    max_loan_amount: recommendation.max_loan_amount,
    reasoning: recommendation.reasoning,
    confidence: recommendation.confidence,
    red_flags: recommendation.red_flags
  };

  const { error } = await supabase
    .from('analysis_recommendations')
    .insert([recommendationData]);

  if (error) {
    logger.error('DB', 'Échec sauvegarde recommandation', error);
    return false;
  }

  logger.log('DB', 'Recommandation sauvegardée avec succès', {
    recommendation: recommendationData.recommendation,
    max_loan_amount: recommendationData.max_loan_amount
  });

  return true;
}

/**
 * Met à jour le timestamp analyzed_at dans client_analyses
 */
async function updateAnalyzedTimestamp(
  analysisId: string,
  logger: WorkerLogger
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from('client_analyses')
    .update({ analyzed_at: new Date().toISOString() })
    .eq('id', analysisId);

  logger.log('DB', 'Timestamp analyzed_at mis à jour');
}

// ============================================================================
// Mise à Jour du Job
// ============================================================================

/**
 * Met à jour le statut d'un job
 */
async function updateJobStatus(
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  error?: string,
  logger?: WorkerLogger
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const updateData: any = { status };

  if (status === 'processing' && !error) {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'failed' && error) {
    updateData.error = error;
    updateData.completed_at = new Date().toISOString();
  }

  await supabase
    .from('analysis_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (logger) {
    logger.log('JOB', `Job status mis à jour: ${status}`, { jobId });
  }
}

// ============================================================================
// Traitement d'un Job
// ============================================================================

/**
 * Traite un job d'analyse complet
 */
async function processJob(job: AnalysisJob): Promise<ProcessJobResult> {
  const logger = new WorkerLogger(job.id, job.analysis_id);
  const startTime = performance.now();

  logger.log('START', 'Début du traitement du job', {
    jobId: job.id,
    analysisId: job.analysis_id,
    priority: job.priority
  });

  try {
    // 1. Marquer le job comme en traitement
    await updateJobStatus(job.id, 'processing', undefined, logger);

    // 2. Récupérer les données d'analyse
    const analysisData = await fetchAnalysisData(job.analysis_id, logger);
    if (!analysisData) {
      throw new Error('Failed to fetch analysis data');
    }

    // 3. Valider les données Inverite
    if (!validateInveriteData(analysisData.raw_data)) {
      throw new Error('Invalid Inverite data format');
    }

    // 4. Calculer les métriques financières
    logger.log('METRICS', 'Calcul des métriques financières');
    const metrics = calculateFinancialMetrics(
      analysisData.raw_data,
      analysisData.microloans_data
    );
    logger.log('METRICS', 'Métriques calculées', {
      monthly_income: metrics.monthly_income,
      dti_ratio: metrics.dti_ratio,
      red_flags_count: metrics.red_flags.length
    });

    // 5. Calculer le SAR Score
    logger.log('SCORE', 'Calcul du SAR Score');
    const scoreResult = calculateSARScore(metrics, analysisData.inverite_risk_score);
    logger.log('SCORE', 'SAR Score calculé', {
      sar_score: scoreResult.sar_score,
      confidence: scoreResult.confidence
    });

    // 6. Générer la recommandation
    logger.log('RECOMMENDATION', 'Génération de la recommandation');
    const recommendation = generateRecommendation(scoreResult, metrics);
    logger.log('RECOMMENDATION', 'Recommandation générée', {
      recommendation: recommendation.recommendation,
      max_loan_amount: recommendation.max_loan_amount
    });

    // 7. Sauvegarder les résultats
    const scoresOk = await saveAnalysisScores(job.analysis_id, metrics, scoreResult, logger);
    if (!scoresOk) {
      throw new Error('Failed to save scores');
    }

    const recommendationOk = await saveAnalysisRecommendation(
      job.analysis_id,
      recommendation,
      logger
    );
    if (!recommendationOk) {
      throw new Error('Failed to save recommendation');
    }

    // 8. Mettre à jour analyzed_at
    await updateAnalyzedTimestamp(job.analysis_id, logger);

    // 9. Marquer le job comme complété
    await updateJobStatus(job.id, 'completed', undefined, logger);

    const duration = performance.now() - startTime;
    logger.success(duration, {
      sar_score: scoreResult.sar_score,
      recommendation: recommendation.recommendation
    });

    return {
      success: true,
      jobId: job.id,
      analysisId: job.analysis_id
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('PROCESS', 'Échec du traitement du job', error as Error);
    logger.perf('FAILED', duration, { error: true });

    // Marquer le job comme échoué
    await updateJobStatus(job.id, 'failed', errorMessage, logger);

    return {
      success: false,
      jobId: job.id,
      analysisId: job.analysis_id,
      error: errorMessage
    };
  }
}

// ============================================================================
// Polling et Batch Processing
// ============================================================================

/**
 * Récupère les jobs en attente de traitement
 */
async function fetchPendingJobs(batchSize: number): Promise<AnalysisJob[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false }) // High priority d'abord
    .order('created_at', { ascending: true }) // FIFO pour même priorité
    .limit(batchSize);

  if (error || !data) {
    console.error('[Worker] Échec récupération jobs pending:', error);
    return [];
  }

  return data as AnalysisJob[];
}

/**
 * Traite un batch de jobs en parallèle
 */
async function processBatch(jobs: AnalysisJob[]): Promise<ProcessJobResult[]> {
  console.log(`[Worker] Traitement de ${jobs.length} jobs en parallèle`);

  const results = await Promise.all(
    jobs.map(job => processJob(job))
  );

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`[Worker] Batch complété: ${successCount} succès, ${failureCount} échecs`);

  return results;
}

// ============================================================================
// Worker Principal
// ============================================================================

/**
 * Démarre le worker en mode polling continu
 */
export async function startAnalysisWorker(): Promise<void> {
  console.log('[Worker] Démarrage du worker d\'analyse');

  let isRunning = true;

  // Fonction pour arrêter proprement le worker
  const stopWorker = () => {
    console.log('[Worker] Arrêt du worker demandé');
    isRunning = false;
  };

  // Écouter les signaux d'arrêt
  process.on('SIGTERM', stopWorker);
  process.on('SIGINT', stopWorker);

  // Boucle principale de polling
  while (isRunning) {
    try {
      // 1. Récupérer les jobs pending
      const jobs = await fetchPendingJobs(WORKER_CONFIG.BATCH_SIZE);

      if (jobs.length > 0) {
        // 2. Traiter le batch
        await processBatch(jobs);
      } else {
        // Pas de jobs, attendre avant le prochain poll
        console.log('[Worker] Aucun job en attente, pause...');
      }

      // 3. Attendre avant le prochain poll
      await new Promise(resolve => setTimeout(resolve, WORKER_CONFIG.POLL_INTERVAL));

    } catch (error) {
      console.error('[Worker] Erreur dans la boucle de polling:', error);
      // Continuer malgré l'erreur après une pause
      await new Promise(resolve => setTimeout(resolve, WORKER_CONFIG.POLL_INTERVAL));
    }
  }

  console.log('[Worker] Worker arrêté proprement');
}

/**
 * Traite un seul job spécifique (pour appels ponctuels)
 */
export async function processAnalysisJob(jobId: string): Promise<ProcessJobResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      jobId,
      analysisId: '',
      error: 'Supabase unavailable'
    };
  }

  // Récupérer le job
  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return {
      success: false,
      jobId,
      analysisId: '',
      error: 'Job not found'
    };
  }

  // Traiter le job
  return await processJob(job as AnalysisJob);
}

// Exports
export default {
  startAnalysisWorker,
  processAnalysisJob,
  processBatch
};
