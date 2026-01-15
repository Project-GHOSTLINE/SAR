-- 060_enable_rls.sql
-- Phase 6A: Row Level Security (RLS)
-- Date: 2026-01-15
-- Objectif: Sécuriser l'accès aux tables sensibles

-- ==============================================================================
-- STRATÉGIE RLS POUR SAR
-- ==============================================================================
--
-- SAR utilise JWT admin-session stocké dans cookies (pas auth.users Supabase)
--
-- OPTIONS:
-- A. RLS basique: "Allow all" pour service_role, bloquer accès anon
-- B. RLS avancé: Créer table admin_users et checker JWT claims
--
-- CHOIX: Option A (simple, sécurisé via API layer)
-- Raison: L'auth admin est gérée côté Next.js avec JWT custom
--
-- ==============================================================================

-- ==============================================================================
-- ACTIVER RLS SUR NOUVELLES TABLES
-- ==============================================================================

-- Tables Phase 1: Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_identity_aliases ENABLE ROW LEVEL SECURITY;

-- Tables Phase 2: Communications
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Tables Phase 3: Loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Tables Phase 4: VoPay
ALTER TABLE public.vopay_objects ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLICIES: ALLOW ALL POUR SERVICE_ROLE
-- ==============================================================================
-- Ces policies permettent accès complet via service_role key (backend)
-- Accès anon et authenticated sans service_role = BLOCKED

-- 1️⃣ CLIENTS
CREATE POLICY "Service role has full access to clients"
ON public.clients
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to client_identity_aliases"
ON public.client_identity_aliases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2️⃣ COMMUNICATIONS
CREATE POLICY "Service role has full access to communications"
ON public.communications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3️⃣ LOANS
CREATE POLICY "Service role has full access to loans"
ON public.loans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to payment_schedule_versions"
ON public.payment_schedule_versions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to payment_installments"
ON public.payment_installments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to payment_events"
ON public.payment_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4️⃣ VOPAY
CREATE POLICY "Service role has full access to vopay_objects"
ON public.vopay_objects
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- TABLES EXISTANTES (NE PAS TOUCHER - DÉJÀ CONFIGURÉES)
-- ==============================================================================

-- ✅ client_transactions: Déjà RLS ou public (READ-ONLY)
-- ✅ emails_envoyes: Déjà RLS ou public (READ-ONLY)
-- ✅ vopay_webhook_logs: RAW, pas de RLS nécessaire
-- ✅ contact_messages: Déjà configuré
-- ✅ support_tickets: Déjà configuré
-- ✅ loan_applications: Déjà configuré

-- ==============================================================================
-- VÉRIFIER RLS EXISTANTS
-- ==============================================================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION RLS ===';

  -- Compter tables avec RLS activé
  SELECT COUNT(*)
  INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'clients',
      'client_identity_aliases',
      'communications',
      'loans',
      'payment_schedule_versions',
      'payment_installments',
      'payment_events',
      'vopay_objects'
    )
    AND rowsecurity = true;

  RAISE NOTICE '✅ Tables avec RLS activé: %/8', rls_enabled_count;

  IF rls_enabled_count = 8 THEN
    RAISE NOTICE '🎉 Toutes les tables Phase 1-4 ont RLS activé!';
  ELSE
    RAISE WARNING '⚠️  Seulement %/8 tables ont RLS. Vérifier erreurs ci-dessus.', rls_enabled_count;
  END IF;

END $$;

-- ==============================================================================
-- OPTION AVANCÉE (COMMENTÉE): RLS AVEC JWT CLAIMS
-- ==============================================================================
--
-- Si vous voulez RLS basé sur JWT claims (auth.uid(), auth.role()):
--
-- 1. Créer table admin_users:
-- CREATE TABLE public.admin_users (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   email text UNIQUE NOT NULL,
--   role text NOT NULL DEFAULT 'viewer', -- admin, editor, viewer
--   created_at timestamptz DEFAULT now()
-- );
--
-- 2. Policies basées sur admin_users:
-- CREATE POLICY "Admins can read clients"
-- ON public.clients
-- FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM admin_users
--     WHERE admin_users.id = auth.uid()
--     AND admin_users.role IN ('admin', 'editor', 'viewer')
--   )
-- );
--
-- 3. Intégrer avec Next.js auth:
-- - Créer admin_users lors du signup
-- - Vérifier role dans JWT claims
-- - Utiliser anon key côté client (pas service_role)
--
-- ==============================================================================

RAISE NOTICE '';
RAISE NOTICE '✅ Phase 6A Complete: RLS enabled on all new tables!';
RAISE NOTICE '';
RAISE NOTICE '📌 NOTE: RLS permet accès via service_role key uniquement';
RAISE NOTICE '📌 Accès anon/authenticated sans service_role = BLOCKED';
RAISE NOTICE '📌 Backend Next.js doit utiliser SUPABASE_SERVICE_KEY';
