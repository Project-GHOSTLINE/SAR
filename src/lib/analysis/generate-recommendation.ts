/**
 * Generate Loan Recommendation
 * Génère une recommandation de prêt basée sur le SAR Score et les métriques
 */

import type {
  FinancialMetrics,
  SARScoreResult,
  RecommendationResult,
  RedFlag,
  RecommendationType
} from '@/types/analysis';

// ============================================================================
// Configuration et Seuils
// ============================================================================

const RECOMMENDATION_CONFIG = {
  // Seuils de score pour les décisions
  SCORE_THRESHOLDS: {
    APPROVE: 650,      // Score >= 650 => Approve (si pas de red flags critiques)
    REVIEW: 500,       // Score 500-650 => Manual Review
    DECLINE: 500       // Score < 500 => Decline
  },

  // Montants de prêt basés sur le revenu mensuel
  LOAN_AMOUNTS: {
    MAX_MULTIPLIER: 0.50,     // Max 50% du revenu mensuel
    MIN_LOAN: 500,             // Montant minimum de prêt
    MAX_LOAN: 5000,            // Montant maximum de prêt (cap absolu)
    REVIEW_MULTIPLIER: 0.35,   // 35% du revenu pour cas en review
    DECLINE_MULTIPLIER: 0.20   // 20% du revenu pour cas déclinés (offre alternative)
  },

  // Facteurs d'ajustement basés sur DTI
  DTI_ADJUSTMENTS: {
    EXCELLENT: 1.0,    // DTI < 30% => pas d'ajustement
    GOOD: 0.9,         // DTI 30-40% => -10%
    FAIR: 0.75,        // DTI 40-50% => -25%
    POOR: 0.5          // DTI > 50% => -50%
  },

  // Confiance minimale pour auto-approval
  MIN_CONFIDENCE_FOR_AUTO_APPROVE: 0.7
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
 * Arrondit au multiple de 50 le plus proche
 */
function roundToNearest50(amount: number): number {
  return Math.round(amount / 50) * 50;
}

// ============================================================================
// Décision de Recommandation
// ============================================================================

/**
 * Détermine le type de recommandation basé sur le score et les red flags
 */
function determineRecommendationType(
  sarScore: number,
  metrics: FinancialMetrics,
  scoreConfidence: number
): RecommendationType {
  const { SCORE_THRESHOLDS, MIN_CONFIDENCE_FOR_AUTO_APPROVE } = RECOMMENDATION_CONFIG;

  // Règles de déclinaison automatique
  if (metrics.bankruptcy_detected) {
    return 'decline'; // Auto-decline si faillite
  }

  if (metrics.nsf_count >= 5 || metrics.overdraft_count >= 5) {
    return 'decline'; // Auto-decline si trop de NSF/overdrafts
  }

  // Règles basées sur le score
  if (sarScore >= SCORE_THRESHOLDS.APPROVE) {
    // Score élevé, mais vérifier la confiance et les red flags
    const hasCriticalFlags = metrics.red_flags.some(flag => flag.severity === 'critical');

    if (hasCriticalFlags || scoreConfidence < MIN_CONFIDENCE_FOR_AUTO_APPROVE) {
      return 'review'; // Nécessite revue manuelle
    }

    return 'approve'; // Approbation automatique
  } else if (sarScore >= SCORE_THRESHOLDS.REVIEW) {
    return 'review'; // Score moyen => revue manuelle
  } else {
    return 'decline'; // Score trop bas
  }
}

// ============================================================================
// Calcul du Montant Maximum de Prêt
// ============================================================================

/**
 * Calcule le DTI adjustment factor
 */
function getDTIAdjustment(dtiRatio: number): number {
  const { DTI_ADJUSTMENTS } = RECOMMENDATION_CONFIG;

  if (dtiRatio < 0.30) return DTI_ADJUSTMENTS.EXCELLENT;
  if (dtiRatio < 0.40) return DTI_ADJUSTMENTS.GOOD;
  if (dtiRatio < 0.50) return DTI_ADJUSTMENTS.FAIR;
  return DTI_ADJUSTMENTS.POOR;
}

/**
 * Calcule le montant maximum de prêt recommandé
 */
function calculateMaxLoanAmount(
  recommendation: RecommendationType,
  monthlyIncome: number,
  dtiRatio: number,
  sarScore: number
): number {
  const { LOAN_AMOUNTS } = RECOMMENDATION_CONFIG;

  // Si pas de revenu détecté, retourner 0
  if (monthlyIncome <= 0) {
    return 0;
  }

  // Déterminer le multiplicateur basé sur la recommandation
  let baseMultiplier: number;
  switch (recommendation) {
    case 'approve':
      baseMultiplier = LOAN_AMOUNTS.MAX_MULTIPLIER;
      break;
    case 'review':
      baseMultiplier = LOAN_AMOUNTS.REVIEW_MULTIPLIER;
      break;
    case 'decline':
      baseMultiplier = LOAN_AMOUNTS.DECLINE_MULTIPLIER;
      break;
  }

  // Ajuster selon le DTI
  const dtiAdjustment = getDTIAdjustment(dtiRatio);
  const adjustedMultiplier = baseMultiplier * dtiAdjustment;

  // Calculer le montant de base
  let loanAmount = monthlyIncome * adjustedMultiplier;

  // Bonus pour scores très élevés (700+)
  if (sarScore >= 700 && recommendation === 'approve') {
    loanAmount *= 1.15; // +15% pour excellent score
  }

  // Arrondir et appliquer les limites
  loanAmount = roundToNearest50(loanAmount);
  loanAmount = clamp(loanAmount, LOAN_AMOUNTS.MIN_LOAN, LOAN_AMOUNTS.MAX_LOAN);

  return loanAmount;
}

// ============================================================================
// Génération du Raisonnement
// ============================================================================

/**
 * Génère le texte de justification de la recommandation
 */
function generateReasoning(
  recommendation: RecommendationType,
  sarScore: number,
  metrics: FinancialMetrics,
  maxLoanAmount: number
): string {
  const parts: string[] = [];

  // Partie 1: Score SAR
  if (sarScore >= 700) {
    parts.push(`Score SAR excellent (${sarScore}/850)`);
  } else if (sarScore >= 650) {
    parts.push(`Score SAR bon (${sarScore}/850)`);
  } else if (sarScore >= 500) {
    parts.push(`Score SAR moyen (${sarScore}/850)`);
  } else {
    parts.push(`Score SAR faible (${sarScore}/850)`);
  }

  // Partie 2: Revenu
  if (metrics.monthly_income > 0) {
    parts.push(`revenu mensuel de ${Math.round(metrics.monthly_income)} CAD`);

    if (metrics.monthly_income >= 4000) {
      parts.push('revenu stable');
    } else if (metrics.monthly_income < 2000) {
      parts.push('revenu insuffisant');
    }
  } else {
    parts.push('revenu non détecté');
  }

  // Partie 3: DTI
  const dtiPercent = Math.round(metrics.dti_ratio * 100);
  if (metrics.dti_ratio < 0.30) {
    parts.push(`DTI excellent (${dtiPercent}%)`);
  } else if (metrics.dti_ratio < 0.50) {
    parts.push(`DTI acceptable (${dtiPercent}%)`);
  } else {
    parts.push(`DTI élevé (${dtiPercent}%)`);
  }

  // Partie 4: Red Flags
  const criticalFlags = metrics.red_flags.filter(flag => flag.severity === 'critical');
  const highFlags = metrics.red_flags.filter(flag => flag.severity === 'high');

  if (criticalFlags.length > 0) {
    const flagTypes = criticalFlags.map(f => f.type).join(', ');
    parts.push(`alertes critiques détectées (${flagTypes})`);
  } else if (highFlags.length > 0) {
    const flagTypes = highFlags.map(f => f.type).join(', ');
    parts.push(`alertes importantes détectées (${flagTypes})`);
  } else if (metrics.red_flags.length === 0) {
    parts.push('aucune alerte détectée');
  }

  // Partie 5: Décision
  let decisionText = '';
  switch (recommendation) {
    case 'approve':
      decisionText = `Approbation recommandée jusqu'à ${maxLoanAmount} CAD.`;
      break;
    case 'review':
      decisionText = `Revue manuelle requise. Montant suggéré: ${maxLoanAmount} CAD si approuvé.`;
      break;
    case 'decline':
      decisionText = `Déclinaison recommandée. Risque de défaut élevé.`;
      if (maxLoanAmount > 0) {
        decisionText += ` Offre alternative possible: ${maxLoanAmount} CAD.`;
      }
      break;
  }

  // Assembler le raisonnement
  const reasoning = parts.join(', ') + '. ' + decisionText;

  return reasoning;
}

// ============================================================================
// Filtrage des Red Flags Pertinents
// ============================================================================

/**
 * Filtre les red flags les plus pertinents pour la recommandation
 */
function filterRelevantRedFlags(redFlags: RedFlag[]): RedFlag[] {
  // Prioriser les flags critiques et high
  const sortedFlags = [...redFlags].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Retourner max 5 flags les plus importants
  return sortedFlags.slice(0, 5);
}

// ============================================================================
// Calcul de Confiance de la Recommandation
// ============================================================================

/**
 * Calcule le niveau de confiance de la recommandation (0-1)
 */
function calculateRecommendationConfidence(
  recommendation: RecommendationType,
  scoreConfidence: number,
  metrics: FinancialMetrics
): number {
  let confidence = scoreConfidence; // Commencer avec la confiance du score

  // Ajuster selon le type de recommandation
  if (recommendation === 'decline') {
    // Haute confiance pour les déclinaisons claires
    if (metrics.bankruptcy_detected || metrics.nsf_count >= 5) {
      confidence = Math.max(confidence, 0.9);
    }
  } else if (recommendation === 'approve') {
    // Réduire la confiance s'il y a des red flags
    const highSeverityFlags = metrics.red_flags.filter(
      flag => flag.severity === 'high' || flag.severity === 'critical'
    ).length;

    confidence -= highSeverityFlags * 0.05;
  }

  // 'review' garde la confiance du score

  return clamp(confidence, 0, 1);
}

// ============================================================================
// Fonction Principale: Generate Recommendation
// ============================================================================

/**
 * Génère une recommandation de prêt complète
 */
export function generateRecommendation(
  scoreResult: SARScoreResult,
  metrics: FinancialMetrics
): RecommendationResult {
  // 1. Déterminer le type de recommandation
  const recommendation = determineRecommendationType(
    scoreResult.sar_score,
    metrics,
    scoreResult.confidence
  );

  // 2. Calculer le montant maximum de prêt
  const maxLoanAmount = calculateMaxLoanAmount(
    recommendation,
    metrics.monthly_income,
    metrics.dti_ratio,
    scoreResult.sar_score
  );

  // 3. Générer le raisonnement
  const reasoning = generateReasoning(
    recommendation,
    scoreResult.sar_score,
    metrics,
    maxLoanAmount
  );

  // 4. Filtrer les red flags pertinents
  const relevantRedFlags = filterRelevantRedFlags(metrics.red_flags);

  // 5. Calculer la confiance de la recommandation
  const confidence = calculateRecommendationConfidence(
    recommendation,
    scoreResult.confidence,
    metrics
  );

  // 6. Retourner le résultat complet
  return {
    recommendation,
    max_loan_amount: maxLoanAmount,
    reasoning,
    confidence,
    red_flags: relevantRedFlags
  };
}

// Export par défaut
export default generateRecommendation;
