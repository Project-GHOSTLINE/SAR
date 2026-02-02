-- ============================================
-- PARTNERS MVP - Solution Argent Rapide INC
-- Migration: Programme partenaires (contribution + crédits)
-- Date: 2026-02-02
-- ============================================

-- ============================================
-- 1. ENUMS & TYPES
-- ============================================

-- Event types pour tracking des actions partenaires
CREATE TYPE partner_event_type AS ENUM (
  'click_referral',
  'share_whatsapp',
  'share_sms',
  'share_messenger',
  'share_copy',
  'application_submitted',
  'ibv_completed',
  'funded'
);

-- Status des attributions (parcours client référé)
CREATE TYPE partner_attribution_status AS ENUM (
  'submitted',
  'ibv_completed',
  'funded',
  'rejected',
  'cancelled'
);

-- Status des ajustements de balance
CREATE TYPE partner_balance_status AS ENUM (
  'pending',
  'applied',
  'void'
);


-- ============================================
-- 2. TABLES
-- ============================================

-- --------------------------------------------
-- TABLE: partner_invites
-- Gestion des invitations envoyées aux clients éligibles
-- --------------------------------------------
CREATE TABLE partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Relation au client existant (notre système de prêts)
  client_id uuid NOT NULL,

  -- Token unique d'invitation (dans l'URL)
  token text NOT NULL UNIQUE,

  -- Expiration et utilisation
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,

  -- Metadata
  sent_at timestamptz,
  sent_via text, -- 'email', 'sms', 'manual'

  -- Audit
  created_by uuid, -- admin_user_id si créé manuellement
  notes text
);

-- Index pour performance
CREATE INDEX idx_partner_invites_client_id ON partner_invites(client_id);
CREATE INDEX idx_partner_invites_token ON partner_invites(token);
CREATE INDEX idx_partner_invites_expires_at ON partner_invites(expires_at) WHERE used_at IS NULL;

COMMENT ON TABLE partner_invites IS 'Invitations envoyées aux 500 clients éligibles pour devenir partenaires';
COMMENT ON COLUMN partner_invites.client_id IS 'ID du client débiteur existant dans notre système';
COMMENT ON COLUMN partner_invites.token IS 'Token unique dans l''URL: /invite?token=XXXX';


-- --------------------------------------------
-- TABLE: partner_profiles
-- Profil partenaire (activé après acceptation consent)
-- --------------------------------------------
CREATE TABLE partner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Relation au client original (1 client = 1 partner max)
  client_id uuid NOT NULL UNIQUE,

  -- Auth Supabase (créé lors de l'activation)
  user_id uuid UNIQUE, -- auth.users.id

  -- Invitation source
  invite_id uuid NOT NULL REFERENCES partner_invites(id),

  -- Status
  status text NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'banned'
  activated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz,

  -- Préférences onboarding
  preferred_channels text[], -- ['whatsapp', 'sms', 'messenger']
  goals text, -- Texte libre sur objectifs

  -- Metadata
  consent_accepted_at timestamptz NOT NULL DEFAULT now(),
  consent_ip text,
  consent_ua text
);

CREATE INDEX idx_partner_profiles_client_id ON partner_profiles(client_id);
CREATE INDEX idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX idx_partner_profiles_status ON partner_profiles(status);

COMMENT ON TABLE partner_profiles IS 'Profil partenaire créé après acceptation du consent';
COMMENT ON COLUMN partner_profiles.client_id IS 'Unique: un client ne peut avoir qu''un seul profil partenaire';
COMMENT ON COLUMN partner_profiles.user_id IS 'ID Supabase Auth créé lors de l''activation (pour session + RLS)';


-- --------------------------------------------
-- TABLE: partner_ref_links
-- Liens de référencement générés pour chaque partenaire
-- --------------------------------------------
CREATE TABLE partner_ref_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  partner_id uuid NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,

  -- Code référencement unique (ex: ABC123)
  ref_code text NOT NULL UNIQUE,

  -- URL complète générée
  full_url text NOT NULL, -- https://solutionargentrapide.ca/apply?ref=ABC123

  -- Stats (compteurs cache, pas source de vérité)
  click_count int DEFAULT 0,
  conversion_count int DEFAULT 0,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz
);

