-- ============================================================================
-- CALCUL DES MÉTRIQUES GLOBALES
-- ============================================================================
-- Script pour calculer toutes les métriques globales (entity_type = 'global')
-- À exécuter manuellement ou via CRON pour mettre à jour les valeurs
-- ============================================================================

-- Fonction helper pour upsert (déjà créée dans metric_engine_schema.sql)
-- upsert_metric_value(metric_key, entity_type, entity_id, period_label, value_numeric, ...)

BEGIN;

-- ============================================================================
-- 1. Total Clients (total_clients)
-- ============================================================================
-- Compter le nombre total de clients uniques ayant au moins une analyse

DO $$
DECLARE
  v_total_clients INTEGER;
BEGIN
  -- Compter les clients distincts avec une analyse
  SELECT COUNT(DISTINCT client_email)
  INTO v_total_clients
  FROM client_analyses
  WHERE client_email IS NOT NULL;

  -- Insérer/mettre à jour la métrique
  PERFORM upsert_metric_value(
    p_metric_key := 'total_clients',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_total_clients
  );

  RAISE NOTICE 'total_clients: % clients', v_total_clients;
END $$;

-- ============================================================================
-- 2. Revenue MTD (total_revenue_mtd)
-- ============================================================================
-- Calculer le revenu total du mois en cours
-- Note: Nécessite une table de revenus/paiements (à adapter selon votre structure)

DO $$
DECLARE
  v_revenue_mtd DECIMAL(12, 2);
BEGIN
  -- Pour l'instant, on met 0 car pas de table de revenus
  -- TODO: Adapter quand la table de paiements/revenus sera créée
  v_revenue_mtd := 0;

  -- Exemple de calcul si vous avez une table 'payments' ou 'revenues':
  /*
  SELECT COALESCE(SUM(amount), 0)
  INTO v_revenue_mtd
  FROM payments
  WHERE status = 'completed'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
  */

  PERFORM upsert_metric_value(
    p_metric_key := 'total_revenue_mtd',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_revenue_mtd
  );

  RAISE NOTICE 'total_revenue_mtd: $ %', v_revenue_mtd;
END $$;

-- ============================================================================
-- 3. Active Loans (active_loans)
-- ============================================================================
-- Compter le nombre de prêts actifs
-- Note: Nécessite une table de prêts (à adapter selon votre structure)

DO $$
DECLARE
  v_active_loans INTEGER;
BEGIN
  -- Pour l'instant, on met 0 car pas de table de prêts
  -- TODO: Adapter quand la table de prêts sera créée
  v_active_loans := 0;

  -- Exemple de calcul si vous avez une table 'loans':
  /*
  SELECT COUNT(*)
  INTO v_active_loans
  FROM loans
  WHERE status IN ('active', 'pending', 'disbursed')
    AND paid_off_at IS NULL;
  */

  PERFORM upsert_metric_value(
    p_metric_key := 'active_loans',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_active_loans
  );

  RAISE NOTICE 'active_loans: % prêts', v_active_loans;
END $$;

-- ============================================================================
-- 4. Open Fraud Cases (fraud_cases_open)
-- ============================================================================
-- Compter le nombre de cas de fraude ouverts

DO $$
DECLARE
  v_fraud_cases_open INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_fraud_cases_open
  FROM fraud_cases
  WHERE status IN ('open', 'investigating')
    AND closed_at IS NULL;

  PERFORM upsert_metric_value(
    p_metric_key := 'fraud_cases_open',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_fraud_cases_open
  );

  RAISE NOTICE 'fraud_cases_open: % cas', v_fraud_cases_open;
END $$;

-- ============================================================================
-- 5. VoPay Success Rate (vopay_success_rate)
-- ============================================================================
-- Calculer le taux de succès des transactions VoPay

DO $$
DECLARE
  v_total_transactions INTEGER;
  v_successful_transactions INTEGER;
  v_success_rate DECIMAL(5, 4);
BEGIN
  -- Compter le nombre total de transactions VoPay
  SELECT COUNT(*)
  INTO v_total_transactions
  FROM vopay_webhook_logs;

  -- Compter les transactions réussies
  SELECT COUNT(*)
  INTO v_successful_transactions
  FROM vopay_webhook_logs
  WHERE status = 'success' OR event_type LIKE '%success%';

  -- Calculer le taux (en décimal: 0.95 = 95%)
  IF v_total_transactions > 0 THEN
    v_success_rate := v_successful_transactions::DECIMAL / v_total_transactions::DECIMAL;
  ELSE
    v_success_rate := 0;
  END IF;

  PERFORM upsert_metric_value(
    p_metric_key := 'vopay_success_rate',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_success_rate
  );

  RAISE NOTICE 'vopay_success_rate: % %%', (v_success_rate * 100);
END $$;

-- ============================================================================
-- 6. VoPay Pending (vopay_pending)
-- ============================================================================
-- Compter le nombre de transactions VoPay en attente

DO $$
DECLARE
  v_vopay_pending INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_vopay_pending
  FROM vopay_webhook_logs
  WHERE status = 'pending' OR event_type LIKE '%pending%';

  PERFORM upsert_metric_value(
    p_metric_key := 'vopay_pending',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_vopay_pending
  );

  RAISE NOTICE 'vopay_pending: % transactions', v_vopay_pending;
END $$;

-- ============================================================================
-- 7. VoPay Failed (vopay_failed)
-- ============================================================================
-- Compter le nombre de transactions VoPay échouées

DO $$
DECLARE
  v_vopay_failed INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_vopay_failed
  FROM vopay_webhook_logs
  WHERE status = 'failed' OR status = 'error' OR event_type LIKE '%failed%' OR event_type LIKE '%error%';

  PERFORM upsert_metric_value(
    p_metric_key := 'vopay_failed',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_vopay_failed
  );

  RAISE NOTICE 'vopay_failed: % transactions', v_vopay_failed;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION DES RÉSULTATS
-- ============================================================================

SELECT
  metric_key,
  value_numeric,
  computed_at
FROM metric_values
WHERE entity_type = 'global'
  AND is_current = true
ORDER BY metric_key;
