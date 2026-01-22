/**
 * Calculate SAR Score (300-850)
 * Combine Inverite risk score avec métriques financières pour générer le score SAR
 */

import type { FinancialMetrics } from '@/types/analysis';
import type { SARScoreResult } from '@/types/analysis';

// ============================================================================
// Configuration et Seuils
// ============================================================================

const SCORE_CONFIG = {
  MIN_SCORE: 300,
  MAX_SCORE: 850,
  DEFAULT_SCORE: 575, // Score par défaut si pas de données Inverite

  // Pondérations des facteurs
  WEIGHTS: {
    INVERITE_BASE: 0.40,      // 40% du score vient d'Inverite
    INCOME_FACTOR: 0.20,       // 20% basé sur le revenu
    DTI_FACTOR: 0.15,          // 15% basé sur le DTI
    ACCOUNT_HEALTH: 0.15,      // 15% basé sur la santé du compte
    HISTORY_FACTOR: 0.10       // 10% basé sur l'historique
  },

  // Seuils pour les calculs
  THRESHOLDS: {
    INCOME: {
      EXCELLENT: 5000,   // > 5000/mois
      GOOD: 3500,        // 3500-5000
      FAIR: 2500,        // 2500-3500
      POOR: 1500         // < 1500
    },
    DTI: {
      EXCELLENT: 0.30,   // < 30%
      GOOD: 0.40,        // 30-40%
      FAIR: 0.50,        // 40-50%
      POOR: 0.60         // > 60%
    },
    ACCOUNT_HEALTH: {
      EXCELLENT: 850,    // > 850/1000
      GOOD: 700,         // 700-850
      FAIR: 500,         // 500-700
      POOR: 300          // < 300
    }
  }
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Clamp une valeur entre min et max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalise un score de 0-1000 vers 300-850
 */
function normalizeToSARScale(score: number): number {
  // Score de 0-1000 => 300-850
  const normalized = 300 + (score / 1000) * (850 - 300);
  return Math.round(clamp(normalized, 300, 850));
}

/**
 * Normalise un score de 300-850 vers 0-1000
 */
function normalizeToInternalScale(score: number): number {
  // Score de 300-850 => 0-1000
  const normalized = ((score - 300) / (850 - 300)) * 1000;
  return Math.round(clamp(normalized, 0, 1000));
}

// ============================================================================
// Facteur 1: Contribution Inverite
// ============================================================================

/**
 * Calcule la contribution du score Inverite (si disponible)
 */
function calculateInveriteContribution(inveriteRiskScore?: number): number {
  if (!inveriteRiskScore) {
    // Pas de score Inverite => utiliser score par défaut
    return normalizeToInternalScale(SCORE_CONFIG.DEFAULT_SCORE);
  }

  // Inverite score est déjà sur l'échelle 300-850
  // Le normaliser sur 0-1000 pour calculs internes
  return normalizeToInternalScale(inveriteRiskScore);
}

// ============================================================================
// Facteur 2: Income Factor
// ============================================================================

/**
 * Calcule le facteur revenu (0-1000)
 */
function calculateIncomeFactor(monthlyIncome: number): number {
  const { INCOME } = SCORE_CONFIG.THRESHOLDS;

  if (monthlyIncome >= INCOME.EXCELLENT) {
    return 1000; // Revenu excellent
  } else if (monthlyIncome >= INCOME.GOOD) {
    // Interpolation linéaire entre GOOD et EXCELLENT
    const ratio = (monthlyIncome - INCOME.GOOD) / (INCOME.EXCELLENT - INCOME.GOOD);
    return 800 + (ratio * 200);
  } else if (monthlyIncome >= INCOME.FAIR) {
    // Interpolation entre FAIR et GOOD
    const ratio = (monthlyIncome - INCOME.FAIR) / (INCOME.GOOD - INCOME.FAIR);
    return 600 + (ratio * 200);
  } else if (monthlyIncome >= INCOME.POOR) {
    // Interpolation entre POOR et FAIR
    const ratio = (monthlyIncome - INCOME.POOR) / (INCOME.FAIR - INCOME.POOR);
    return 400 + (ratio * 200);
  } else {
    // Revenu très faible
    const ratio = monthlyIncome / INCOME.POOR;
    return ratio * 400;
  }
}

// ============================================================================
// Facteur 3: DTI Factor
// ============================================================================

/**
 * Calcule le facteur DTI (0-1000)
 * Plus le DTI est bas, meilleur est le score
 */
function calculateDTIFactor(dtiRatio: number): number {
  const { DTI } = SCORE_CONFIG.THRESHOLDS;

  if (dtiRatio <= DTI.EXCELLENT) {
    return 1000; // DTI excellent
  } else if (dtiRatio <= DTI.GOOD) {
    // Interpolation entre EXCELLENT et GOOD
    const ratio = (dtiRatio - DTI.EXCELLENT) / (DTI.GOOD - DTI.EXCELLENT);
    return 1000 - (ratio * 200);
  } else if (dtiRatio <= DTI.FAIR) {
    // Interpolation entre GOOD et FAIR
    const ratio = (dtiRatio - DTI.GOOD) / (DTI.FAIR - DTI.GOOD);
    return 800 - (ratio * 200);
  } else if (dtiRatio <= DTI.POOR) {
    // Interpolation entre FAIR et POOR
    const ratio = (dtiRatio - DTI.FAIR) / (DTI.POOR - DTI.FAIR);
    return 600 - (ratio * 200);
  } else {
    // DTI très élevé
    const ratio = Math.min(dtiRatio / 1.0, 1.0); // Cap à 100% DTI
    return 400 - (ratio * 400);
  }
}

// ============================================================================
// Facteur 4: Account Health Factor
// ============================================================================

/**
 * Calcule le facteur de santé du compte (0-1000)
 * Basé sur le account_health déjà calculé dans les metrics
 */
function calculateAccountHealthFactor(accountHealth: number): number {
  // account_health est déjà sur l'échelle 0-1000
  return accountHealth;
}

// ============================================================================
// Facteur 5: History Factor
// ============================================================================

/**
 * Calcule le facteur historique basé sur les payschedules et transactions
 */
function calculateHistoryFactor(metrics: FinancialMetrics): number {
  let historyScore = 800; // Commencer à un score moyen-haut

  // Bonus si revenu stable (pas de red flags sévères)
  const hasCriticalFlags = metrics.red_flags.some(flag => flag.severity === 'critical');
  if (!hasCriticalFlags) {
    historyScore += 100;
  }

  // Pénalité si plusieurs red flags
  const highSeverityFlags = metrics.red_flags.filter(
    flag => flag.severity === 'high' || flag.severity === 'critical'
  ).length;

  historyScore -= highSeverityFlags * 50;

  return clamp(historyScore, 0, 1000);
}

// ============================================================================
// Pénalités
// ============================================================================

/**
 * Calcule les pénalités basées sur les red flags
 */
function calculatePenalties(metrics: FinancialMetrics): number {
  let totalPenalty = 0;

  // Pénalité NSF (-10 points par NSF sur le score final)
  if (metrics.nsf_count > 0) {
    totalPenalty += metrics.nsf_count * 10;
  }

  // Pénalité overdrafts (-5 points par overdraft)
  if (metrics.overdraft_count > 0) {
    totalPenalty += metrics.overdraft_count * 5;
  }

  // Pénalité faillite (-150 points)
  if (metrics.bankruptcy_detected) {
    totalPenalty += 150;
  }

  // Pénalité microloans (-75 points)
  if (metrics.microloans_detected) {
    totalPenalty += 75;
  }

  return totalPenalty;
}

// ============================================================================
// Calcul de Confiance
// ============================================================================

/**
 * Calcule le niveau de confiance du score (0-1)
 */
function calculateConfidence(
  hasInveriteScore: boolean,
  monthlyIncome: number,
  metrics: FinancialMetrics
): number {
  let confidence = 0.5; // Commencer à 50%

  // +30% si on a un score Inverite
  if (hasInveriteScore) {
    confidence += 0.30;
  }

  // +20% si on a un revenu détecté > 0
  if (monthlyIncome > 0) {
    confidence += 0.20;
  }

  // -10% par red flag critique
  const criticalFlags = metrics.red_flags.filter(flag => flag.severity === 'critical').length;
  confidence -= criticalFlags * 0.10;

  // Assurer entre 0 et 1
  return clamp(confidence, 0, 1);
}

// ============================================================================
// Fonction Principale: Calculate SAR Score
// ============================================================================

/**
 * Calcule le SAR Score final (300-850) depuis les métriques et le score Inverite
 */
export function calculateSARScore(
  metrics: FinancialMetrics,
  inveriteRiskScore?: number
): SARScoreResult {
  const { WEIGHTS } = SCORE_CONFIG;

  // 1. Calculer chaque facteur (sur échelle 0-1000)
  const inveriteContribution = calculateInveriteContribution(inveriteRiskScore);
  const incomeFactor = calculateIncomeFactor(metrics.monthly_income);
  const dtiFactor = calculateDTIFactor(metrics.dti_ratio);
  const accountHealthFactor = calculateAccountHealthFactor(metrics.account_health);
  const historyFactor = calculateHistoryFactor(metrics);

  // 2. Score pondéré (0-1000)
  const weightedScore =
    (inveriteContribution * WEIGHTS.INVERITE_BASE) +
    (incomeFactor * WEIGHTS.INCOME_FACTOR) +
    (dtiFactor * WEIGHTS.DTI_FACTOR) +
    (accountHealthFactor * WEIGHTS.ACCOUNT_HEALTH) +
    (historyFactor * WEIGHTS.HISTORY_FACTOR);

  // 3. Appliquer les pénalités
  const penalties = calculatePenalties(metrics);
  const scoreBeforeNormalization = weightedScore - (penalties * 1.8); // Multiplier pour impact visible

  // 4. Normaliser sur l'échelle 0-1000
  const normalizedScore = clamp(scoreBeforeNormalization, 0, 1000);

  // 5. Convertir sur l'échelle SAR (300-850)
  const sarScore = normalizeToSARScale(normalizedScore);

  // 6. Calculer la confiance
  const confidence = calculateConfidence(
    !!inveriteRiskScore,
    metrics.monthly_income,
    metrics
  );

  // 7. Retourner le résultat complet
  return {
    sar_score: sarScore,
    sar_score_normalized: Math.round(normalizedScore),
    confidence,
    factors: {
      inverite_contribution: Math.round(inveriteContribution),
      income_factor: Math.round(incomeFactor),
      dti_factor: Math.round(dtiFactor),
      account_health_factor: Math.round(accountHealthFactor),
      history_factor: Math.round(historyFactor),
      penalties: -Math.round(penalties * 1.8) // Négatif pour afficher comme pénalité
    }
  };
}

// Export par défaut
export default calculateSARScore;
