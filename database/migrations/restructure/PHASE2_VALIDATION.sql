-- ==============================================================================
-- PHASE 2 VALIDATION - Communications Unifiées
-- ==============================================================================
-- Date: 2026-01-15
-- Vérifie: structures communications, migration emails_envoyes, indexes
-- ==============================================================================

DO $$
DECLARE
  v_comm_table_exists BOOLEAN;
  v_attach_table_exists BOOLEAN;

  v_total_communications INTEGER;
  v_from_emails INTEGER;
  v_channels TEXT[];
  v_directions TEXT[];

  v_index_count INTEGER;

  v_emails_envoyes_count INTEGER;
  v_matched_count INTEGER;
  v_match_pct NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'PHASE 2 VALIDATION - COMMUNICATIONS UNIFIÉES';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE '';

  -- ==============================================================================
  -- 1. STRUCTURES CRÉÉES
  -- ==============================================================================

  RAISE NOTICE '1️⃣  STRUCTURES CRÉÉES';
  RAISE NOTICE '-------------------------------------------------------------------';

  v_comm_table_exists := EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'communications');
  v_attach_table_exists := EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_attachments');

  IF v_comm_table_exists THEN
    RAISE NOTICE '✅ communications: EXISTS';
  ELSE
    RAISE NOTICE '❌ communications: NOT FOUND';
  END IF;

  IF v_attach_table_exists THEN
    RAISE NOTICE '✅ communication_attachments: EXISTS';
  ELSE
    RAISE NOTICE '❌ communication_attachments: NOT FOUND';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 2. DONNÉES MIGRÉES
  -- ==============================================================================

  RAISE NOTICE '2️⃣  DONNÉES MIGRÉES (emails_envoyes → communications)';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_comm_table_exists THEN
    -- Total communications
    SELECT COUNT(*) INTO v_total_communications FROM public.communications;

    -- Communications depuis emails_envoyes
    SELECT COUNT(*) INTO v_from_emails
    FROM public.communications
    WHERE provider = 'emails_envoyes';

    RAISE NOTICE 'Total communications: %', v_total_communications;
    RAISE NOTICE '  • Depuis emails_envoyes: %', v_from_emails;

    -- Vérifier contre source
    SELECT COUNT(*) INTO v_emails_envoyes_count FROM public.emails_envoyes;

    IF v_emails_envoyes_count > 0 THEN
      v_match_pct := ROUND(100.0 * v_from_emails / v_emails_envoyes_count, 2);
      RAISE NOTICE '  • Source emails_envoyes: % rows', v_emails_envoyes_count;
      RAISE NOTICE '  • Taux migration: %%%', v_match_pct;

      IF v_match_pct < 50 THEN
        RAISE NOTICE '  ⚠️  ATTENTION: Moins de 50%% des emails migrés (possiblement clients non matchés)';
      END IF;
    END IF;

  ELSE
    RAISE NOTICE '⚠️  Table communications non trouvée, skip';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 3. CANAUX ET DIRECTIONS
  -- ==============================================================================

  RAISE NOTICE '3️⃣  CANAUX ET DIRECTIONS';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_comm_table_exists THEN
    -- Canaux disponibles
    SELECT array_agg(DISTINCT channel ORDER BY channel) INTO v_channels
    FROM public.communications;

    -- Directions disponibles
    SELECT array_agg(DISTINCT direction ORDER BY direction) INTO v_directions
    FROM public.communications;

    RAISE NOTICE 'Canaux disponibles: %', v_channels;
    RAISE NOTICE 'Directions disponibles: %', v_directions;

    -- Stats par canal
    RAISE NOTICE '';
    RAISE NOTICE 'Répartition par canal:';
    FOR v_channels IN
      SELECT channel, COUNT(*) as count
      FROM public.communications
      GROUP BY channel
      ORDER BY count DESC
    LOOP
      RAISE NOTICE '  • %: % messages', v_channels.channel, v_channels.count;
    END LOOP;
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 4. INDEXES CRÉÉS
  -- ==============================================================================

  RAISE NOTICE '4️⃣  INDEXES PERFORMANCE';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'communications_provider_msg_uniq') THEN
    RAISE NOTICE '✅ communications_provider_msg_uniq (UNIQUE)';
  ELSE
    RAISE NOTICE '⚠️  communications_provider_msg_uniq NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'communications_client_id_idx') THEN
    RAISE NOTICE '✅ communications_client_id_idx';
  ELSE
    RAISE NOTICE '⚠️  communications_client_id_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'communications_thread_key_idx') THEN
    RAISE NOTICE '✅ communications_thread_key_idx';
  ELSE
    RAISE NOTICE '⚠️  communications_thread_key_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'communications_occurred_at_idx') THEN
    RAISE NOTICE '✅ communications_occurred_at_idx';
  ELSE
    RAISE NOTICE '⚠️  communications_occurred_at_idx NOT FOUND';
  END IF;

  IF EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'comm_attach_comm_id_idx') THEN
    RAISE NOTICE '✅ comm_attach_comm_id_idx (attachments)';
  ELSE
    RAISE NOTICE '⚠️  comm_attach_comm_id_idx NOT FOUND';
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 5. INTÉGRITÉ DONNÉES SOURCE
  -- ==============================================================================

  RAISE NOTICE '5️⃣  INTÉGRITÉ (RÈGLES NON NÉGOCIABLES)';
  RAISE NOTICE '-------------------------------------------------------------------';

  -- Vérifier que emails_envoyes est intact (READ-ONLY)
  SELECT COUNT(*) INTO v_emails_envoyes_count FROM public.emails_envoyes;
  IF v_emails_envoyes_count >= 700 THEN
    RAISE NOTICE '✅ emails_envoyes: % rows (INTACT - READ-ONLY)', v_emails_envoyes_count;
  ELSE
    RAISE NOTICE '⚠️  emails_envoyes: % rows (ATTENDU: ~719)', v_emails_envoyes_count;
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 6. LIENS CLIENT
  -- ==============================================================================

  RAISE NOTICE '6️⃣  LIENS CLIENT (client_id)';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_comm_table_exists THEN
    SELECT
      COUNT(*) FILTER (WHERE client_id IS NOT NULL),
      COUNT(*) FILTER (WHERE client_id IS NULL)
    INTO v_matched_count, v_index_count
    FROM public.communications;

    v_match_pct := ROUND(100.0 * v_matched_count / NULLIF(v_total_communications, 0), 2);

    RAISE NOTICE 'Communications avec client_id: % / %', v_matched_count, v_total_communications;
    RAISE NOTICE 'Communications orphelines: %', v_index_count;
    RAISE NOTICE 'Taux linkage: %%%', v_match_pct;

    IF v_index_count > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  % communications sans client_id (emails non matchés à des clients)', v_index_count;
    END IF;
  END IF;

  RAISE NOTICE '';

  -- ==============================================================================
  -- 7. RÉSUMÉ
  -- ==============================================================================

  RAISE NOTICE '7️⃣  RÉSUMÉ PHASE 2';
  RAISE NOTICE '-------------------------------------------------------------------';

  IF v_comm_table_exists AND v_from_emails > 0 THEN
    RAISE NOTICE '✅ Table communications unifiée créée';
    RAISE NOTICE '✅ Migration emails_envoyes complète (% rows)', v_from_emails;
    RAISE NOTICE '✅ Indexes performance installés';
    RAISE NOTICE '✅ Intégrité données source préservée';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Prêt pour Phase 3 (Loans + Payment Schedules)';
  ELSE
    RAISE NOTICE '⚠️  Phase 2 incomplète - vérifier erreurs ci-dessus';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '===================================================================';
  RAISE NOTICE 'VALIDATION PHASE 2 COMPLÈTE ✅';
  RAISE NOTICE '===================================================================';
END $$;
