-- 042_link_vopay_to_clients_loans.sql
-- Logique de matching intelligent pour lier vopay_objects aux clients et loans
-- Date: 2026-01-15

-- ==============================================================================
-- STRATÉGIE 1: LIER vopay_objects → clients (par EMAIL)
-- ==============================================================================

DO $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== STRATÉGIE 1: Matching clients par email ===';

  -- Chemin 1: payload->>'email'
  UPDATE vopay_objects vo
  SET client_id = c.id
  FROM clients c
  WHERE vo.client_id IS NULL
    AND vo.payload ? 'email'
    AND NULLIF(trim(vo.payload->>'email'), '') IS NOT NULL
    AND lower(c.primary_email) = lower(trim(vo.payload->>'email'));

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via payload.email', matched_count;

  -- Chemin 2: payload->'ClientInfo'->>'email'
  UPDATE vopay_objects vo
  SET client_id = c.id
  FROM clients c
  WHERE vo.client_id IS NULL
    AND vo.payload ? 'ClientInfo'
    AND vo.payload->'ClientInfo' ? 'email'
    AND NULLIF(trim(vo.payload->'ClientInfo'->>'email'), '') IS NOT NULL
    AND lower(c.primary_email) = lower(trim(vo.payload->'ClientInfo'->>'email'));

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via payload.ClientInfo.email', matched_count;

  -- Chemin 3: payload->>'EmailAddress'
  UPDATE vopay_objects vo
  SET client_id = c.id
  FROM clients c
  WHERE vo.client_id IS NULL
    AND vo.payload ? 'EmailAddress'
    AND NULLIF(trim(vo.payload->>'EmailAddress'), '') IS NOT NULL
    AND lower(c.primary_email) = lower(trim(vo.payload->>'EmailAddress'));

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via payload.EmailAddress', matched_count;

  -- Chemin 4: Via vopay_webhook_logs si raw_log_id existe
  UPDATE vopay_objects vo
  SET client_id = c.id
  FROM vopay_webhook_logs vwl
  JOIN clients c ON lower(c.primary_email) = lower(trim(vwl.payload->>'email'))
  WHERE vo.client_id IS NULL
    AND vo.raw_log_id = vwl.id
    AND vwl.payload ? 'email'
    AND NULLIF(trim(vwl.payload->>'email'), '') IS NOT NULL;

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via raw_log_id', matched_count;

END $$;

-- ==============================================================================
-- STRATÉGIE 2: LIER vopay_objects → loans (par RÉFÉRENCE)
-- ==============================================================================

DO $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STRATÉGIE 2: Matching loans par référence ===';

  -- Chemin 1: ClientReferenceNumber contient SAR-LP-XXXXX
  UPDATE vopay_objects vo
  SET loan_id = l.id
  FROM loans l
  JOIN loan_applications la ON l.application_id = la.id
  WHERE vo.loan_id IS NULL
    AND vo.payload ? 'ClientReferenceNumber'
    AND NULLIF(trim(vo.payload->>'ClientReferenceNumber'), '') IS NOT NULL
    AND trim(vo.payload->>'ClientReferenceNumber') ILIKE '%' || la.reference || '%';

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via ClientReferenceNumber', matched_count;

  -- Chemin 2: Notes contient SAR-LP-XXXXX
  UPDATE vopay_objects vo
  SET loan_id = l.id
  FROM loans l
  JOIN loan_applications la ON l.application_id = la.id
  WHERE vo.loan_id IS NULL
    AND vo.payload ? 'Notes'
    AND NULLIF(trim(vo.payload->>'Notes'), '') IS NOT NULL
    AND trim(vo.payload->>'Notes') ILIKE '%' || la.reference || '%';

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via Notes', matched_count;

  -- Chemin 3: Description contient référence
  UPDATE vopay_objects vo
  SET loan_id = l.id
  FROM loans l
  JOIN loan_applications la ON l.application_id = la.id
  WHERE vo.loan_id IS NULL
    AND vo.payload ? 'Description'
    AND NULLIF(trim(vo.payload->>'Description'), '') IS NOT NULL
    AND trim(vo.payload->>'Description') ILIKE '%' || la.reference || '%';

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via Description', matched_count;

  -- Chemin 4: TransactionID stocké dans loans.metadata
  UPDATE vopay_objects vo
  SET loan_id = l.id
  FROM loans l
  WHERE vo.loan_id IS NULL
    AND l.metadata ? 'vopay_transaction_id'
    AND l.metadata->>'vopay_transaction_id' = vo.vopay_id;

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via loans.metadata.vopay_transaction_id', matched_count;

