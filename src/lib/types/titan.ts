/**
 * 🚀 TITAN SYSTEM - TypeScript Types
 * Types complets pour le système de gestion de prêts avec Intelligence
 */

// ============================================
// TYPES DE BASE
// ============================================

export type MargillOrigin = 'argentrapide' | 'creditsecours'

export type LoanApplicationStatus =
  | 'draft'       // En cours de rédaction
  | 'submitted'   // Soumis à Margill avec succès
  | 'accepted'    // Accepté par Margill
  | 'rejected'    // Rejeté (Margill ou Cortex)
  | 'failed'      // Erreur technique

export type RiskLevel = 'low' | 'medium' | 'high'

export type StatutEmploi = 'salarie' | 'autonome' | 'retraite' | 'sans_emploi'
export type FrequencePaie = 'hebdomadaire' | 'bi_hebdomadaire' | 'mensuel'
export type TypeLogement = 'proprietaire' | 'locataire' | 'autre'
export type TypeCompte = 'cheque' | 'epargne'

// ============================================
// LOAN APPLICATION (38 CHAMPS MARGILL)
// ============================================

export interface LoanApplication {
  // Identifiants
  id: string
  reference: string // SAR-LP-000001

  // Origine & Status
  origin: MargillOrigin
  status: LoanApplicationStatus

  // === 38 CHAMPS MARGILL ===

  // Informations personnelles (5)
  prenom: string
  nom: string
  courriel: string
  telephone: string
  date_naissance?: string // ISO date string

  // Adresse (6)
  adresse_rue?: string
  adresse_ville?: string
  adresse_province?: string
  adresse_code_postal?: string
  duree_residence_mois?: number
  type_logement?: TypeLogement

  // Montant et prêt (3)
  montant_demande: number // en cents
  raison_pret?: string
  duree_pret_mois?: number

  // Emploi (7)
  statut_emploi?: StatutEmploi
  employeur?: string
  poste?: string
  revenu_annuel?: number // en cents
  anciennete_emploi_mois?: number
  frequence_paie?: FrequencePaie
  prochaine_paie?: string // ISO date string

  // Informations bancaires (4)
  institution_financiere?: string
  transit?: string
  numero_compte?: string
  type_compte?: TypeCompte

  // Autres revenus (2)
  autres_revenus?: number // en cents
  source_autres_revenus?: string

  // Dettes (4)
  paiement_loyer_hypotheque?: number // en cents par mois
  autres_prets?: number // en cents par mois
  cartes_credit?: number // en cents par mois
  autres_dettes?: number // en cents par mois

  // Co-emprunteur (4)
  coemprunteur_prenom?: string
  coemprunteur_nom?: string
  coemprunteur_telephone?: string
  coemprunteur_revenu?: number // en cents

  // Références (6)
  reference_1_nom?: string
  reference_1_telephone?: string
  reference_1_relation?: string
  reference_2_nom?: string
  reference_2_telephone?: string
  reference_2_relation?: string

  // === MÉTADONNÉES SYSTÈME ===

  // Score & Intelligence
  cortex_score: number // 0-100
  cortex_rules_applied: string[] // IDs des règles appliquées
  risk_level?: RiskLevel

  // Margill
  margill_response?: MargillResponse
  margill_submitted_at?: string // ISO datetime
  margill_error?: string

  // Tracking
  form_started_at: string // ISO datetime
  form_completed_at?: string // ISO datetime
  submitted_at?: string // ISO datetime
  last_step_completed: number // 0-5

  // A/B Testing
  ab_test_variant?: string

  // Métadonnées
  ip_address?: string
  user_agent?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string

  // Timestamps
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
}

// Type pour création (sans champs auto-générés)
export type LoanApplicationCreate = Omit<
  LoanApplication,
  'id' | 'reference' | 'cortex_score' | 'cortex_rules_applied' | 'form_started_at' | 'last_step_completed' | 'created_at' | 'updated_at'
> & {
  reference?: string
  cortex_score?: number
  cortex_rules_applied?: string[]
}

