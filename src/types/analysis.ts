/**
 * Types pour le système d'analyse automatisé SAR
 * Correspondent aux tables: analysis_jobs, analysis_scores, analysis_recommendations
 */

// ============================================================================
// Analysis Jobs - Queue de traitement asynchrone
// ============================================================================

export interface AnalysisJob {
  id: string;
  analysis_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export type AnalysisJobStatus = AnalysisJob['status'];
export type AnalysisJobPriority = AnalysisJob['priority'];

// ============================================================================
// Analysis Scores - Métriques et scores calculés
// ============================================================================

export interface AnalysisScore {
  id: string;
  analysis_id: string;
  sar_score: number; // 300-850
  sar_score_normalized: number; // 0-1000
  monthly_income: number;
  monthly_expenses: number;
  dti_ratio: number; // Debt-to-Income ratio (0-1+)
  nsf_count: number;
  overdraft_count: number;
  bankruptcy_detected: boolean;
  microloans_detected: boolean;
  account_health: number; // 0-1000
  confidence: number; // 0-1
  created_at: string;
}

// ============================================================================
// Red Flags - Alertes et risques détectés
// ============================================================================

export type RedFlagType = 'NSF' | 'OVERDRAFT' | 'BANKRUPTCY' | 'MICROLOAN' | 'RETURNS' | 'LOW_BALANCE';
export type RedFlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RedFlag {
  type: RedFlagType;
  severity: RedFlagSeverity;
  count: number;
  description: string;
  impact?: string; // Impact sur la décision (optionnel)
}

// ============================================================================
// Analysis Recommendations - Recommandations de prêt
// ============================================================================

export type RecommendationType = 'approve' | 'decline' | 'review';

export interface AnalysisRecommendation {
  id: string;
  analysis_id: string;
  recommendation: RecommendationType;
  max_loan_amount: number;
  reasoning: string;
  confidence: number; // 0-1
  red_flags: RedFlag[];
  created_at: string;
}

// ============================================================================
// Financial Metrics - Métriques financières calculées
// ============================================================================

export interface FinancialMetrics {
  monthly_income: number;
  monthly_expenses: number;
  dti_ratio: number;
  nsf_count: number;
  overdraft_count: number;
  bankruptcy_detected: boolean;
  microloans_detected: boolean;
  account_health: number; // 0-1000
  red_flags: RedFlag[];
}

// ============================================================================
// SAR Score Result - Résultat complet du calcul de score
// ============================================================================

export interface SARScoreResult {
  sar_score: number; // 300-850
  sar_score_normalized: number; // 0-1000
  confidence: number; // 0-1
  factors: {
    inverite_contribution: number;
    income_factor: number;
    dti_factor: number;
    account_health_factor: number;
    history_factor: number;
    penalties: number; // Négatif
  };
}

// ============================================================================
// Complete Analysis Data - Données complètes d'une analyse (pour UI)
// ============================================================================

export interface CompleteAnalysisData {
  // Client info
  id: string;
  client_name: string;
  client_email?: string;
  client_phones?: string[];
  client_address?: string;

  // Source data
  source: string;
  inverite_guid?: string;
  inverite_risk_score?: number;
  risk_level?: string;
  microloans_data?: any;
  raw_data: any;

  // Timestamps
  created_at: string;
  analyzed_at?: string | null;

  // Calculated data (from joins)
  scores?: AnalysisScore | null;
  recommendation?: AnalysisRecommendation | null;
  job?: AnalysisJob | null;
}

// ============================================================================
// Helper Types
// ============================================================================

// Type pour les calculs intermédiaires
export interface MetricsCalculationContext {
  accounts: any[];
  transactions: any[];
  payschedules: any[];
  statistics: any;
}

// Type pour les résultats de recommendation
export interface RecommendationResult {
  recommendation: RecommendationType;
  max_loan_amount: number;
  reasoning: string;
  confidence: number;
  red_flags: RedFlag[];
}

// Type pour le statut d'analyse (loading states)
export type AnalysisStatus =
  | 'loading'           // Chargement initial
  | 'processing'        // Worker en train de calculer
  | 'completed'         // Analyse complétée avec scores
  | 'failed'            // Échec du processing
  | 'not_found';        // Analyse introuvable

// ============================================================================
// Utility Types
// ============================================================================

// Pour les updates partiels
export type PartialAnalysisScore = Partial<Omit<AnalysisScore, 'id' | 'analysis_id' | 'created_at'>>;
export type PartialAnalysisRecommendation = Partial<Omit<AnalysisRecommendation, 'id' | 'analysis_id' | 'created_at'>>;

// Pour les créations (sans ID auto-généré)
export type CreateAnalysisJob = Omit<AnalysisJob, 'id' | 'created_at' | 'started_at' | 'completed_at'>;
export type CreateAnalysisScore = Omit<AnalysisScore, 'id' | 'created_at'>;
export type CreateAnalysisRecommendation = Omit<AnalysisRecommendation, 'id' | 'created_at'>;