CREATE UNIQUE INDEX idx_partner_ref_links_ref_code ON partner_ref_links(ref_code);
CREATE INDEX idx_partner_ref_links_partner_id ON partner_ref_links(partner_id);

COMMENT ON TABLE partner_ref_links IS 'Codes référencement générés pour chaque partenaire (1 par partenaire au MVP)';
COMMENT ON COLUMN partner_ref_links.ref_code IS 'Code unique: ABC123 (utilisé dans l''URL)';


-- --------------------------------------------
-- TABLE: partner_events
-- Tracking de toutes les actions/événements partenaires
-- --------------------------------------------
CREATE TABLE partner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  partner_id uuid NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,

  -- Type d'événement
  event_type partner_event_type NOT NULL,

  -- Contexte événement
  ref_code text, -- Si applicable (ex: click sur lien)

  -- Anti-fraude (hash pour privacy)
  ip_hash text,
  ua_hash text,

  -- Metadata additionnelle
  metadata jsonb,

  -- Rate-limiting flag
  is_suspicious boolean DEFAULT false,
  duplicate_check_key text -- hash(partner_id + event_type + date + ip) pour déduplication
);

CREATE INDEX idx_partner_events_partner_id_created_at ON partner_events(partner_id, created_at DESC);
CREATE INDEX idx_partner_events_event_type ON partner_events(event_type);
CREATE INDEX idx_partner_events_ref_code ON partner_events(ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX idx_partner_events_duplicate_check ON partner_events(duplicate_check_key) WHERE duplicate_check_key IS NOT NULL;

COMMENT ON TABLE partner_events IS 'Log de toutes les actions partenaires (clics, partages, conversions)';
COMMENT ON COLUMN partner_events.ip_hash IS 'Hash SHA256 de l''IP (privacy + rate-limiting)';
COMMENT ON COLUMN partner_events.ua_hash IS 'Hash SHA256 du user-agent (détection bots)';


-- --------------------------------------------
-- TABLE: partner_attributions
-- Attribution des demandes aux partenaires
-- --------------------------------------------
CREATE TABLE partner_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Code référencement source
  ref_code text NOT NULL,

  partner_id uuid NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,

  -- Demande référée (ID de l'application dans système principal)
  application_id uuid, -- UUID si système interne, sinon text

  -- Détection doublons (hash pour privacy)
  email_hash text,
  phone_hash text,

  -- Status parcours client
  status partner_attribution_status NOT NULL DEFAULT 'submitted',

  -- Timeline
  submitted_at timestamptz NOT NULL DEFAULT now(),
  ibv_completed_at timestamptz,
  funded_at timestamptz,

  -- Montant financé (si funded)
  funded_amount numeric(10,2),

  -- Metadata
  metadata jsonb,

  -- Détection fraude
  is_verified boolean DEFAULT false,
  verification_notes text
);

CREATE INDEX idx_partner_attributions_ref_code_created_at ON partner_attributions(ref_code, created_at DESC);
CREATE INDEX idx_partner_attributions_partner_id ON partner_attributions(partner_id);
CREATE INDEX idx_partner_attributions_application_id ON partner_attributions(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_partner_attributions_email_hash ON partner_attributions(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX idx_partner_attributions_phone_hash ON partner_attributions(phone_hash) WHERE phone_hash IS NOT NULL;

COMMENT ON TABLE partner_attributions IS 'Attribution des demandes de prêt aux partenaires référents';
COMMENT ON COLUMN partner_attributions.email_hash IS 'Hash SHA256 de l''email (détection doublons sans stocker email)';


-- --------------------------------------------
-- TABLE: partner_credit_ledger
-- Grand livre des crédits gagnés (immuable)
-- --------------------------------------------
CREATE TABLE partner_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  partner_id uuid NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,

  -- Source du crédit
  source_event_id uuid, -- partner_events.id ou partner_attributions.id
  source_type text NOT NULL, -- 'application_submitted', 'ibv_completed', 'funded'

  -- Montant crédit (positif ou négatif si ajustement)
  credit_amount numeric(10,2) NOT NULL,

  -- Raison
  reason text NOT NULL,

  -- Metadata
  metadata jsonb,

  -- Audit trail (qui a créé cette entrée)
  created_by_system text DEFAULT 'credit-engine',

  -- Void flag (si erreur, on ne delete pas, on void)
  is_void boolean DEFAULT false,
  voided_at timestamptz,
  voided_reason text
);

CREATE INDEX idx_partner_credit_ledger_partner_id_created_at ON partner_credit_ledger(partner_id, created_at DESC);
CREATE INDEX idx_partner_credit_ledger_source_event ON partner_credit_ledger(source_event_id) WHERE source_event_id IS NOT NULL;

COMMENT ON TABLE partner_credit_ledger IS 'Grand livre immuable des crédits gagnés (append-only)';
COMMENT ON COLUMN partner_credit_ledger.credit_amount IS 'Montant crédit selon règles MVP: +10 (submitted), +15 (ibv), +50 (funded)';


-- --------------------------------------------
-- TABLE: partner_balance_adjustments
-- Applications de crédits sur solde client
-- --------------------------------------------
CREATE TABLE partner_balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  partner_id uuid NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,

  -- Montant à appliquer sur solde
  amount numeric(10,2) NOT NULL,

  -- Status application
  status partner_balance_status NOT NULL DEFAULT 'pending',

  -- Timeline
  requested_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  voided_at timestamptz,

  -- Référence système comptable externe (ex: Margill)
  external_reference text,

  -- Notes
  notes text,

  -- Audit
  processed_by uuid, -- admin_user_id qui a appliqué
  void_reason text
);

CREATE INDEX idx_partner_balance_adjustments_partner_id ON partner_balance_adjustments(partner_id);
CREATE INDEX idx_partner_balance_adjustments_status ON partner_balance_adjustments(status);

COMMENT ON TABLE partner_balance_adjustments IS 'Demandes d''application de crédits sur solde client (approval workflow)';
COMMENT ON COLUMN partner_balance_adjustments.status IS 'pending = en attente admin, applied = appliqué sur solde, void = annulé';


-- --------------------------------------------
-- TABLE: partner_feedback
-- Feedback facultatif des partenaires
-- --------------------------------------------
CREATE TABLE partner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  partner_id uuid NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,

  -- Réponses (max 3 questions, format libre)
  answers jsonb NOT NULL,

  -- Metadata
  submitted_from text, -- 'dashboard', 'onboarding', 'email'
  ip_address text,
  user_agent text
);

