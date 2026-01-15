-- ==============================================================================
-- PHASE 1 VALIDATION - Vérification Complète (Supabase Compatible)
-- ==============================================================================
-- Date: 2026-01-15
-- Vérifie: structures, données, liens, performance
-- ==============================================================================

DO $$
DECLARE
  v_total_clients INTEGER;
  v_with_email INTEGER;
  v_with_phone INTEGER;
  v_with_name INTEGER;
  v_avg_confidence NUMERIC;
  v_low_confidence INTEGER;

  v_la_total INTEGER; v_la_linked INTEGER; v_la_orphans INTEGER; v_la_pct NUMERIC;
  v_ca_total INTEGER; v_ca_linked INTEGER; v_ca_orphans INTEGER; v_ca_pct NUMERIC;
  v_an_total INTEGER; v_an_linked INTEGER; v_an_orphans INTEGER; v_an_pct NUMERIC;
  v_cm_total INTEGER; v_cm_linked INTEGER; v_cm_orphans INTEGER; v_cm_pct NUMERIC;
  v_st_total INTEGER; v_st_linked INTEGER; v_st_orphans INTEGER; v_st_pct NUMERIC;

  v_ct_count INTEGER;
  v_ee_count INTEGER;
  v_vwl_count INTEGER;

  v_total_linked INTEGER;
  v_total_records INTEGER;
  v_global_pct NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'PHASE 1 VALIDATION - RÉSULTATS';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE '';

  -- ==============================================================================
  -- 1. STRUCTURES CRÉÉES
  -- ==============================================================================

  RAISE NOTICE '1️⃣  STRUCTURES CRÉÉES';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    RAISE NOTICE '✅ clients: EXISTS';
  ELSE
    RAISE NOTICE '❌ clients: NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'client_identity_aliases') THEN
    RAISE NOTICE '✅ client_identity_aliases: EXISTS';
  ELSE
    RAISE NOTICE '❌ client_identity_aliases: NOT FOUND';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 2. COLONNES client_id AJOUTÉES
  -- ==============================================================================

  RAISE NOTICE '2️⃣  COLONNES client_id AJOUTÉES';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_applications' AND column_name = 'client_id') THEN
    RAISE NOTICE '✅ loan_applications.client_id: EXISTS';
  ELSE
    RAISE NOTICE '❌ loan_applications.client_id: NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'client_accounts' AND column_name = 'client_id') THEN
    RAISE NOTICE '✅ client_accounts.client_id: EXISTS';
  ELSE
    RAISE NOTICE '❌ client_accounts.client_id: NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'client_analyses' AND column_name = 'client_id') THEN
    RAISE NOTICE '✅ client_analyses.client_id: EXISTS';
  ELSE
    RAISE NOTICE '❌ client_analyses.client_id: NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'client_id') THEN
    RAISE NOTICE '✅ contact_messages.client_id: EXISTS';
  ELSE
    RAISE NOTICE '❌ contact_messages.client_id: NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'client_id') THEN
    RAISE NOTICE '✅ support_tickets.client_id: EXISTS';
  ELSE
    RAISE NOTICE '❌ support_tickets.client_id: NOT FOUND';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 3. CLIENTS CRÉÉS
  -- ==============================================================================

  RAISE NOTICE '3️⃣  CLIENTS CRÉÉS';
  RAISE NOTICE '-------------------------------------------------------------------';

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE primary_email IS NOT NULL),
    COUNT(*) FILTER (WHERE primary_phone IS NOT NULL),
    COUNT(*) FILTER (WHERE first_name IS NOT NULL AND last_name IS NOT NULL),
    ROUND(AVG(confidence_score), 2),
    COUNT(*) FILTER (WHERE confidence_score < 80)
  INTO v_total_clients, v_with_email, v_with_phone, v_with_name, v_avg_confidence, v_low_confidence
  FROM public.clients;

  RAISE NOTICE 'Total clients: %', v_total_clients;
  RAISE NOTICE '  • Avec email: %', v_with_email;
  RAISE NOTICE '  • Avec téléphone: %', v_with_phone;
  RAISE NOTICE '  • Avec nom complet: %', v_with_name;
  RAISE NOTICE '  • Confidence moyenne: %', v_avg_confidence;
  RAISE NOTICE '  • Low confidence (<80): %', v_low_confidence;
  RAISE NOTICE '';

  -- ==============================================================================
  -- 4. LIENS client_id (MATCHING RESULTS)
  -- ==============================================================================

  RAISE NOTICE '4️⃣  LIENS client_id (MATCHING RESULTS)';
  RAISE NOTICE '-------------------------------------------------------------------';

  -- loan_applications
  SELECT COUNT(*), COUNT(*) FILTER (WHERE client_id IS NOT NULL), COUNT(*) FILTER (WHERE client_id IS NULL)
  INTO v_la_total, v_la_linked, v_la_orphans
  FROM public.loan_applications;
  v_la_pct := ROUND(100.0 * v_la_linked / NULLIF(v_la_total, 0), 2);

  RAISE NOTICE 'loan_applications:';
  RAISE NOTICE '  Total: % | Linked: % | Orphans: % | %%: %', v_la_total, v_la_linked, v_la_orphans, v_la_pct;

  -- client_accounts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE client_id IS NOT NULL), COUNT(*) FILTER (WHERE client_id IS NULL)
  INTO v_ca_total, v_ca_linked, v_ca_orphans
  FROM public.client_accounts;
  v_ca_pct := ROUND(100.0 * v_ca_linked / NULLIF(v_ca_total, 0), 2);

  RAISE NOTICE 'client_accounts:';
  RAISE NOTICE '  Total: % | Linked: % | Orphans: % | %%: %', v_ca_total, v_ca_linked, v_ca_orphans, v_ca_pct;

  -- client_analyses
  SELECT COUNT(*), COUNT(*) FILTER (WHERE client_id IS NOT NULL), COUNT(*) FILTER (WHERE client_id IS NULL)
  INTO v_an_total, v_an_linked, v_an_orphans
  FROM public.client_analyses;
  v_an_pct := ROUND(100.0 * v_an_linked / NULLIF(v_an_total, 0), 2);

  RAISE NOTICE 'client_analyses:';
  RAISE NOTICE '  Total: % | Linked: % | Orphans: % | %%: %', v_an_total, v_an_linked, v_an_orphans, v_an_pct;

  -- contact_messages
  SELECT COUNT(*), COUNT(*) FILTER (WHERE client_id IS NOT NULL), COUNT(*) FILTER (WHERE client_id IS NULL)
  INTO v_cm_total, v_cm_linked, v_cm_orphans
  FROM public.contact_messages;
  v_cm_pct := ROUND(100.0 * v_cm_linked / NULLIF(v_cm_total, 0), 2);

  RAISE NOTICE 'contact_messages:';
  RAISE NOTICE '  Total: % | Linked: % | Orphans: % | %%: %', v_cm_total, v_cm_linked, v_cm_orphans, v_cm_pct;

  -- support_tickets
  SELECT COUNT(*), COUNT(*) FILTER (WHERE client_id IS NOT NULL), COUNT(*) FILTER (WHERE client_id IS NULL)
  INTO v_st_total, v_st_linked, v_st_orphans
  FROM public.support_tickets;
  v_st_pct := ROUND(100.0 * v_st_linked / NULLIF(v_st_total, 0), 2);

  RAISE NOTICE 'support_tickets:';
  RAISE NOTICE '  Total: % | Linked: % | Orphans: % | %%: %', v_st_total, v_st_linked, v_st_orphans, v_st_pct;
  RAISE NOTICE '';

  -- ==============================================================================
  -- 5. INDEXES PERFORMANCE CRÉÉS
  -- ==============================================================================

  RAISE NOTICE '5️⃣  INDEXES PERFORMANCE';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'comm_client_ts_idx') THEN
    RAISE NOTICE '✅ comm_client_ts_idx (communications)';
  ELSE
    RAISE NOTICE '⚠️  comm_client_ts_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'ct_account_ts_idx') THEN
    RAISE NOTICE '✅ ct_account_ts_idx (client_transactions)';
  ELSE
    RAISE NOTICE '⚠️  ct_account_ts_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'fraud_app_ts_idx') THEN
    RAISE NOTICE '✅ fraud_app_ts_idx (fraud_cases)';
  ELSE
    RAISE NOTICE '⚠️  fraud_app_ts_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'clients_primary_email_uniq') THEN
    RAISE NOTICE '✅ clients_primary_email_uniq';
  ELSE
    RAISE NOTICE '⚠️  clients_primary_email_uniq NOT FOUND';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 6. INTÉGRITÉ (RÈGLES NON NÉGOCIABLES)
  -- ==============================================================================

  RAISE NOTICE '6️⃣  INTÉGRITÉ (RÈGLES NON NÉGOCIABLES)';
  RAISE NOTICE '-------------------------------------------------------------------';

  -- client_transactions (doit avoir ~222k rows)
  SELECT COUNT(*) INTO v_ct_count FROM public.client_transactions;
  IF v_ct_count >= 222000 THEN
    RAISE NOTICE '✅ client_transactions: % rows (INTACT)', v_ct_count;
  ELSE
    RAISE NOTICE '⚠️  client_transactions: % rows (MODIFIÉ)', v_ct_count;
  END IF;

  -- emails_envoyes (doit avoir ~719 rows)
  SELECT COUNT(*) INTO v_ee_count FROM public.emails_envoyes;
  IF v_ee_count >= 700 THEN
    RAISE NOTICE '✅ emails_envoyes: % rows (INTACT)', v_ee_count;
  ELSE
    RAISE NOTICE '⚠️  emails_envoyes: % rows (MODIFIÉ)', v_ee_count;
  END IF;

  -- vopay_webhook_logs (doit avoir ~998 rows)
  SELECT COUNT(*) INTO v_vwl_count FROM public.vopay_webhook_logs;
  IF v_vwl_count >= 900 THEN
    RAISE NOTICE '✅ vopay_webhook_logs: % rows (INTACT)', v_vwl_count;
  ELSE
    RAISE NOTICE '⚠️  vopay_webhook_logs: % rows (MODIFIÉ)', v_vwl_count;
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 7. STATISTIQUES MATCHING GLOBALES
  -- ==============================================================================

  RAISE NOTICE '7️⃣  STATISTIQUES MATCHING GLOBALES';
  RAISE NOTICE '-------------------------------------------------------------------';

  v_total_linked := v_la_linked + v_ca_linked + v_an_linked + v_cm_linked + v_st_linked;
  v_total_records := v_la_total + v_ca_total + v_an_total + v_cm_total + v_st_total;
  v_global_pct := ROUND(100.0 * v_total_linked / NULLIF(v_total_records, 0), 2);

  RAISE NOTICE 'Total records liés: % / %', v_total_linked, v_total_records;
  RAISE NOTICE 'Taux matching global: %%%', v_global_pct;
  RAISE NOTICE '';

  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'VALIDATION COMPLÈTE ✅';
  RAISE NOTICE '===================================================================';
END $$;
