-- ==============================================================================
-- SYSTÈME COMPLET DE MÉMOIRE CLAUDE - TOUT EN UN
-- ==============================================================================
-- Créé: 2026-01-14
-- Ordre: conversation_log → memory_system (respect dépendances)
-- ==============================================================================

-- ==============================================================================
-- PARTIE 1: TABLE claude_conversation_log (BASE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_conversation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification session
  session_date date NOT NULL,
  session_start timestamptz NOT NULL,
  session_end timestamptz,
  session_duration_minutes integer,

  -- Contexte
  titre text NOT NULL,
  description text NOT NULL,
  objectif text,
  contexte text,

  -- Travail effectué
  travail_accompli text[],
  fichiers_modifies text[],
  fichiers_crees text[],
  commandes_executees text[],

  -- Décisions importantes
  decisions_prises jsonb,
  problemes_rencontres jsonb,

  -- Métriques
  lignes_code_ajoutees integer DEFAULT 0,
  lignes_code_modifiees integer DEFAULT 0,
  tables_db_creees integer DEFAULT 0,
  tables_db_modifiees integer DEFAULT 0,
  migrations_executees integer DEFAULT 0,

  -- Git
  git_branch text,
  git_commits text[],
  git_commit_messages text[],

  -- Statut
  statut text DEFAULT 'en_cours',
  phase_projet text,

  -- Notes
  notes_importantes text,
  actions_suivantes text[],
  warnings text[],

  -- Metadata
  claude_version text DEFAULT 'Sonnet 4.5',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_conversation_log_date_idx
  ON public.claude_conversation_log(session_date DESC);

CREATE INDEX IF NOT EXISTS claude_conversation_log_phase_idx
  ON public.claude_conversation_log(phase_projet);

CREATE INDEX IF NOT EXISTS claude_conversation_log_branch_idx
  ON public.claude_conversation_log(git_branch);

COMMENT ON TABLE public.claude_conversation_log IS 'Journal complet des sessions de travail avec Claude.';

-- ==============================================================================
-- FONCTION: set_updated_at (utilisée par triggers)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger auto-update
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversation_log_updated_at') THEN
    CREATE TRIGGER trg_conversation_log_updated_at
      BEFORE UPDATE ON public.claude_conversation_log
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ==============================================================================
-- PARTIE 2: TABLE claude_projects
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  project_name text NOT NULL UNIQUE,
  project_slug text NOT NULL UNIQUE,
  project_path text NOT NULL,

  -- Description
  description text,
  objectif_principal text,
  technologies jsonb,

  -- Status
  status text DEFAULT 'actif',
  priorite integer DEFAULT 5,

  -- Métriques
  sessions_count integer DEFAULT 0,
  dernier_travail_date date,
  dernier_travail_description text,

  -- Accès
  acces_niveau text DEFAULT 'full',
  acces_limites jsonb,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_projects_status_idx ON public.claude_projects(status);
CREATE INDEX IF NOT EXISTS claude_projects_slug_idx ON public.claude_projects(project_slug);

COMMENT ON TABLE public.claude_projects IS 'Liste des projets disponibles avec accès et permissions.';

-- Trigger auto-update
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at') THEN
    CREATE TRIGGER trg_projects_updated_at
      BEFORE UPDATE ON public.claude_projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ==============================================================================
-- PARTIE 3: TABLE claude_messages
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  session_id uuid NOT NULL REFERENCES public.claude_conversation_log(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.claude_projects(id) ON DELETE SET NULL,

  -- Message
  msg_timestamp timestamptz NOT NULL DEFAULT now(),
  author text NOT NULL,
  content text NOT NULL,
  content_type text DEFAULT 'text',

  -- Contexte
  tool_used text,
  file_path text,
  command text,

  -- Catégorisation
  tags text[],
  importance text DEFAULT 'normal',

  -- Recherche
  search_vector tsvector,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_messages_session_idx ON public.claude_messages(session_id);
CREATE INDEX IF NOT EXISTS claude_messages_project_idx ON public.claude_messages(project_id);
CREATE INDEX IF NOT EXISTS claude_messages_timestamp_idx ON public.claude_messages(msg_timestamp DESC);
CREATE INDEX IF NOT EXISTS claude_messages_author_idx ON public.claude_messages(author);
CREATE INDEX IF NOT EXISTS claude_messages_tags_idx ON public.claude_messages USING gin(tags);
CREATE INDEX IF NOT EXISTS claude_messages_search_idx ON public.claude_messages USING gin(search_vector);

COMMENT ON TABLE public.claude_messages IS 'Enregistre CHAQUE message de CHAQUE conversation.';

-- ==============================================================================
-- PARTIE 4: TABLE claude_files_touched
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_files_touched (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  session_id uuid NOT NULL REFERENCES public.claude_conversation_log(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.claude_messages(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.claude_projects(id) ON DELETE SET NULL,

  -- Fichier
  file_path text NOT NULL,
  file_name text NOT NULL,
  action text NOT NULL,

  -- Contenu
  old_content text,
  new_content text,
  diff text,

  -- Métriques
  lines_added integer DEFAULT 0,
  lines_removed integer DEFAULT 0,

  -- Metadata
  file_timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_files_touched_session_idx ON public.claude_files_touched(session_id);
CREATE INDEX IF NOT EXISTS claude_files_touched_file_idx ON public.claude_files_touched(file_path);
CREATE INDEX IF NOT EXISTS claude_files_touched_action_idx ON public.claude_files_touched(action);

COMMENT ON TABLE public.claude_files_touched IS 'Historique de tous les fichiers touchés par Claude.';

-- ==============================================================================
-- PARTIE 5: TABLE claude_decisions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  session_id uuid NOT NULL REFERENCES public.claude_conversation_log(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.claude_projects(id) ON DELETE SET NULL,

  -- Décision
  decision_timestamp timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL,
  rationale text NOT NULL,
  alternatives_considered jsonb,

  -- Impact
  impact_level text DEFAULT 'medium',
  reversible boolean DEFAULT true,

  -- Outcome
  executed boolean DEFAULT false,
  executed_at timestamptz,
  outcome text,
  notes text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_decisions_session_idx ON public.claude_decisions(session_id);
CREATE INDEX IF NOT EXISTS claude_decisions_project_idx ON public.claude_decisions(project_id);
CREATE INDEX IF NOT EXISTS claude_decisions_impact_idx ON public.claude_decisions(impact_level);

COMMENT ON TABLE public.claude_decisions IS 'Décisions importantes prises pendant les sessions.';

-- ==============================================================================
-- PARTIE 6: TABLE claude_knowledge
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  project_id uuid REFERENCES public.claude_projects(id) ON DELETE CASCADE,

  -- Connaissance
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,

  -- Contexte
  learned_from_session uuid REFERENCES public.claude_conversation_log(id),
  learned_at timestamptz NOT NULL DEFAULT now(),

  -- Applicabilité
  applicable_to text[],
  tags text[],

  -- Recherche
  search_vector tsvector,

  -- Metadata
  times_referenced integer DEFAULT 0,
  last_referenced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_knowledge_project_idx ON public.claude_knowledge(project_id);
CREATE INDEX IF NOT EXISTS claude_knowledge_category_idx ON public.claude_knowledge(category);
CREATE INDEX IF NOT EXISTS claude_knowledge_tags_idx ON public.claude_knowledge USING gin(tags);
CREATE INDEX IF NOT EXISTS claude_knowledge_search_idx ON public.claude_knowledge USING gin(search_vector);

COMMENT ON TABLE public.claude_knowledge IS 'Base de connaissance accumulée.';

-- Trigger auto-update
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_knowledge_updated_at') THEN
    CREATE TRIGGER trg_knowledge_updated_at
      BEFORE UPDATE ON public.claude_knowledge
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ==============================================================================
-- TRIGGERS: Auto-update search_vector
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_claude_messages_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.content, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.file_path, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_claude_messages_search ON public.claude_messages;
CREATE TRIGGER trg_claude_messages_search
  BEFORE INSERT OR UPDATE ON public.claude_messages
  FOR EACH ROW EXECUTE FUNCTION update_claude_messages_search();

CREATE OR REPLACE FUNCTION update_claude_knowledge_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_claude_knowledge_search ON public.claude_knowledge;
CREATE TRIGGER trg_claude_knowledge_search
  BEFORE INSERT OR UPDATE ON public.claude_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_claude_knowledge_search();

-- ==============================================================================
-- FONCTIONS DE RECHERCHE
-- ==============================================================================

CREATE OR REPLACE FUNCTION search_claude_history(
  search_query text,
  project_filter uuid DEFAULT NULL,
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  message_id uuid,
  session_id uuid,
  project_name text,
  msg_timestamp timestamptz,
  author text,
  content text,
  relevance real
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as message_id,
    m.session_id,
    p.project_name,
    m.msg_timestamp,
    m.author,
    m.content,
    ts_rank(m.search_vector, plainto_tsquery('french', search_query)) as relevance
  FROM claude_messages m
  LEFT JOIN claude_projects p ON p.id = m.project_id
  WHERE
    m.search_vector @@ plainto_tsquery('french', search_query)
    AND (project_filter IS NULL OR m.project_id = project_filter)
    AND (date_from IS NULL OR m.msg_timestamp >= date_from)
    AND (date_to IS NULL OR m.msg_timestamp <= date_to)
  ORDER BY relevance DESC, m.msg_timestamp DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_important_decisions(
  project_filter uuid DEFAULT NULL,
  impact_filter text DEFAULT 'high'
)
RETURNS TABLE (
  decision_id uuid,
  project_name text,
  decision_timestamp timestamptz,
  decision text,
  rationale text,
  impact_level text,
  executed boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as decision_id,
    p.project_name,
    d.decision_timestamp,
    d.decision,
    d.rationale,
    d.impact_level,
    d.executed
  FROM claude_decisions d
  LEFT JOIN claude_projects p ON p.id = d.project_id
  WHERE
    (project_filter IS NULL OR d.project_id = project_filter)
    AND (impact_filter IS NULL OR d.impact_level = impact_filter)
  ORDER BY d.decision_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- VALIDATION FINALE
-- ==============================================================================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'claude_conversation_log',
      'claude_projects',
      'claude_messages',
      'claude_files_touched',
      'claude_decisions',
      'claude_knowledge'
    );

  IF table_count != 6 THEN
    RAISE EXCEPTION 'Tables mémoire non créées. Attendu: 6, Trouvé: %', table_count;
  END IF;

  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('search_claude_history', 'get_important_decisions');

  IF function_count != 2 THEN
    RAISE EXCEPTION 'Fonctions recherche non créées. Attendu: 2, Trouvé: %', function_count;
  END IF;

  RAISE NOTICE '✅ Système Mémoire Claude COMPLET installé avec succès';
  RAISE NOTICE '   • Tables: 6 (conversation_log, projects, messages, files, decisions, knowledge)';
  RAISE NOTICE '   • Fonctions recherche: 2 (history, decisions)';
  RAISE NOTICE '   • Full-text search: activé (français)';
  RAISE NOTICE '   • Triggers: 3 (auto-update)';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Rechercher:';
  RAISE NOTICE '   SELECT * FROM search_claude_history(''phase 1'');';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Décisions:';
  RAISE NOTICE '   SELECT * FROM get_important_decisions();';
END $$;
