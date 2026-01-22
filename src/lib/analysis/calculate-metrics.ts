/**
 * Calculate Financial Metrics from Inverite Data
 * Extrait et calcule les métriques financières clés pour l'analyse SAR
 */

import type {
  InveriteFetchResponse,
  InveriteAccount,
  InveriteTransaction,
  InveritePayschedule,
  InveriteAccountStatistics
} from '@/types/inverite';
import type { FinancialMetrics, RedFlag } from '@/types/analysis';
import { parseInveriteAmount } from '@/types/inverite';

// ============================================================================
// Type Guards et Helpers
// ============================================================================

/**
 * Vérifie si un compte est un compte chèque/épargne (pas une carte de crédit)
 */
function isDepositAccount(account: InveriteAccount): boolean {
  const type = account.type?.toLowerCase();
  return type === 'chequing' || type === 'savings' || type === 'checking';
}

/**
 * Parse une date string au format YYYY-MM-DD vers Date
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Calcule le nombre de jours entre deux dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const ms = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Calcul du Revenu Mensuel
// ============================================================================

/**
 * Calcule le revenu mensuel depuis les payschedules détectés par Inverite
 */
function calculateMonthlyIncome(accounts: InveriteAccount[]): number {
  let totalMonthlyIncome = 0;

  for (const account of accounts) {
    if (!account.payschedules || account.payschedules.length === 0) {
      continue;
    }

    for (const payschedule of account.payschedules) {
      // Vérifier que c'est un revenu (pas une dépense récurrente)
      const isIncome = payschedule.income_type?.includes('income') ||
                       payschedule.income_type?.includes('paycheck') ||
                       payschedule.income_type?.includes('salary');

      if (isIncome && payschedule.monthly_income) {
        const monthlyAmount = parseInveriteAmount(payschedule.monthly_income);
        totalMonthlyIncome += monthlyAmount;
      }
    }
  }

  // Si aucun payschedule détecté, estimer depuis les crédits récurrents
  if (totalMonthlyIncome === 0) {
    totalMonthlyIncome = estimateIncomeFromTransactions(accounts);
  }

  return Math.round(totalMonthlyIncome * 100) / 100;
}

/**
 * Estime le revenu depuis les crédits récurrents (fallback)
 */