CREATE INDEX idx_partner_feedback_partner_id ON partner_feedback(partner_id);
CREATE INDEX idx_partner_feedback_created_at ON partner_feedback(created_at DESC);

COMMENT ON TABLE partner_feedback IS 'Feedback facultatif (3 questions max, sobre)';


-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS sur toutes les tables
ALTER TABLE partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ref_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_balance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_feedback ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------
-- RLS POLICIES: partner_invites
-- --------------------------------------------
-- LECTURE: Invites ne sont pas exposées côté client (activation via token dans API)
-- ÉCRITURE: Service role only (backend)

CREATE POLICY "Service role full access on partner_invites"
  ON partner_invites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Service role full access on partner_invites" ON partner_invites IS
  'Aucun accès client direct. Activation via API avec service role.';


-- --------------------------------------------
-- RLS POLICIES: partner_profiles
-- --------------------------------------------
-- LECTURE: Partner peut lire UNIQUEMENT son propre profil
-- ÉCRITURE: Service role only (updates via API)

CREATE POLICY "Partners can read own profile"
  ON partner_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access on partner_profiles"
  ON partner_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Partners can read own profile" ON partner_profiles IS
  'Partner authentifié (via auth.uid) peut lire uniquement son profil via user_id match.';


-- --------------------------------------------
-- RLS POLICIES: partner_ref_links
-- --------------------------------------------
-- LECTURE: Partner peut lire UNIQUEMENT ses liens
-- ÉCRITURE: Service role only (création à l''activation)

