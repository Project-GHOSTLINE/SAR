/**
 * 📊 Metrics Logger
 * Utilitaire pour logger toutes les métriques du système
 */

import { createClient } from '@supabase/supabase-js'
import type { MetricLog } from '../types/titan'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * Logger une métrique dans la base de données
 */
export async function logMetric(params: {
  metric_name: string
  value: number
  dimension_1?: string
  dimension_2?: string
  dimension_3?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await supabase.from('metrics_log').insert({
      metric_name: params.metric_name,
      value: params.value,
      dimension_1: params.dimension_1,
      dimension_2: params.dimension_2,
      dimension_3: params.dimension_3,
      metadata: params.metadata,
      recorded_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[MetricsLogger] Failed to log metric:', error)
    // Ne pas throw pour ne pas bloquer le flow principal
  }
}

// ============================================
// MÉTRIQUES SPÉCIFIQUES
// ============================================

/**
 * Formulaire démarré
 */
export async function logFormStarted(origin: string, device?: string): Promise<void> {
  await logMetric({
    metric_name: 'form_started',
    value: 1,
    dimension_1: origin,
    dimension_2: device,
  })
}

/**
 * Étape de formulaire complétée
 */
export async function logStepCompleted(
  step: number,
  origin: string,
  timeMs: number
): Promise<void> {
  await logMetric({
    metric_name: `step_${step}_completed`,
    value: timeMs,
    dimension_1: origin,
    metadata: { step, duration_ms: timeMs },
  })
}

/**
 * Formulaire complété (tous les champs remplis)
 */
export async function logFormCompleted(
  origin: string,
  totalTimeMs: number
): Promise<void> {
  await logMetric({
    metric_name: 'form_completed',
    value: totalTimeMs,
    dimension_1: origin,
    metadata: { total_duration_ms: totalTimeMs },
  })
}

/**
 * Soumission Margill réussie
 */
export async function logMargillSuccess(
  origin: string,
  amount: number,
  durationMs: number
): Promise<void> {
  await logMetric({
    metric_name: 'margill_success',
    value: 1,
    dimension_1: origin,
    metadata: {
      amount_cents: amount,
      amount_dollars: amount / 100,
      duration_ms: durationMs,
    },
  })
}

/**
 * Soumission Margill échouée
 */
export async function logMargillFailure(
  origin: string,
  reason: string
): Promise<void> {
  await logMetric({
    metric_name: 'margill_failure',
    value: 1,
    dimension_1: origin,
    metadata: { reason },
  })
}

/**
 * Validation échouée
 */
export async function logValidationError(
  step: number,
  field: string,
  origin: string
): Promise<void> {
  await logMetric({
    metric_name: 'validation_error',
    value: 1,
    dimension_1: origin,
    dimension_2: `step_${step}`,
    dimension_3: field,
    metadata: { step, field },
  })
}

/**
 * Rate limit atteint
 */
export async function logRateLimitHit(identifier: string, endpoint: string): Promise<void> {
  await logMetric({
    metric_name: 'rate_limit_hit',
    value: 1,
    dimension_1: endpoint,
    metadata: { identifier },
  })
}

/**
 * Cortex score calculé
 */
export async function logCortexScore(
  applicationId: string,
  score: number,
  rulesApplied: number
): Promise<void> {
  await logMetric({
    metric_name: 'cortex_score',
    value: score,
    metadata: {
      application_id: applicationId,
      rules_applied: rulesApplied,
    },
  })
}

/**
 * Workflow exécuté
 */
export async function logWorkflowExecution(
  workflowId: string,
  success: boolean,
  durationMs: number
): Promise<void> {
  await logMetric({
    metric_name: success ? 'workflow_success' : 'workflow_failure',
    value: durationMs,
    metadata: {
      workflow_id: workflowId,
      duration_ms: durationMs,
    },
  })
}

/**
 * Notification envoyée
 */
export async function logNotificationSent(
  type: 'email' | 'sms',
  status: 'sent' | 'failed'
): Promise<void> {
  await logMetric({
    metric_name: `notification_${status}`,
    value: 1,
    dimension_1: type,
  })
}

/**
 * Prédiction ML effectuée
 */
export async function logMLPrediction(
  modelType: string,
  confidence: number
): Promise<void> {
  await logMetric({
    metric_name: 'ml_prediction',
    value: confidence,
    dimension_1: modelType,
  })
}

/**
 * API key utilisée
 */
export async function logAPIKeyUsage(apiKeyId: string, endpoint: string): Promise<void> {
  await logMetric({
    metric_name: 'api_key_usage',
    value: 1,
    dimension_1: endpoint,
    metadata: { api_key_id: apiKeyId },
  })

  // Mettre à jour last_used_at dans la table api_keys
  try {
    // First get current value
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('requests_today')
      .eq('id', apiKeyId)
      .single()

    await supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        requests_today: (keyData?.requests_today || 0) + 1,
      })
      .eq('id', apiKeyId)
  } catch (error) {
    console.error('[MetricsLogger] Failed to update API key usage:', error)
  }
}
