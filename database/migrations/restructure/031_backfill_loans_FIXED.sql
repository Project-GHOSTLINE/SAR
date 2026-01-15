-- 031_backfill_loans_FIXED.sql
-- Créer loans depuis loan_applications (demandes de prêt)
-- Note: client_accounts = comptes bancaires analysés (Flinks), PAS comptes de prêt

-- ==============================================================================
-- OPTION 1: Créer loans depuis loan_applications
-- ==============================================================================
-- Chaque demande approuvée = 1 loan

INSERT INTO public.loans (client_id, application_id, status, metadata)
SELECT
  la.client_id,
  la.id AS application_id,
  CASE
    WHEN la.status IN ('approved', 'funded', 'active') THEN 'active'
    WHEN la.status IN ('closed', 'completed', 'paid_off') THEN 'closed'
    WHEN la.status IN ('defaulted', 'collection') THEN 'defaulted'
    ELSE 'pending'
  END AS status,
  jsonb_build_object(
    'source', 'backfill_loan_applications',
    'original_status', la.status,
    'montant_demande', la.montant_demande,
    'duree_pret_mois', la.duree_pret_mois,
    'reference', la.reference,
    'origin', la.origin
  )
FROM public.loan_applications la
LEFT JOIN public.loans l ON l.application_id = la.id
WHERE la.client_id IS NOT NULL  -- Seulement applications avec client
  AND la.status IN ('approved', 'funded', 'active', 'closed', 'completed', 'paid_off', 'defaulted', 'collection')  -- Seulement prêts réels
  AND l.id IS NULL;  -- Pas déjà créé

-- ==============================================================================
-- OPTION 2 (si nécessaire): Lier accounts bancaires aux loans
-- ==============================================================================
-- Si un client_account doit être lié à un loan, on peut le faire après:
-- UPDATE loans SET account_id = ... WHERE ...
-- (À faire manuellement si besoin selon la logique métier)
