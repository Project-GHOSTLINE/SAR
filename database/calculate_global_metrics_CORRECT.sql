-- ============================================================================
-- CALCUL DES MÉTRIQUES GLOBALES (VERSION FINALE CORRECTE)
-- ============================================================================
-- Basé sur la structure RÉELLE trouvée dans le code
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Total Clients (total_clients)
-- ============================================================================

DO $$
DECLARE
  v_total_clients INTEGER;
BEGIN
  SELECT COUNT(DISTINCT client_email)
  INTO v_total_clients
  FROM client_analyses
  WHERE client_email IS NOT NULL;

  PERFORM upsert_metric_value(
    p_metric_key := 'total_clients',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_total_clients
  );

  RAISE NOTICE '✅ total_clients: % clients', v_total_clients;
END $$;

-- ============================================================================
-- 2. Revenue MTD (total_revenue_mtd)
-- ============================================================================

DO $$
BEGIN
  PERFORM upsert_metric_value(
    p_metric_key := 'total_revenue_mtd',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := 0
  );

  RAISE NOTICE '⚠️  total_revenue_mtd: $0.00 (pas de table de revenus)';
END $$;

-- ============================================================================
-- 3. Active Loans (active_loans)
-- ============================================================================

DO $$
BEGIN
  PERFORM upsert_metric_value(
    p_metric_key := 'active_loans',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := 0
  );

  RAISE NOTICE '⚠️  active_loans: 0 prêts (pas de table de prêts)';
END $$;

-- ============================================================================
-- 4. Open Fraud Cases (fraud_cases_open)
-- ============================================================================

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

  RAISE NOTICE '✅ fraud_cases_open: % cas', v_fraud_cases_open;
END $$;

-- ============================================================================
-- 5. VoPay Success Rate (vopay_success_rate)
-- ============================================================================
-- CORRIGÉ: status = 'successful' (pas 'success')

DO $$
DECLARE
  v_total_transactions INTEGER;
  v_successful_transactions INTEGER;
  v_success_rate DECIMAL(5, 4);
BEGIN
  -- Total webhooks
  SELECT COUNT(*)
  INTO v_total_transactions
  FROM vopay_webhook_logs;

  -- Webhooks réussis (status = 'successful')
  SELECT COUNT(*)
  INTO v_successful_transactions
  FROM vopay_webhook_logs
  WHERE status = 'successful';

  -- Calculer le taux
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

  RAISE NOTICE '✅ vopay_success_rate: % %% (% successful / % total)',
    ROUND(v_success_rate * 100, 2),
    v_successful_transactions,
    v_total_transactions;
END $$;

-- ============================================================================
-- 6. VoPay Pending (vopay_pending)
-- ============================================================================
-- CORRIGÉ: status IN ('pending', 'in progress')

DO $$
DECLARE
  v_vopay_pending INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_vopay_pending
  FROM vopay_webhook_logs
  WHERE status IN ('pending', 'in progress');

  PERFORM upsert_metric_value(
    p_metric_key := 'vopay_pending',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_vopay_pending
  );

  RAISE NOTICE '✅ vopay_pending: % transactions', v_vopay_pending;
END $$;

-- ============================================================================
-- 7. VoPay Failed (vopay_failed)
-- ============================================================================
-- CORRIGÉ: status IN ('failed', 'cancelled')

DO $$
DECLARE
  v_vopay_failed INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_vopay_failed
  FROM vopay_webhook_logs
  WHERE status IN ('failed', 'cancelled');

  PERFORM upsert_metric_value(
    p_metric_key := 'vopay_failed',
    p_entity_type := 'global',
    p_entity_id := NULL,
    p_period_label := NULL,
    p_value_numeric := v_vopay_failed
  );

  RAISE NOTICE '✅ vopay_failed: % transactions', v_vopay_failed;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION DES RÉSULTATS
-- ============================================================================

SELECT
  metric_key,
  value_numeric,
  CASE
    WHEN metric_key LIKE '%rate%' THEN ROUND(value_numeric * 100, 2) || '%'
    WHEN metric_key LIKE '%revenue%' THEN '$' || value_numeric::TEXT
    ELSE value_numeric::TEXT
  END as formatted_value,
  computed_at
FROM metric_values
WHERE entity_type = 'global'
  AND is_current = true
ORDER BY metric_key;
