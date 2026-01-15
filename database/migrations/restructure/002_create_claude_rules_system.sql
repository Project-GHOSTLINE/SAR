-- ==============================================================================
-- SYSTÈME DE RÈGLES CLAUDE (Supabase)
-- ==============================================================================
-- Stocke les règles dans Supabase pour que TOUS les Claude y aient accès
-- ==============================================================================

-- ==============================================================================
-- TABLE: claude_rules
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  rule_id text NOT NULL UNIQUE,
  rule_name text NOT NULL,
  category text NOT NULL, -- 'before_code', 'before_file', 'before_execution'

  -- Règle
  description text NOT NULL,
  priority text NOT NULL, -- 'critical', 'high', 'medium', 'low'
  enabled boolean DEFAULT true,

  -- Checks
  checks jsonb, -- [{step: "...", action: "..."}]
  examples jsonb, -- [{bad: "...", good: "..."}]

  -- Déclencheurs
  trigger_on text[], -- ['sql_generation', 'file_modification']
  error_patterns text[], -- Pour auto-detection

  -- Apprentissage
  learned_from_session uuid REFERENCES public.claude_conversation_log(id),
  learned_at timestamptz,
  times_violated integer DEFAULT 0,
  last_violated_at timestamptz,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_rules_category_idx ON public.claude_rules(category);
CREATE INDEX IF NOT EXISTS claude_rules_priority_idx ON public.claude_rules(priority);
CREATE INDEX IF NOT EXISTS claude_rules_enabled_idx ON public.claude_rules(enabled) WHERE enabled = true;

COMMENT ON TABLE public.claude_rules IS 'Règles obligatoires pour tous les Claude. Auto-chargées au démarrage.';

