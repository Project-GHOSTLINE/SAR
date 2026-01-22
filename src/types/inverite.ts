/**
 * Types pour l'API Inverite
 * Basés sur la documentation officielle et les exemples réels
 */

// ============================================================================
// Inverite Transaction - Une transaction bancaire
// ============================================================================

export interface InveriteTransaction {
  date: string; // Format: "YYYY-MM-DD"
  details: string; // Description de la transaction
  category: string; // Catégorie auto-détectée (ex: "monthly_income/paycheck", "housing/rent")
  credit: string; // Montant entrant (STRING avec 2 décimales, ex: "2500.00")
  debit: string; // Montant sortant (STRING avec 2 décimales)
  balance: string; // Solde après transaction (STRING)
  flags: string[]; // Flags spéciaux (ex: ["is_payroll"], ["is_nsf"])
}

// Flags possibles dans les transactions
export type InveriteTransactionFlag =
  | 'is_payroll'
  | 'is_nsf'
  | 'is_overdraft'
  | 'is_return'
  | 'is_bankruptcy_trustee'
  | 'is_government_benefit';

// ============================================================================
// Inverite Payschedule - Détection automatique des revenus
// ============================================================================

export interface InveritePayschedule {
  score: number; // Confiance de la détection (0-1, où 1 = très confiant)
  details: string; // Description de la paie (ex: "Payroll ACME CORP")
  income_type: string; // Type de revenu (ex: "monthly_income/paycheck")
  monthly_income: string; // Revenu mensuel calculé (STRING avec 2 décimales)
  frequency: string; // Fréquence de paie (ex: "bi_weekly:parity_0:tuesday")
  payments?: InveriteTransaction[]; // Historique des paies détectées
  future_payments?: string[]; // Prochaines paies prévues (dates YYYY-MM-DD)
  missed_payments?: string[]; // Paies manquées (dates YYYY-MM-DD)
}

// ============================================================================
// Inverite Account Statistics - Statistiques sur 30/60/90 jours
// ============================================================================

export interface InveriteAccountStatistics {
  mean_closing_balance: string; // Solde moyen de fermeture (STRING)
  debits_30_count: string; // Nombre de débits sur 30 jours (STRING)
  credits_30_count: string; // Nombre de crédits sur 30 jours (STRING)
  debits_30_total: string; // Total des débits sur 30 jours (STRING)
  credits_30_total: string; // Total des crédits sur 30 jours (STRING)
  returns_30_count: string; // Nombre de retours sur 30 jours (STRING)
  nsf_30_count: string; // Nombre de frais NSF sur 30 jours (STRING)
  overdraft_30_count?: string; // Nombre de découverts sur 30 jours (STRING, optionnel)

  // Possibilité d'avoir aussi 60 et 90 jours
  debits_60_count?: string;
  credits_60_count?: string;
  debits_90_count?: string;
  credits_90_count?: string;
}

// ============================================================================
// Inverite Account - Un compte bancaire complet
// ============================================================================

export interface InveriteAccount {
  type: string; // Type de compte (ex: "chequing", "savings", "credit")
  bank: string; // Nom de la banque (ex: "Desjardins", "TD Canada Trust")
  institution: string; // Code institution (ex: "815" pour Desjardins)
  transit: string; // Numéro de transit (succursale)
  account: string; // Numéro de compte
  membership_number?: string; // Numéro de membre (optionnel)
  account_description?: string; // Description du compte (optionnel)
  routing_code?: string; // Code de routage (optionnel)

  statistics: InveriteAccountStatistics;
  transactions: InveriteTransaction[];
  payschedules: InveritePayschedule[];

  bank_pdf_statements?: InveriteBankPDFStatement[]; // Relevés PDF (optionnel)
}

// ============================================================================
// Bank PDF Statements - Relevés bancaires en PDF
// ============================================================================

export interface InveriteBankPDFStatement {
  name: string; // Nom du fichier (ex: "statement_jan_2021")
  link: string; // URL de téléchargement (ex: "https://inverite.com/pdf/xxx.pdf")
}

// ============================================================================
// Inverite Contact - Email ou téléphone
// ============================================================================

export interface InveriteContact {
  type: 'email' | 'phone';
  contact: string; // Email ou numéro de téléphone
}

// ============================================================================
// Inverite Account Validation - Validation automatique
// ============================================================================

export interface InveriteAccountValidation {
  type: string; // Type de validation (ex: "name_match", "address_match")
  result: 'PASS' | 'FAIL' | 'WARN'; // Résultat de la validation
  confidence: number; // Confiance (0-1)
  details: string; // Détails de la validation
}

