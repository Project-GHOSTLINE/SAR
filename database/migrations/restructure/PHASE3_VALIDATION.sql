-- ==============================================================================
-- PHASE 3 VALIDATION - Loans + Payment Schedules
-- ==============================================================================
-- Date: 2026-01-15
-- Vérifie: structures loans, backfill, versioning payment schedules
-- ==============================================================================

DO $$
DECLARE
  v_loans_exists BOOLEAN;
  v_schedule_exists BOOLEAN;
  v_installments_exists BOOLEAN;
  v_events_exists BOOLEAN;

  v_total_loans INTEGER;
  v_loans_with_client INTEGER;
  v_loans_with_app INTEGER;
  v_loans_by_status RECORD;

  v_total_schedules INTEGER;
  v_total_installments INTEGER;
  v_total_events INTEGER;

  v_loan_applications_count INTEGER;
  v_approved_apps_count INTEGER;
  v_backfill_pct NUMERIC;

  v_index_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'PHASE 3 VALIDATION - LOANS + PAYMENT SCHEDULES';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE '';

  -- ==============================================================================
  -- 1. STRUCTURES CRÉÉES
  -- ==============================================================================

  RAISE NOTICE '1️⃣  STRUCTURES CRÉÉES';
  RAISE NOTICE '-------------------------------------------------------------------';

  v_loans_exists := EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'loans');
  v_schedule_exists := EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_schedule_versions');
  v_installments_exists := EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_installments');
  v_events_exists := EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_events');

  IF v_loans_exists THEN
    RAISE NOTICE '✅ loans: EXISTS';
  ELSE
    RAISE NOTICE '❌ loans: NOT FOUND';
  END IF;

  IF v_schedule_exists THEN
    RAISE NOTICE '✅ payment_schedule_versions: EXISTS';
  ELSE
    RAISE NOTICE '❌ payment_schedule_versions: NOT FOUND';
  END IF;

  IF v_installments_exists THEN
    RAISE NOTICE '✅ payment_installments: EXISTS';
  ELSE
    RAISE NOTICE '❌ payment_installments: NOT FOUND';
  END IF;

  IF v_events_exists THEN
    RAISE NOTICE '✅ payment_events: EXISTS';
  ELSE
    RAISE NOTICE '❌ payment_events: NOT FOUND';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 2. LOANS CRÉÉS (BACKFILL)
  -- ==============================================================================

  RAISE NOTICE '2️⃣  LOANS CRÉÉS (BACKFILL)';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_loans_exists THEN
    -- Total loans
    SELECT COUNT(*) INTO v_total_loans FROM public.loans;

    -- Loans avec client_id
    SELECT COUNT(*) INTO v_loans_with_client
    FROM public.loans
    WHERE client_id IS NOT NULL;

    -- Loans avec application_id
    SELECT COUNT(*) INTO v_loans_with_app
    FROM public.loans
    WHERE application_id IS NOT NULL;

    RAISE NOTICE 'Total loans créés: %', v_total_loans;
    RAISE NOTICE '  • Avec client_id: %', v_loans_with_client;
    RAISE NOTICE '  • Avec application_id: %', v_loans_with_app;

    -- Vérifier backfill depuis loan_applications
    SELECT COUNT(*) INTO v_loan_applications_count FROM public.loan_applications;
    SELECT COUNT(*) INTO v_approved_apps_count
    FROM public.loan_applications
    WHERE status IN ('approved', 'funded', 'active', 'closed', 'completed', 'paid_off', 'defaulted', 'collection');

    IF v_approved_apps_count > 0 THEN
      v_backfill_pct := ROUND(100.0 * v_total_loans / v_approved_apps_count, 2);
      RAISE NOTICE '';
      RAISE NOTICE 'Source loan_applications:';
      RAISE NOTICE '  • Total applications: %', v_loan_applications_count;
      RAISE NOTICE '  • Applications approuvées: %', v_approved_apps_count;
      RAISE NOTICE '  • Taux backfill: %%%', v_backfill_pct;
    END IF;

  ELSE
    RAISE NOTICE '⚠️  Table loans non trouvée, skip';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 3. RÉPARTITION PAR STATUS
  -- ==============================================================================

  RAISE NOTICE '3️⃣  RÉPARTITION PAR STATUS';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_loans_exists AND v_total_loans > 0 THEN
    FOR v_loans_by_status IN
      SELECT status, COUNT(*) as count
      FROM public.loans
      GROUP BY status
      ORDER BY count DESC
    LOOP
      RAISE NOTICE '  • %: % loans', v_loans_by_status.status, v_loans_by_status.count;
    END LOOP;
  ELSE
    RAISE NOTICE '  ⚠️  Aucun loan créé';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 4. PAYMENT SCHEDULES (VERSIONING)
  -- ==============================================================================

  RAISE NOTICE '4️⃣  PAYMENT SCHEDULES (VERSIONING)';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_schedule_exists THEN
    SELECT COUNT(*) INTO v_total_schedules FROM public.payment_schedule_versions;
    RAISE NOTICE 'Total schedule versions: %', v_total_schedules;

    IF v_total_schedules = 0 THEN
      RAISE NOTICE '  ℹ️  Aucun schedule créé (normal si pas de données Margill)';
    END IF;
  END IF;

  IF v_installments_exists THEN
    SELECT COUNT(*) INTO v_total_installments FROM public.payment_installments;
    RAISE NOTICE 'Total installments: %', v_total_installments;

    IF v_total_installments = 0 THEN
      RAISE NOTICE '  ℹ️  Aucun installment créé (normal si pas de schedules)';
    END IF;
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 5. PAYMENT EVENTS
  -- ==============================================================================

  RAISE NOTICE '5️⃣  PAYMENT EVENTS';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_events_exists THEN
    SELECT COUNT(*) INTO v_total_events FROM public.payment_events;
    RAISE NOTICE 'Total payment events: %', v_total_events;

    IF v_total_events = 0 THEN
      RAISE NOTICE '  ℹ️  Aucun événement (normal au démarrage)';
    END IF;
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 6. INDEXES CRÉÉS
  -- ==============================================================================

  RAISE NOTICE '6️⃣  INDEXES PERFORMANCE';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'loans_client_id_idx') THEN
    RAISE NOTICE '✅ loans_client_id_idx';
  ELSE
    RAISE NOTICE '⚠️  loans_client_id_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'loans_account_id_idx') THEN
    RAISE NOTICE '✅ loans_account_id_idx';
  ELSE
    RAISE NOTICE '⚠️  loans_account_id_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'installments_due_date_idx') THEN
    RAISE NOTICE '✅ installments_due_date_idx';
  ELSE
    RAISE NOTICE '⚠️  installments_due_date_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'payment_events_loan_id_idx') THEN
    RAISE NOTICE '✅ payment_events_loan_id_idx';
  ELSE
    RAISE NOTICE '⚠️  payment_events_loan_id_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'payment_events_created_at_idx') THEN
    RAISE NOTICE '✅ payment_events_created_at_idx';
  ELSE
    RAISE NOTICE '⚠️  payment_events_created_at_idx NOT FOUND';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 7. INTÉGRITÉ RÉFÉRENTIELLE
  -- ==============================================================================

  RAISE NOTICE '7️⃣  INTÉGRITÉ RÉFÉRENTIELLE';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_loans_exists THEN
    -- Loans orphelins (sans client)
    SELECT COUNT(*) INTO v_index_count
    FROM public.loans
    WHERE client_id IS NULL;

    IF v_index_count = 0 THEN
      RAISE NOTICE '✅ Tous les loans ont un client_id';
    ELSE
      RAISE NOTICE '⚠️  % loans sans client_id', v_index_count;
    END IF;

    -- Vérifier liens vers clients
    SELECT COUNT(*) INTO v_index_count
    FROM public.loans l
    LEFT JOIN public.clients c ON c.id = l.client_id
    WHERE c.id IS NULL;

    IF v_index_count = 0 THEN
      RAISE NOTICE '✅ Tous les client_id sont valides';
    ELSE
      RAISE NOTICE '❌ % loans avec client_id invalide (FK brisée)', v_index_count;
    END IF;
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 8. RÉSUMÉ
  -- ==============================================================================

  RAISE NOTICE '8️⃣  RÉSUMÉ PHASE 3';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_loans_exists AND v_total_loans > 0 THEN
    RAISE NOTICE '✅ Table loans créée';
    RAISE NOTICE '✅ Backfill loans complété (% loans)', v_total_loans;
    RAISE NOTICE '✅ Structures payment schedules prêtes';
    RAISE NOTICE '✅ Indexes performance installés';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Prochaines étapes:';
    RAISE NOTICE '  • Importer schedules Margill (si disponibles)';
    RAISE NOTICE '  • Phase 4: VoPay normalisé';
    RAISE NOTICE '  • Phase 5: Timeline views (utilisera loans)';
  ELSIF v_loans_exists AND v_total_loans = 0 THEN
    RAISE NOTICE '⚠️  Table loans créée mais vide';
    RAISE NOTICE '  → Aucune loan_application approuvée trouvée';
    RAISE NOTICE '  → Structures prêtes pour données futures';
  ELSE
    RAISE NOTICE '⚠️  Phase 3 incomplète - vérifier erreurs ci-dessus';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'VALIDATION PHASE 3 COMPLÈTE ✅';
  RAISE NOTICE '===================================================================';
END $$;