function estimateIncomeFromTransactions(accounts: InveriteAccount[]): number {
  const depositAccounts = accounts.filter(isDepositAccount);
  if (depositAccounts.length === 0) return 0;

  // Regrouper les crédits par montant similaire (±5%)
  const creditsByAmount: Map<number, number[]> = new Map();

  for (const account of depositAccounts) {
    if (!account.transactions) continue;

    for (const tx of account.transactions) {
      const creditAmount = parseInveriteAmount(tx.credit);
      if (creditAmount <= 0) continue;

      // Ignorer les très petits montants (< 100 CAD)
      if (creditAmount < 100) continue;

      // Trouver un montant similaire existant
      let foundGroup = false;
      for (const [avgAmount, amounts] of Array.from(creditsByAmount.entries())) {
        const diff = Math.abs(creditAmount - avgAmount) / avgAmount;
        if (diff <= 0.05) { // ±5%
          amounts.push(creditAmount);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        creditsByAmount.set(creditAmount, [creditAmount]);
      }
    }
  }

  // Trouver le groupe avec le plus d'occurrences (probablement le salaire)
  let maxOccurrences = 0;
  let likelyPayAmount = 0;

  for (const [avgAmount, amounts] of Array.from(creditsByAmount.entries())) {
    if (amounts.length > maxOccurrences) {
      maxOccurrences = amounts.length;
      likelyPayAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    }
  }

  // Si au moins 2 occurrences, considérer comme revenu récurrent
  if (maxOccurrences >= 2) {
    // Multiplier par fréquence estimée (bi-weekly = ~2.17 par mois)
    return Math.round(likelyPayAmount * 2.17 * 100) / 100;
  }

  return 0;
}

// ============================================================================
// Calcul des Dépenses Mensuelles
// ============================================================================

/**
 * Calcule les dépenses mensuelles moyennes
 */
function calculateMonthlyExpenses(accounts: InveriteAccount[]): number {
  const depositAccounts = accounts.filter(isDepositAccount);
  if (depositAccounts.length === 0) return 0;

  let totalDebits = 0;
  let totalDays = 0;

  for (const account of depositAccounts) {
    const stats = account.statistics;
    if (!stats) continue;

    // Utiliser les stats 30 jours
    const debits30 = parseInveriteAmount(stats.debits_30_total || '0');
    if (debits30 > 0) {
      totalDebits += debits30;
      totalDays = 30;
    }
  }

  // Moyenne mensuelle
  if (totalDays > 0) {
    return Math.round((totalDebits / totalDays) * 30 * 100) / 100;
  }

  return 0;
}

// ============================================================================
// Calcul du DTI (Debt-to-Income Ratio)
// ============================================================================

/**
 * Calcule le ratio dette/revenu
 */
function calculateDTI(monthlyIncome: number, monthlyExpenses: number): number {
  if (monthlyIncome <= 0) return 0;

  const dti = monthlyExpenses / monthlyIncome;

  // Cap à 2.0 (200%) pour éviter les valeurs aberrantes
  return Math.min(dti, 2.0);
}

// ============================================================================
// Détection des Red Flags
// ============================================================================

/**
 * Compte les NSF (Non-Sufficient Funds) dans les 30 derniers jours
 */
function countNSF(accounts: InveriteAccount[]): number {
  let totalNSF = 0;

  for (const account of accounts) {
    if (!account.statistics) continue;

    const nsf30 = parseInt(account.statistics.nsf_30_count || '0');
    totalNSF += nsf30;

    // Aussi compter depuis les flags de transactions
    if (account.transactions) {
      for (const tx of account.transactions) {
        if (tx.flags?.includes('is_nsf')) {
          // Vérifier que c'est dans les 30 derniers jours
          const txDate = parseDate(tx.date);
          const daysAgo = daysBetween(txDate, new Date());
          if (daysAgo <= 30) {
            totalNSF++;
          }
        }
      }
    }
  }

  return totalNSF;
}

/**
 * Compte les découverts dans les 30 derniers jours
 */
function countOverdrafts(accounts: InveriteAccount[]): number {
  let totalOverdrafts = 0;

  for (const account of accounts) {
    if (!account.statistics) continue;

    const overdraft30 = parseInt(account.statistics.overdraft_30_count || '0');
    totalOverdrafts += overdraft30;

    // Aussi compter depuis les flags de transactions
    if (account.transactions) {
      for (const tx of account.transactions) {
        if (tx.flags?.includes('is_overdraft')) {
          const txDate = parseDate(tx.date);
          const daysAgo = daysBetween(txDate, new Date());
          if (daysAgo <= 30) {
            totalOverdrafts++;
          }
        }
      }
    }
  }

  return totalOverdrafts;
}

/**
 * Détecte les indicateurs de faillite
 */
function detectBankruptcy(accounts: InveriteAccount[]): boolean {
  for (const account of accounts) {
    if (!account.transactions) continue;

    for (const tx of account.transactions) {
      if (tx.flags?.includes('is_bankruptcy_trustee')) {
        return true;
      }

      // Aussi chercher dans le texte des transactions
      const details = tx.details?.toLowerCase() || '';
      if (details.includes('bankruptcy') ||
          details.includes('trustee') ||
          details.includes('receiver') ||
          details.includes('faillite')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Détecte les prêts rapides (microloans)
 */
function detectMicroloans(accounts: InveriteAccount[], microloansData: any): boolean {
  // Si on a les données de microcheck, les utiliser
  if (microloansData?.has_microloans) {
    return true;
  }

  // Sinon, chercher dans les transactions
  const microLoanKeywords = [
    'money mart',
    'cash money',
    'payday',
    'easyfinancial',
    'fairstone',
    'lending',
    'advance',
    'quick cash'
  ];

  for (const account of accounts) {
    if (!account.transactions) continue;

    for (const tx of account.transactions) {
      const details = tx.details?.toLowerCase() || '';

      for (const keyword of microLoanKeywords) {
        if (details.includes(keyword)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Génère la liste des red flags détectés
 */
function generateRedFlags(
  nsfCount: number,
  overdraftCount: number,
  bankruptcyDetected: boolean,
  microloansDetected: boolean,
  accounts: InveriteAccount[]
): RedFlag[] {
  const redFlags: RedFlag[] = [];

  // NSF Flags
  if (nsfCount > 0) {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (nsfCount >= 5) severity = 'critical';
    else if (nsfCount >= 3) severity = 'high';
    else if (nsfCount >= 2) severity = 'medium';

    redFlags.push({
      type: 'NSF',
      severity,
      count: nsfCount,
      description: `${nsfCount} frais NSF détectés dans les 30 derniers jours`,
      impact: severity === 'critical' ? 'Impact majeur sur la décision' :
              severity === 'high' ? 'Impact significatif sur le score' :
              'Impact modéré sur le score'
    });
  }

  // Overdraft Flags
  if (overdraftCount > 0) {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overdraftCount >= 5) severity = 'critical';
    else if (overdraftCount >= 3) severity = 'high';
    else if (overdraftCount >= 2) severity = 'medium';

    redFlags.push({
      type: 'OVERDRAFT',
      severity,
      count: overdraftCount,
      description: `${overdraftCount} découverts détectés dans les 30 derniers jours`,
      impact: severity === 'critical' ? 'Impact majeur sur la décision' :
              severity === 'high' ? 'Impact significatif sur le score' :
              'Impact modéré sur le score'
    });
  }

  // Bankruptcy Flag
  if (bankruptcyDetected) {
    redFlags.push({
      type: 'BANKRUPTCY',
      severity: 'critical',
      count: 1,
      description: 'Indicateur de faillite détecté dans les transactions',
      impact: 'Déclinaison automatique recommandée'
    });
  }

  // Microloan Flag
  if (microloansDetected) {
    redFlags.push({
      type: 'MICROLOAN',
      severity: 'high',
      count: 1,
      description: 'Prêts rapides (payday loans) détectés',
      impact: 'Impact significatif sur le score et la décision'
    });
  }

  // Low Balance Flag
  const avgBalance = calculateAverageBalance(accounts);
  if (avgBalance < 500) {
    redFlags.push({
      type: 'LOW_BALANCE',
      severity: avgBalance < 100 ? 'high' : 'medium',
      count: 1,
      description: `Solde moyen très bas (${Math.round(avgBalance)} CAD)`,
      impact: 'Risque de défaut de paiement élevé'
    });
  }

  return redFlags;
}

/**
 * Calcule le solde moyen des comptes
 */
function calculateAverageBalance(accounts: InveriteAccount[]): number {
  const depositAccounts = accounts.filter(isDepositAccount);
  if (depositAccounts.length === 0) return 0;

  let totalBalance = 0;

  for (const account of depositAccounts) {
    if (account.statistics?.mean_closing_balance) {
      totalBalance += parseInveriteAmount(account.statistics.mean_closing_balance);
    }
  }

  return totalBalance / depositAccounts.length;
}

// ============================================================================
// Calcul de l'Account Health Score
// ============================================================================

/**
 * Calcule un score de santé du compte (0-1000)
 */
function calculateAccountHealth(
  nsfCount: number,
  overdraftCount: number,
  monthlyIncome: number,
  avgBalance: number
): number {
  let health = 1000; // Commencer à 1000 (parfait)

  // Pénalités NSF (-100 par NSF, max -500)
  health -= Math.min(nsfCount * 100, 500);

  // Pénalités découverts (-50 par overdraft, max -300)
  health -= Math.min(overdraftCount * 50, 300);

  // Pénalité si revenu faible (< 2000/mois)
  if (monthlyIncome < 2000) {
    health -= 150;
  }

  // Pénalité si solde moyen très bas
  if (avgBalance < 500) {
    health -= 100;
  }
  if (avgBalance < 100) {
    health -= 100; // Pénalité additionnelle
  }

  // Assurer que le score reste entre 0 et 1000
  return Math.max(0, Math.min(1000, health));
}

// ============================================================================
// Fonction Principale: Calculate Metrics
// ============================================================================

/**
 * Calcule toutes les métriques financières depuis les données Inverite
 */
export function calculateFinancialMetrics(
  inveriteData: InveriteFetchResponse,
  microloansData?: any
): FinancialMetrics {
  const accounts = inveriteData.accounts || [];

  // 1. Revenus et dépenses
  const monthly_income = calculateMonthlyIncome(accounts);
  const monthly_expenses = calculateMonthlyExpenses(accounts);

  // 2. DTI
  const dti_ratio = calculateDTI(monthly_income, monthly_expenses);

  // 3. Red flags
  const nsf_count = countNSF(accounts);
  const overdraft_count = countOverdrafts(accounts);
  const bankruptcy_detected = detectBankruptcy(accounts);
  const microloans_detected = detectMicroloans(accounts, microloansData);

  // 4. Account health
  const avgBalance = calculateAverageBalance(accounts);
  const account_health = calculateAccountHealth(
    nsf_count,
    overdraft_count,
    monthly_income,
    avgBalance
  );

  // 5. Red flags détaillés
  const red_flags = generateRedFlags(
    nsf_count,
    overdraft_count,
    bankruptcy_detected,
    microloans_detected,
    accounts
  );

  return {
    monthly_income,
    monthly_expenses,
    dti_ratio,
    nsf_count,
    overdraft_count,
    bankruptcy_detected,
    microloans_detected,
    account_health,
    red_flags
  };
}

// Export par défaut
export default calculateFinancialMetrics;
