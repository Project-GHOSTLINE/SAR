-- 013_add_performance_indexes.sql
-- Indexes de performance recommandés par ChatGPT (2026-01-14)
--
-- Optimise les requêtes timeline pour vw_client_timeline
-- Ces indexes accélèrent les queries sur l'historique client complet

-- ==============================================================================
-- INDEX 1: Communications Timeline (client_id + timestamp)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS comm_client_ts_idx
ON public.communications (client_id, occurred_at DESC)
WHERE client_id IS NOT NULL;

COMMENT ON INDEX public.comm_client_ts_idx IS 'Optimise queries timeline communications par client (recommandation GPT 2026-01-14)';

-- ==============================================================================
-- INDEX 2: Client Transactions Timeline (account_id + timestamp)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS ct_account_ts_idx
ON public.client_transactions (account_id, created_at DESC);

COMMENT ON INDEX public.ct_account_ts_idx IS 'Optimise queries timeline ledger par compte (recommandation GPT 2026-01-14)';

-- ==============================================================================
-- INDEX 3: Fraud Cases Timeline (application_id + timestamp)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS fraud_app_ts_idx
ON public.fraud_cases (application_id, reported_at DESC)
WHERE application_id IS NOT NULL;

COMMENT ON INDEX public.fraud_app_ts_idx IS 'Optimise queries timeline fraud par application (recommandation GPT 2026-01-14)';

-- ==============================================================================
-- VALIDATION
-- ==============================================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN ('comm_client_ts_idx', 'ct_account_ts_idx', 'fraud_app_ts_idx');

  IF index_count != 3 THEN
    RAISE EXCEPTION 'Indexes performance non créés correctement. Attendu: 3, Trouvé: %', index_count;
  END IF;

  RAISE NOTICE '✅ Performance Indexes: 3 indexes créés avec succès';
  RAISE NOTICE '   • comm_client_ts_idx (communications)';
  RAISE NOTICE '   • ct_account_ts_idx (client_transactions)';
  RAISE NOTICE '   • fraud_app_ts_idx (fraud_cases)';
END $$;