// ============================================================================
// Inverite Fetch Response - Réponse complète de /api/v2/fetch/{guid}
// ============================================================================

export interface InveriteFetchResponse {
  name: string; // Nom complet du client
  complete_datetime: string; // Date de complétion (ex: "2021-02-09 14:26:55")
  status: string; // Statut (ex: "Verified", "Pending", "Failed")
  request: string; // GUID de la vérification
  type: string; // Type de vérification (ex: "bankverify")
  address: string; // Adresse du client
  referenceid?: string | null; // ID de référence externe (optionnel)

  contacts: InveriteContact[];
  accounts: InveriteAccount[];
  all_bank_pdf_statements?: InveriteBankPDFStatement[]; // Tous les relevés PDF
  account_validations?: InveriteAccountValidation[]; // Validations (optionnel)
}

// ============================================================================
// Inverite Risk Score Response - Réponse de /api/v2/risk
// ============================================================================

export interface InveriteRiskRequest {
  request: string; // GUID de la vérification
}

export interface InveriteRiskTaskResponse {
  task_id: string; // ID de la tâche pour polling
  status: 'pending' | 'processing'; // Statut initial
}

export interface InveriteRiskStatusResponse {
  request: string; // GUID de la vérification
  status: 'pending' | 'processing' | 'success' | 'failed';
  risk_score?: number; // Score 300-850 (si success)
  risk_level?: string; // Niveau (low, medium, high) (si success)
  factors?: {
    income_stability: string; // ex: "high", "medium", "low"
    spending_patterns: string; // ex: "good", "moderate", "poor"
    nsf_history: string; // ex: "none", "low", "medium", "high"
    bankruptcy_indicators: boolean;
  };
  error?: string; // Message d'erreur (si failed)
}

export type InveriteRiskResponse = InveriteRiskStatusResponse & {
  status: 'success';
  risk_score: number;
  risk_level: string;
  factors: NonNullable<InveriteRiskStatusResponse['factors']>;
};

// ============================================================================
// Inverite Microcheck - Détection de prêts rapides (payday loans)
// ============================================================================

export interface InveriteMicroloan {
  name: string; // Nom du prêteur (ex: "Money Mart")
  loan_count: number; // Nombre de prêts détectés
  total_borrowed: string; // Montant total emprunté (STRING)
  last_loan_date?: string; // Date du dernier prêt (YYYY-MM-DD, optionnel)
}

export interface InveriteMicrocheckRequest {
  guid: string; // GUID de la vérification
  days: number; // Nombre de jours à analyser (ex: 90)
}

export interface InveriteMicrocheckResponse {
  has_microloans: boolean; // True si des prêts rapides détectés
  lenders: InveriteMicroloan[]; // Liste des prêteurs détectés
  risk_level: string; // Niveau de risque (low, medium, high)
}

// ============================================================================
// Inverite PDF Report - Rapports PDF professionnels
// ============================================================================

export type InveritePDFReportType = 'income' | 'transaction';

export interface InveritePDFReportRequest {
  guid: string; // GUID de la vérification
  type: InveritePDFReportType; // Type de rapport (income ou transaction)
}

// La réponse est un Blob PDF, pas du JSON

// ============================================================================
// Inverite List Request - Liste toutes les demandes
// ============================================================================

export interface InveriteListRequest {
  status?: string; // Filtrer par status (ex: "Verified")
  email?: string; // Rechercher par email
  limit?: number; // Nombre max de résultats
  offset?: number; // Offset pour pagination
}

export interface InveriteListItem {
  request: string; // GUID
  name: string; // Nom du client
  email: string; // Email du client
  status: string; // Statut (Verified, Pending, etc.)
  complete_datetime: string; // Date de complétion
  type: string; // Type de vérification
}

export interface InveriteListResponse {
  requests: InveriteListItem[];
}

// ============================================================================
// Utility Types
// ============================================================================

// Type pour les montants (tous sont des strings dans l'API Inverite)
export type InveriteAmount = string;

// Helper pour parser les montants
export const parseInveriteAmount = (amount: InveriteAmount): number => {
  return parseFloat(amount || '0');
};

// Helper pour formater les montants
export const formatInveriteAmount = (amount: number): InveriteAmount => {
  return amount.toFixed(2);
};

// Type pour les dates Inverite
export type InveriteDate = string; // Format YYYY-MM-DD

// Helper pour parser les dates
export const parseInveriteDate = (date: InveriteDate): Date => {
  return new Date(date);
};