CREATE POLICY "Partners can read own ref links"
  ON partner_ref_links
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM partner_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on partner_ref_links"
  ON partner_ref_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------
-- RLS POLICIES: partner_events
-- --------------------------------------------
-- LECTURE: Partner peut lire UNIQUEMENT ses events
-- ÉCRITURE: Service role only (logging via API)

CREATE POLICY "Partners can read own events"
  ON partner_events
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM partner_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on partner_events"
  ON partner_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------
-- RLS POLICIES: partner_attributions
-- --------------------------------------------
-- LECTURE: Partner peut lire UNIQUEMENT ses attributions
-- ÉCRITURE: Service role only (attribution via API)

CREATE POLICY "Partners can read own attributions"
  ON partner_attributions
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM partner_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on partner_attributions"
  ON partner_attributions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------
-- RLS POLICIES: partner_credit_ledger
-- --------------------------------------------
-- LECTURE: Partner peut lire UNIQUEMENT son ledger
-- ÉCRITURE: Service role only (credit-engine)

CREATE POLICY "Partners can read own ledger"
  ON partner_credit_ledger
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM partner_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on partner_credit_ledger"
  ON partner_credit_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------
-- RLS POLICIES: partner_balance_adjustments
-- --------------------------------------------
-- LECTURE: Partner peut lire UNIQUEMENT ses adjustments
-- ÉCRITURE: Service role only (admin approval)

CREATE POLICY "Partners can read own balance adjustments"
  ON partner_balance_adjustments
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM partner_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on partner_balance_adjustments"
  ON partner_balance_adjustments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------
-- RLS POLICIES: partner_feedback
-- --------------------------------------------
-- LECTURE: Partner peut lire UNIQUEMENT son feedback
-- ÉCRITURE: INSERT via authenticated (feedback form), updates via service role

CREATE POLICY "Partners can read own feedback"
  ON partner_feedback
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM partner_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can insert own feedback"
  ON partner_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id IN (
      SELECT id FROM partner_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on partner_feedback"
  ON partner_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================
-- 4. FUNCTIONS HELPERS (optionnel MVP)
-- ============================================

-- Function: Calculer le total crédits d'un partenaire (non-void)
CREATE OR REPLACE FUNCTION get_partner_total_credits(p_partner_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(credit_amount), 0)
  FROM partner_credit_ledger
  WHERE partner_id = p_partner_id
    AND is_void = false;
$$;

COMMENT ON FUNCTION get_partner_total_credits IS 'Calcule le total des crédits gagnés (non-void) pour un partenaire';


-- Function: Calculer le balance disponible (crédits - adjustments appliqués)
CREATE OR REPLACE FUNCTION get_partner_available_balance(p_partner_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    get_partner_total_credits(p_partner_id) -
    COALESCE(
      (SELECT SUM(amount)
       FROM partner_balance_adjustments
       WHERE partner_id = p_partner_id
         AND status = 'applied'),
      0
    );
$$;

COMMENT ON FUNCTION get_partner_available_balance IS 'Balance disponible = crédits totaux - ajustements appliqués';


-- ============================================
-- 5. TRIGGERS (Updated_at)
-- ============================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_partner_invites_updated_at BEFORE UPDATE ON partner_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_profiles_updated_at BEFORE UPDATE ON partner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_ref_links_updated_at BEFORE UPDATE ON partner_ref_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_attributions_updated_at BEFORE UPDATE ON partner_attributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_balance_adjustments_updated_at BEFORE UPDATE ON partner_balance_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- FIN MIGRATION PARTNERS MVP
-- ============================================