// Type pour mise à jour (tous optionnels sauf id)
export type LoanApplicationUpdate = Partial<Omit<LoanApplication, 'id' | 'created_at'>>

// Type pour les données du formulaire (avant soumission)
export interface LoanApplicationFormData {
  origin: MargillOrigin

  // Step 1: Infos personnelles
  prenom: string
  nom: string
  courriel: string
  telephone: string
  date_naissance?: string

  // Step 1: Adresse
  adresse_rue?: string
  adresse_ville?: string
  adresse_province?: string
  adresse_code_postal?: string
  duree_residence_mois?: number
  type_logement?: TypeLogement

  // Step 2: Emploi
  statut_emploi?: StatutEmploi
  employeur?: string
  poste?: string
  revenu_annuel?: number
  anciennete_emploi_mois?: number
  frequence_paie?: FrequencePaie
  prochaine_paie?: string
  autres_revenus?: number
  source_autres_revenus?: string

  // Step 3: Prêt
  montant_demande: number
  raison_pret?: string
  duree_pret_mois?: number

  // Step 3: Dettes
  paiement_loyer_hypotheque?: number
  autres_prets?: number
  cartes_credit?: number
  autres_dettes?: number

  // Step 4: Banque
  institution_financiere?: string
  transit?: string
  numero_compte?: string
  type_compte?: TypeCompte

  // Step 4: Co-emprunteur
  coemprunteur_prenom?: string
  coemprunteur_nom?: string
  coemprunteur_telephone?: string
  coemprunteur_revenu?: number

  // Step 4: Références
  reference_1_nom?: string
  reference_1_telephone?: string
  reference_1_relation?: string
  reference_2_nom?: string
  reference_2_telephone?: string
  reference_2_relation?: string
}

// ============================================
// MARGILL API
// ============================================

export interface MargillPayload {
  origin: string // 'argentrapide' | 'creditsecours'

  // Questions/réponses format Margill
  question1: string
  answer1: string
  question2: string
  answer2: string
  // ... jusqu'à question38/answer38
  [key: string]: string | number
}

export interface MargillResponse {
  success: boolean
  error?: string
  message?: string
  application_id?: string // ID Margill
  status?: string
  data?: Record<string, unknown>
}

export interface MargillConfig {
  endpoint: string // https://argentrapide.margill.com/process_json_form.aspx
  origin: MargillOrigin
  timeout: number // ms
  retryAttempts: number
}

// ============================================
// CORTEX INTELLIGENCE
// ============================================

export type CortexRuleType = 'validation' | 'scoring' | 'routing' | 'automation'

export interface JsonLogicCondition {
  [operator: string]: unknown[]
}

export interface CortexRule {
  id: string
  name: string
  description?: string
  rule_type: CortexRuleType

  // Condition (JsonLogic format)
  condition: JsonLogicCondition

  // Action à exécuter si condition = true
  action: CortexAction

  // Priorité (ordre d'exécution)
  priority: number

  // Statistiques
  times_triggered: number
  last_triggered_at?: string

  active: boolean
  created_at: string
  updated_at: string
}

export interface CortexAction {
  // Validation
  reject?: boolean
  reason?: string

  // Scoring
  score?: number // +/- points
  flag?: string // Tag pour analytics

  // Routing
  route_to?: string // 'auto_approve' | 'manual_review' | 'reject'

  // Automation
  trigger_workflow?: string // ID workflow à déclencher

  // Métadonnées
  metadata?: Record<string, unknown>
}

export interface CortexExecutionLog {
  id: string
  application_id: string
  rule_id?: string
  rule_name: string
  rule_type: CortexRuleType
  condition_met: boolean
  action_taken?: CortexAction
  execution_time_ms: number
  created_at: string
}

export interface CortexResult {
  score: number // Score final 0-100
  risk_level: RiskLevel
  rules_applied: Array<{
    rule_id: string
    rule_name: string
    action: CortexAction
    score_impact: number
  }>
  should_reject: boolean
  rejection_reason?: string
  route_to?: string
  execution_time_ms: number
}