END $$;

-- ==============================================================================
-- STRATÉGIE 3: LIER vopay_objects → loans (par CLIENT + MONTANT + DATE)
-- ==============================================================================

DO $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STRATÉGIE 3: Matching loans par heuristique (client + montant + date) ===';

  -- Conditions:
  -- 1. Même client_id
  -- 2. Montant exact ou très proche (±$10)
  -- 3. Date proche (±7 jours)
  -- 4. Loan actif ou récent
  -- 5. Pas encore lié

  UPDATE vopay_objects vo
  SET loan_id = l.id
  FROM loans l
  JOIN loan_applications la ON l.application_id = la.id
  WHERE vo.loan_id IS NULL
    AND vo.client_id IS NOT NULL
    AND l.client_id = vo.client_id
    AND vo.amount IS NOT NULL
    AND la.montant_demande IS NOT NULL
    -- Montant proche (convertir cents en dollars)
    AND ABS((la.montant_demande / 100.0) - vo.amount) <= 10.0
    -- Date proche (±7 jours)
    AND vo.occurred_at IS NOT NULL
    AND l.created_at IS NOT NULL
    AND ABS(EXTRACT(EPOCH FROM (vo.occurred_at - l.created_at)) / 86400) <= 7
    -- Prioriser loans actifs
    AND l.status IN ('active', 'pending')
  -- Limiter à 1 seul match par vopay_object (prendre le plus récent)
  AND l.id = (
    SELECT l2.id
    FROM loans l2
    JOIN loan_applications la2 ON l2.application_id = la2.id
    WHERE l2.client_id = vo.client_id
      AND ABS((la2.montant_demande / 100.0) - vo.amount) <= 10.0
      AND ABS(EXTRACT(EPOCH FROM (vo.occurred_at - l2.created_at)) / 86400) <= 7
      AND l2.status IN ('active', 'pending')
    ORDER BY l2.created_at DESC
    LIMIT 1
  );

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Matched % rows via heuristique (client + montant + date)', matched_count;

END $$;

-- ==============================================================================
-- STRATÉGIE 4: SI client_id NULL mais loan_id trouvé → remplir client_id
-- ==============================================================================

DO $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STRATÉGIE 4: Remplir client_id depuis loan_id ===';

  UPDATE vopay_objects vo
  SET client_id = l.client_id
  FROM loans l
  WHERE vo.client_id IS NULL
    AND vo.loan_id IS NOT NULL
    AND l.id = vo.loan_id
    AND l.client_id IS NOT NULL;

  GET DIAGNOSTICS matched_count = ROW_COUNT;
  RAISE NOTICE '  → Filled % client_id from loan_id', matched_count;

END $$;

-- ==============================================================================
-- STATISTIQUES FINALES
-- ==============================================================================

DO $$
DECLARE
  total_count INTEGER;
  client_linked INTEGER;
  loan_linked INTEGER;
  both_linked INTEGER;
  orphan_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STATISTIQUES FINALES ===';

  -- Total records
  SELECT COUNT(*) INTO total_count FROM vopay_objects;
  RAISE NOTICE 'Total vopay_objects: %', total_count;

  -- Client linkés
  SELECT COUNT(*) INTO client_linked FROM vopay_objects WHERE client_id IS NOT NULL;
  RAISE NOTICE 'Linked to clients: % (%.1f%%)', client_linked, (client_linked::float / NULLIF(total_count, 0) * 100);

  -- Loan linkés
  SELECT COUNT(*) INTO loan_linked FROM vopay_objects WHERE loan_id IS NOT NULL;
  RAISE NOTICE 'Linked to loans: % (%.1f%%)', loan_linked, (loan_linked::float / NULLIF(total_count, 0) * 100);

  -- Les deux linkés
  SELECT COUNT(*) INTO both_linked FROM vopay_objects WHERE client_id IS NOT NULL AND loan_id IS NOT NULL;
  RAISE NOTICE 'Linked to both: % (%.1f%%)', both_linked, (both_linked::float / NULLIF(total_count, 0) * 100);

  -- Orphelins (aucun lien)
  SELECT COUNT(*) INTO orphan_count FROM vopay_objects WHERE client_id IS NULL AND loan_id IS NULL;
  RAISE NOTICE 'Orphans (no links): % (%.1f%%)', orphan_count, (orphan_count::float / NULLIF(total_count, 0) * 100);

  RAISE NOTICE '';
  RAISE NOTICE '✅ Matching complete!';

