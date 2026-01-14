-- ==============================================================================
-- PHASE 1 - FICHIERS 010 + 011 COMBINÉS (ordre corrigé)
-- ==============================================================================
-- Date: 2026-01-14
-- Ordre: Tables → Colonnes client_id → Vues (évite erreur dépendances)
-- ==============================================================================

-- ==============================================================================
-- PARTIE 1: TABLE clients (canonique)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  primary_email text,
  primary_phone text,

  -- Identité
  first_name text,
  last_name text,
  dob date,

  -- Statut
  status text NOT NULL DEFAULT 'active',  -- active|merged|suspended|closed
  merged_into_client_id uuid NULL REFERENCES public.clients(id),

  -- Qualité (NOUVEAU - recommandation GPT)
  confidence_score integer DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index UNIQUE sur email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS clients_primary_email_uniq
  ON public.clients (lower(primary_email))
  WHERE primary_email IS NOT NULL;

-- Index sur téléphone
CREATE INDEX IF NOT EXISTS clients_primary_phone_idx
  ON public.clients (primary_phone)
  WHERE primary_phone IS NOT NULL;

-- Index sur statut (pour queries actifs)
CREATE INDEX IF NOT EXISTS clients_status_idx
  ON public.clients (status)
  WHERE status = 'active';

-- Index sur confidence_score (pour alertes)
CREATE INDEX IF NOT EXISTS clients_confidence_idx
  ON public.clients (confidence_score)
  WHERE confidence_score < 80;

COMMENT ON TABLE public.clients IS 'Table canonique représentant un client unique. Point central de toutes les relations.';
COMMENT ON COLUMN public.clients.confidence_score IS 'Score de confiance du matching client (0-100). <80 nécessite validation.';

-- ==============================================================================
-- PARTIE 2: TABLE client_identity_aliases
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.client_identity_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Type d'identité
  identity_type text NOT NULL CHECK (identity_type IN ('email', 'phone')),
  value text NOT NULL,

  -- Vérification
  verified_at timestamptz,
  verified_by text,

  -- Statut
  active boolean DEFAULT true,

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  notes text
);

-- Indexes
CREATE INDEX IF NOT EXISTS client_identity_aliases_client_id_idx
  ON public.client_identity_aliases(client_id);

CREATE INDEX IF NOT EXISTS client_identity_aliases_value_idx
  ON public.client_identity_aliases(lower(value))
  WHERE active = true;

CREATE INDEX IF NOT EXISTS client_identity_aliases_type_idx
  ON public.client_identity_aliases(identity_type, active);

COMMENT ON TABLE public.client_identity_aliases IS 'Historique des identifiants alternatifs (anciens emails, anciens téléphones). Permet de tracer changements sans casser l''historique.';

-- ==============================================================================
-- PARTIE 3: AJOUTER COLONNES client_id (depuis fichier 011)
-- ==============================================================================

ALTER TABLE IF EXISTS public.loan_applications
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.client_accounts
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.client_analyses
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.contact_messages
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.support_tickets
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

-- Indexes sur client_id
CREATE INDEX IF NOT EXISTS loan_applications_client_id_idx ON public.loan_applications(client_id);
CREATE INDEX IF NOT EXISTS client_accounts_client_id_idx ON public.client_accounts(client_id);
CREATE INDEX IF NOT EXISTS client_analyses_client_id_idx ON public.client_analyses(client_id);
CREATE INDEX IF NOT EXISTS contact_messages_client_id_idx ON public.contact_messages(client_id);
CREATE INDEX IF NOT EXISTS support_tickets_client_id_idx ON public.support_tickets(client_id);

-- ==============================================================================
-- PARTIE 4: FONCTIONS & TRIGGERS
-- ==============================================================================

-- Fonction set_updated_at (si n'existe pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $f$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Trigger sur clients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
    CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ==============================================================================
-- PARTIE 5: VUES (après que les colonnes client_id existent)
-- ==============================================================================

-- VUE: vw_orphan_records
CREATE OR REPLACE VIEW public.vw_orphan_records AS
-- Loan applications sans client
SELECT
  'loan_applications'::text as table_name,
  id::text as record_id,
  courriel as identifier,
  created_at,
  'missing_client_id'::text as issue_type
FROM public.loan_applications
WHERE client_id IS NULL

UNION ALL

-- Contact messages sans client
SELECT
  'contact_messages'::text,
  id::text,
  email,
  created_at,
  'missing_client_id'::text
FROM public.contact_messages
WHERE client_id IS NULL

UNION ALL

-- Support tickets sans client
SELECT
  'support_tickets'::text,
  id::text,
  client_email,
  created_at,
  'missing_client_id'::text
FROM public.support_tickets
WHERE client_id IS NULL

UNION ALL

-- Client accounts sans client
SELECT
  'client_accounts'::text,
  id::text,
  client_email,
  created_at,
  'missing_client_id'::text
FROM public.client_accounts
WHERE client_id IS NULL;

COMMENT ON VIEW public.vw_orphan_records IS 'Liste des enregistrements sans client_id. À nettoyer manuellement post-migration.';

-- VUE: vw_client_identity_summary
CREATE OR REPLACE VIEW public.vw_client_identity_summary AS
SELECT
  c.id as client_id,
  c.primary_email,
  c.primary_phone,
  c.first_name,
  c.last_name,
  c.confidence_score,

  -- Alias actifs
  (SELECT COUNT(*)
   FROM client_identity_aliases cia
   WHERE cia.client_id = c.id AND cia.active = true AND cia.identity_type = 'email'
  ) as active_email_aliases,

  (SELECT COUNT(*)
   FROM client_identity_aliases cia
   WHERE cia.client_id = c.id AND cia.active = true AND cia.identity_type = 'phone'
  ) as active_phone_aliases,

  -- Dernière modification identité
  (SELECT MAX(created_at)
   FROM client_identity_aliases cia
   WHERE cia.client_id = c.id
  ) as last_identity_change

FROM public.clients c;

COMMENT ON VIEW public.vw_client_identity_summary IS 'Résumé des identités par client avec nombre d''alias actifs.';

-- ==============================================================================
-- VALIDATION FINALE
-- ==============================================================================

DO $$
DECLARE
  table_count INTEGER;
  view_count INTEGER;
  column_count INTEGER;
BEGIN
  -- Vérifier tables créées
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('clients', 'client_identity_aliases');

  IF table_count != 2 THEN
    RAISE EXCEPTION 'Tables non créées correctement. Attendu: 2, Trouvé: %', table_count;
  END IF;

  -- Vérifier colonnes client_id ajoutées
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'client_id'
    AND table_name IN ('loan_applications', 'client_accounts', 'client_analyses', 'contact_messages', 'support_tickets');

  IF column_count != 5 THEN
    RAISE EXCEPTION 'Colonnes client_id non ajoutées correctement. Attendu: 5, Trouvé: %', column_count;
  END IF;

  -- Vérifier views créées
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('vw_orphan_records', 'vw_client_identity_summary');

  IF view_count != 2 THEN
    RAISE EXCEPTION 'Views non créées correctement. Attendu: 2, Trouvé: %', view_count;
  END IF;

  RAISE NOTICE '✅ Phase 1 (010+011): 2 tables + 5 colonnes + 2 views créées avec succès';
  RAISE NOTICE '   • Tables: clients, client_identity_aliases';
  RAISE NOTICE '   • Colonnes client_id: 5 tables modifiées';
  RAISE NOTICE '   • Views: vw_orphan_records, vw_client_identity_summary';
END $$;