-- ==============================================================================
-- TABLE: claude_rule_violations
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_rule_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  rule_id uuid NOT NULL REFERENCES public.claude_rules(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.claude_conversation_log(id) ON DELETE CASCADE,

  -- Violation
  violated_at timestamptz NOT NULL DEFAULT now(),
  context text NOT NULL,
  error_message text,

  -- Résolution
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolution_action text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_rule_violations_rule_idx ON public.claude_rule_violations(rule_id);
CREATE INDEX IF NOT EXISTS claude_rule_violations_session_idx ON public.claude_rule_violations(session_id);
CREATE INDEX IF NOT EXISTS claude_rule_violations_resolved_idx ON public.claude_rule_violations(resolved);

COMMENT ON TABLE public.claude_rule_violations IS 'Historique des violations de règles. Permet d''apprendre.';

-- ==============================================================================
-- FONCTION: get_active_rules
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_active_rules(
  category_filter text DEFAULT NULL
)
RETURNS TABLE (
  rule_id text,
  rule_name text,
  category text,
  priority text,
  description text,
  checks jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.rule_id,
    r.rule_name,
    r.category,
    r.priority,
    r.description,
    r.checks
  FROM claude_rules r
  WHERE
    r.enabled = true
    AND (category_filter IS NULL OR r.category = category_filter)
  ORDER BY
    CASE r.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- FONCTION: log_rule_violation
-- ==============================================================================

CREATE OR REPLACE FUNCTION log_rule_violation(
  p_rule_id text,
  p_session_id uuid,
  p_context text,
  p_error_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_violation_id uuid;
  v_rule_uuid uuid;
BEGIN
  -- Trouver UUID de la règle
  SELECT id INTO v_rule_uuid FROM claude_rules WHERE rule_id = p_rule_id;

  IF v_rule_uuid IS NULL THEN
    RAISE EXCEPTION 'Règle % non trouvée', p_rule_id;
  END IF;

  -- Créer violation
  INSERT INTO claude_rule_violations (
    rule_id,
    session_id,
    context,
    error_message
  ) VALUES (
    v_rule_uuid,
    p_session_id,
    p_context,
    p_error_message
  ) RETURNING id INTO v_violation_id;

  -- Incrémenter compteur
  UPDATE claude_rules
  SET
    times_violated = times_violated + 1,
    last_violated_at = now()
  WHERE id = v_rule_uuid;

  RETURN v_violation_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PEUPLER RÈGLES INITIALES (depuis session 2026-01-14)
-- ==============================================================================

-- Règle 1: Vérifier dépendances SQL
INSERT INTO claude_rules (
  rule_id,
  rule_name,
  category,
  description,
  priority,
  checks,
  examples,
  trigger_on,
  error_patterns
) VALUES (
  'check_dependencies',
  'Vérifier dépendances SQL',
  'before_code',
  'AVANT d''écrire SQL, vérifier que toutes les tables/colonnes référencées existent déjà',
  'critical',
  jsonb_build_array(
    'Lister toutes les REFERENCES dans le SQL',
    'Vérifier que chaque table référencée existe déjà',
    'Vérifier que chaque colonne référencée existe',
    'Si manquante → STOP et demander ordre correct'
  ),
  jsonb_build_object(
    'bad', 'CREATE VIEW ... WHERE client_id (colonne pas créée)',
    'good', 'Créer colonnes client_id PUIS créer vues'
  ),
  ARRAY['sql_generation'],
  ARRAY['does not exist', 'relation.*does not exist']
) ON CONFLICT (rule_id) DO NOTHING;

-- Règle 2: Mots réservés PostgreSQL
INSERT INTO claude_rules (
  rule_id,
  rule_name,
  category,
  description,
  priority,
  checks,
  examples,
  trigger_on,
  error_patterns
) VALUES (
  'check_reserved_words',
  'Vérifier mots réservés PostgreSQL',
  'before_code',
  'Ne JAMAIS utiliser timestamp, user, table, etc. comme noms de colonnes ou variables',
  'high',
  jsonb_build_array(
    'Vérifier liste mots réservés: timestamp, user, table, order, select, group',
    'Si utilisé → préfixer: msg_timestamp, decision_timestamp',
    'Tester mentalement chaque nom de colonne'
  ),
  jsonb_build_object(
    'bad', 'timestamp timestamptz (mot réservé)',
    'good', 'msg_timestamp timestamptz'
  ),
  ARRAY['sql_generation'],
  ARRAY['syntax error at or near']
) ON CONFLICT (rule_id) DO NOTHING;

-- Règle 3: Vérifier blueprint
INSERT INTO claude_rules (
  rule_id,
  rule_name,
  category,
  description,
  priority,
  checks,
  examples,
  trigger_on
) VALUES (
  'verify_blueprint',
  'Vérifier contre blueprint existant',
  'before_code',
  'Si blueprint existe, TOUJOURS vérifier noms colonnes réels avant d''écrire code',
  'high',
  jsonb_build_array(
    'Chercher fichier blueprint dans le projet',
    'Si trouvé → lire schéma AVANT d''écrire code',
    'Utiliser EXACTEMENT les mêmes noms',
    'Ne PAS deviner les noms de colonnes'
  ),
  jsonb_build_object(
    'bad', 'Deviner que la colonne s''appelle client_email',
    'good', 'Lire blueprint, voir que c''est client_email ou courriel'
  ),
  ARRAY['sql_generation', 'file_modification']
) ON CONFLICT (rule_id) DO NOTHING;

-- Règle 4: Lire avant écrire
INSERT INTO claude_rules (
  rule_id,
  rule_name,
  category,
  description,
  priority,
  checks,
  trigger_on
) VALUES (
  'read_before_write',
  'Lire fichier AVANT modification',
  'before_file',
  'JAMAIS modifier un fichier sans l''avoir lu avec Read tool',
  'critical',
  jsonb_build_array(
    'Read tool OBLIGATOIRE avant Write/Edit',
    'Comprendre structure actuelle du fichier',
    'Vérifier que modification fait sens dans contexte'
  ),
  ARRAY['file_modification']
) ON CONFLICT (rule_id) DO NOTHING;

-- Règle 5: Simulation mentale
INSERT INTO claude_rules (
  rule_id,
  rule_name,
  category,
  description,
  priority,
  checks
) VALUES (
  'dry_run_mental',
  'Simulation mentale avant exécution',
  'before_execution',
  'Avant exécution, simuler ligne par ligne mentalement',
  'high',
  jsonb_build_array(
    'Si j''exécute ligne 1, ça marche?',
    'La ligne 10 dépend de quoi?',
    'Y a-t-il des foreign keys? Vers quoi?',
    'Ordre d''exécution est-il logique?'
  )
) ON CONFLICT (rule_id) DO NOTHING;

-- ==============================================================================
-- VALIDATION
-- ==============================================================================

DO $$
DECLARE
  rules_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rules_count FROM claude_rules WHERE enabled = true;

  IF rules_count < 5 THEN
    RAISE EXCEPTION 'Règles non créées. Attendu: 5+, Trouvé: %', rules_count;
  END IF;

  RAISE NOTICE '✅ Système de règles Claude installé';
  RAISE NOTICE '   • Règles actives: %', rules_count;
  RAISE NOTICE '   • Catégories: before_code, before_file, before_execution';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Voir règles actives:';
  RAISE NOTICE '   SELECT * FROM get_active_rules();';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Logger violation:';
  RAISE NOTICE '   SELECT log_rule_violation(''check_dependencies'', session_id, ''context'');';
END $$;