END $$;

-- ==============================================================================
-- CRÉER VUE POUR FACILITER L'INSPECTION DES ORPHELINS
-- ==============================================================================

CREATE OR REPLACE VIEW vw_vopay_orphans AS
SELECT
  vo.id,
  vo.object_type,
  vo.vopay_id,
  vo.status,
  vo.amount,
  vo.occurred_at,
  -- Extraire infos utiles du payload
  vo.payload->>'email' as payload_email,
  vo.payload->>'EmailAddress' as payload_email_address,
  vo.payload->'ClientInfo'->>'email' as payload_client_email,
  vo.payload->>'ClientReferenceNumber' as client_reference,
  vo.payload->>'Notes' as notes,
  vo.payload->>'Description' as description,
  vo.payload
FROM vopay_objects vo
WHERE vo.client_id IS NULL AND vo.loan_id IS NULL
ORDER BY vo.occurred_at DESC;

COMMENT ON VIEW vw_vopay_orphans IS 'VoPay objects sans liens (ni client ni loan) pour inspection manuelle';

-- ==============================================================================
-- CRÉER VUE POUR STATS PAR CLIENT
-- ==============================================================================

CREATE OR REPLACE VIEW vw_vopay_by_client AS
SELECT
  c.id as client_id,
  c.primary_email,
  c.first_name,
  c.last_name,
  COUNT(vo.id) as vopay_transaction_count,
  COUNT(DISTINCT vo.loan_id) as linked_loans_count,
  SUM(CASE WHEN vo.status = 'successful' THEN vo.amount ELSE 0 END) as total_successful_amount,
  SUM(CASE WHEN vo.status = 'failed' THEN vo.amount ELSE 0 END) as total_failed_amount,
  MAX(vo.occurred_at) as last_vopay_activity
FROM clients c
LEFT JOIN vopay_objects vo ON vo.client_id = c.id
GROUP BY c.id, c.primary_email, c.first_name, c.last_name
HAVING COUNT(vo.id) > 0
ORDER BY vopay_transaction_count DESC;

COMMENT ON VIEW vw_vopay_by_client IS 'Statistiques VoPay agrégées par client';

-- ==============================================================================
-- INDEX SUPPLÉMENTAIRES POUR PERFORMANCE
-- ==============================================================================

-- Index sur payload JSON (si PostgreSQL supporte GIN)
CREATE INDEX IF NOT EXISTS vopay_objects_payload_gin_idx ON vopay_objects USING GIN (payload);

-- Index sur status pour filtres fréquents
CREATE INDEX IF NOT EXISTS vopay_objects_status_idx ON vopay_objects(status) WHERE status IS NOT NULL;

-- Index composite pour queries par client + date
CREATE INDEX IF NOT EXISTS vopay_objects_client_occurred_idx ON vopay_objects(client_id, occurred_at DESC) WHERE client_id IS NOT NULL;

-- Index composite pour queries par loan + date
CREATE INDEX IF NOT EXISTS vopay_objects_loan_occurred_idx ON vopay_objects(loan_id, occurred_at DESC) WHERE loan_id IS NOT NULL;

RAISE NOTICE '';
RAISE NOTICE '📊 Phase 4 Complete: VoPay linking finished!';
RAISE NOTICE 'Next: Review vw_vopay_orphans to manually link remaining records';