// ============================================
// OBJECTIFS & MÉTRIQUES
// ============================================

export type MetricType =
  | 'conversion_rate'
  | 'approval_rate'
  | 'avg_amount'
  | 'response_time'
  | 'custom'

export type ObjectivePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface LoanObjective {
  id: string
  name: string
  description?: string
  metric_type: MetricType
  target_value: number
  current_value: number
  period: ObjectivePeriod
  active: boolean
  alert_threshold?: number
  alert_email?: string
  created_at: string
  updated_at: string
}

export interface MetricLog {
  id: string
  metric_name: string
  value: number
  dimension_1?: string // Ex: origin
  dimension_2?: string // Ex: device type
  dimension_3?: string // Ex: browser
  metadata?: Record<string, unknown>
  recorded_at: string
}

export interface MetricsDailySummary {
  date: string
  metric_name: string
  dimension_1?: string
  count: number
  total_value: number
  avg_value: number
  min_value: number
  max_value: number
  stddev_value?: number
}

// ============================================
// A/B TESTING
// ============================================

export type ABTestType =
  | 'form_steps'
  | 'field_order'
  | 'validation_rules'
  | 'ui_design'
  | 'messaging'
  | 'other'

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed'

export type ABTestVariant = 'A' | 'B'

export interface ABTest {
  id: string
  name: string
  description?: string
  test_type: ABTestType

  // Variants
  variant_a: Record<string, unknown>
  variant_b: Record<string, unknown>

  // Distribution
  traffic_split: number // 0-100 (% pour variant B)

  // Status
  status: ABTestStatus
  started_at?: string
  ended_at?: string

  // Résultats
  results?: ABTestResults
  winner?: ABTestVariant | 'no_winner'
  confidence_level?: number // 0-1

  created_at: string
  updated_at: string
}

export interface ABTestResults {
  variant_a: ABTestVariantResults
  variant_b: ABTestVariantResults
  statistical_significance: number // p-value
  confidence_level: number
  winner?: ABTestVariant | 'no_winner'
}

export interface ABTestVariantResults {
  participants: number
  conversions: number
  conversion_rate: number
  avg_amount: number
  avg_cortex_score: number
}

export interface ABTestAssignment {
  id: string
  test_id: string
  application_id: string
  variant: ABTestVariant
  assigned_at: string
}

// ============================================
// WORKFLOWS & AUTOMATION
// ============================================

export type WorkflowTriggerType =
  | 'application_submitted'
  | 'status_changed'
  | 'score_threshold'
  | 'schedule'
  | 'manual'

export type WorkflowActionType =
  | 'email'
  | 'sms'
  | 'webhook'
  | 'update_field'
  | 'create_task'
  | 'trigger_workflow'

export type WorkflowExecutionStatus = 'success' | 'failed' | 'running'

export interface Workflow {
  id: string
  name: string
  description?: string
  trigger_type: WorkflowTriggerType
  trigger_condition?: JsonLogicCondition

  // Actions à exécuter
  actions: WorkflowAction[]

  // Statistiques
  times_executed: number
  last_executed_at?: string
  success_count: number
  failure_count: number

  active: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowAction {
  type: WorkflowActionType

  // Email/SMS
  to?: string // Support variables: {{courriel}}, {{telephone}}
  template?: string
  subject?: string
  body?: string

  // Webhook
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  payload?: Record<string, unknown>

  // Update field
  field?: string
  value?: unknown

  // Métadonnées
  metadata?: Record<string, unknown>
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  application_id?: string
  trigger_data?: Record<string, unknown>
  status: WorkflowExecutionStatus
  actions_executed?: Array<{
    action: WorkflowAction
    success: boolean
    error?: string
    duration_ms: number
  }>
  error_message?: string
  execution_time_ms: number
  executed_at: string
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType = 'email' | 'sms'
export type NotificationStatus = 'sent' | 'failed' | 'queued' | 'bounced'
export type NotificationProvider = 'resend' | 'twilio'

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  subject?: string // Pour emails uniquement
  body: string // Support variables {{var}}
  variables: string[] // Liste des variables disponibles
  active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationLog {
  id: string
  application_id?: string
  type: NotificationType
  recipient: string
  template_name?: string
  status: NotificationStatus
  provider: NotificationProvider
  provider_id?: string
  error_message?: string
  sent_at: string
}

// ============================================
// ML/AI
// ============================================

export type MLModelType =
  | 'approval_prediction'
  | 'fraud_detection'
  | 'amount_recommendation'
  | 'churn_prediction'
  | 'custom'

export type MLModelStatus = 'training' | 'active' | 'deprecated' | 'failed'

export type MLAlgorithm =
  | 'random_forest'
  | 'xgboost'
  | 'neural_network'
  | 'logistic_regression'
  | 'svm'

export interface MLModel {
  id: string
  name: string
  model_type: MLModelType
  version: string
  algorithm: MLAlgorithm

  // Performance metrics
  accuracy?: number
  precision_score?: number
  recall?: number
  f1_score?: number
  auc_roc?: number

  // Configuration
  config?: {
    hyperparameters?: Record<string, unknown>
    features?: string[]
    training_data_size?: number
  }
  training_data_size?: number

  // Status
  status: MLModelStatus
  trained_at?: string
  activated_at?: string
  deprecated_at?: string

  created_at: string
}

export interface MLPrediction {
  id: string
  application_id: string
  model_id?: string
  prediction_type: string
  prediction_value: {
    // Approval prediction
    approval_probability?: number // 0-1

    // Fraud detection
    fraud_probability?: number // 0-1
    fraud_flags?: string[]

    // Amount recommendation
    recommended_amount?: number // en cents
    recommended_min?: number
    recommended_max?: number

    // Custom
    [key: string]: unknown
  }
  confidence: number // 0-1
  features_used?: Record<string, unknown>
  created_at: string
}

// ============================================
// SÉCURITÉ & API KEYS
// ============================================

export type APIKeyScope =
  | 'read:applications'
  | 'write:applications'
  | 'read:rules'
  | 'write:rules'
  | 'read:metrics'
  | 'write:metrics'
  | 'read:workflows'
  | 'write:workflows'
  | 'admin:*'

export interface APIKey {
  id: string
  name: string
  key_hash: string // Bcrypt hash
  prefix: string // Ex: 'sk_live_abc123'

  // Permissions
  scopes: APIKeyScope[]

  // Rate limiting
  rate_limit_per_hour: number
  requests_today: number
  last_request_at?: string

  // Status
  active: boolean
  expires_at?: string
  last_used_at?: string

  created_by?: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  api_key_id?: string
  action: string // 'application.create', 'rule.update', etc.
  resource_type?: string
  resource_id?: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
  created_at: string
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean
  errors?: ValidationError[]
  error?: string
  cleaned?: string
}

export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface FormStepValidation {
  step: number
  valid: boolean
  errors: ValidationError[]
}

// ============================================
// API RESPONSES
// ============================================

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errors?: ValidationError[]
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

export interface DashboardStats {
  today: {
    applications_started: number
    applications_completed: number
    applications_submitted: number
    conversion_rate: number
    avg_cortex_score: number
    avg_amount: number
  }

  this_week: {
    applications_started: number
    applications_completed: number
    applications_submitted: number
    conversion_rate: number
    approval_rate: number
  }

  this_month: {
    applications_started: number
    applications_completed: number
    applications_submitted: number
    conversion_rate: number
    approval_rate: number
    total_amount: number
  }

  objectives: Array<{
    objective: LoanObjective
    progress_percent: number
    status: 'on_track' | 'at_risk' | 'behind'
  }>
}

export interface FunnelAnalysis {
  stages: Array<{
    name: string
    count: number
    conversion_rate: number
    drop_off_rate: number
  }>
}

export interface CohortAnalysis {
  cohorts: Array<{
    date: string
    initial_count: number
    retention_by_week: number[]
  }>
}

// ============================================
// UTILITY TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type WithTimestamps<T> = T & {
  created_at: string
  updated_at: string
}
