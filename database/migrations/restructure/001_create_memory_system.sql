-- ==============================================================================
-- SYSTÈME CENTRAL DE MÉMOIRE CLAUDE
-- ==============================================================================
-- Enregistre CHAQUE mot écrit dans CHAQUE conversation
-- Permet recherche complète dans l'historique (même d'il y a 2 semaines)
-- ==============================================================================

-- ==============================================================================
-- TABLE 1: claude_projects (Projets disponibles)
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
  technologies jsonb, -- ["Next.js", "Supabase", "TypeScript"]

  -- Status
  status text DEFAULT 'actif', -- actif, pause, archive, complete
  priorite integer DEFAULT 5, -- 1-10

  -- Métriques
  sessions_count integer DEFAULT 0,
  dernier_travail_date date,
  dernier_travail_description text,

  -- Accès
  acces_niveau text DEFAULT 'full', -- full, readonly, restricted
  acces_limites jsonb, -- {commands: [], paths: []}

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_projects_status_idx ON public.claude_projects(status);
CREATE INDEX IF NOT EXISTS claude_projects_slug_idx ON public.claude_projects(project_slug);

COMMENT ON TABLE public.claude_projects IS 'Liste des projets disponibles avec accès et permissions.';

-- ==============================================================================
-- TABLE 2: claude_messages (Tous les messages échangés)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  session_id uuid NOT NULL REFERENCES public.claude_conversation_log(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.claude_projects(id) ON DELETE SET NULL,

  -- Message
  timestamp timestamptz NOT NULL DEFAULT now(),
  author text NOT NULL, -- 'user' ou 'claude'
  content text NOT NULL,
  content_type text DEFAULT 'text', -- text, code, markdown, json

  -- Contexte
  tool_used text, -- Bash, Read, Write, Edit, etc.
  file_path text, -- Si action sur fichier
  command text, -- Si commande bash

  -- Catégorisation
  tags text[], -- ['git', 'database', 'migration', 'bug-fix']
  importance text DEFAULT 'normal', -- low, normal, high, critical

  -- Recherche (tsvector pour full-text search)
  search_vector tsvector,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes pour recherche rapide
CREATE INDEX IF NOT EXISTS claude_messages_session_idx ON public.claude_messages(session_id);
CREATE INDEX IF NOT EXISTS claude_messages_project_idx ON public.claude_messages(project_id);
CREATE INDEX IF NOT EXISTS claude_messages_timestamp_idx ON public.claude_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS claude_messages_author_idx ON public.claude_messages(author);
CREATE INDEX IF NOT EXISTS claude_messages_tags_idx ON public.claude_messages USING gin(tags);

-- Index full-text search
CREATE INDEX IF NOT EXISTS claude_messages_search_idx
  ON public.claude_messages USING gin(search_vector);

COMMENT ON TABLE public.claude_messages IS 'Enregistre CHAQUE message de CHAQUE conversation. Recherche full-text disponible.';

-- ==============================================================================
-- TABLE 3: claude_files_touched (Fichiers modifiés)
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
  action text NOT NULL, -- created, modified, deleted, read

  -- Contenu (optionnel, pour diff)
  old_content text,
  new_content text,
  diff text,

  -- Métriques
  lines_added integer DEFAULT 0,
  lines_removed integer DEFAULT 0,

  -- Metadata
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_files_touched_session_idx ON public.claude_files_touched(session_id);
CREATE INDEX IF NOT EXISTS claude_files_touched_file_idx ON public.claude_files_touched(file_path);
CREATE INDEX IF NOT EXISTS claude_files_touched_action_idx ON public.claude_files_touched(action);

COMMENT ON TABLE public.claude_files_touched IS 'Historique de tous les fichiers touchés par Claude.';

-- ==============================================================================
-- TABLE 4: claude_decisions (Décisions importantes)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  session_id uuid NOT NULL REFERENCES public.claude_conversation_log(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.claude_projects(id) ON DELETE SET NULL,

  -- Décision
  timestamp timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL,
  rationale text NOT NULL,
  alternatives_considered jsonb, -- [{option: "A", pros: [], cons: []}]

  -- Impact
  impact_level text DEFAULT 'medium', -- low, medium, high, critical
  reversible boolean DEFAULT true,

  -- Outcome
  executed boolean DEFAULT false,
  executed_at timestamptz,
  outcome text, -- success, failure, partial
  notes text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claude_decisions_session_idx ON public.claude_decisions(session_id);
CREATE INDEX IF NOT EXISTS claude_decisions_project_idx ON public.claude_decisions(project_id);
CREATE INDEX IF NOT EXISTS claude_decisions_impact_idx ON public.claude_decisions(impact_level);

COMMENT ON TABLE public.claude_decisions IS 'Enregistre toutes les décisions importantes prises pendant les sessions.';

-- ==============================================================================
-- TABLE 5: claude_knowledge (Base de connaissance)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.claude_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation
  project_id uuid REFERENCES public.claude_projects(id) ON DELETE CASCADE,

  -- Connaissance
  category text NOT NULL, -- 'pattern', 'gotcha', 'best-practice', 'architecture'
  title text NOT NULL,
  content text NOT NULL,

  -- Contexte
  learned_from_session uuid REFERENCES public.claude_conversation_log(id),
  learned_at timestamptz NOT NULL DEFAULT now(),

  -- Applicabilité
  applicable_to text[], -- ['all-projects', 'sar', 'mvp-v1']
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
CREATE INDEX IF NOT EXISTS claude_knowledge_search_idx
  ON public.claude_knowledge USING gin(search_vector);

COMMENT ON TABLE public.claude_knowledge IS 'Base de connaissance accumulée. Patterns, gotchas, best practices apprises.';

-- ==============================================================================
-- TRIGGERS: Auto-update search_vector
-- ==============================================================================

-- Trigger pour claude_messages
CREATE OR REPLACE FUNCTION update_claude_messages_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.content, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.file_path, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_claude_messages_search
  BEFORE INSERT OR UPDATE ON public.claude_messages
  FOR EACH ROW EXECUTE FUNCTION update_claude_messages_search();

-- Trigger pour claude_knowledge
CREATE OR REPLACE FUNCTION update_claude_knowledge_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_claude_knowledge_search
  BEFORE INSERT OR UPDATE ON public.claude_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_claude_knowledge_search();

-- ==============================================================================
-- FONCTIONS DE RECHERCHE
-- ==============================================================================

-- Fonction: Rechercher dans l'historique complet
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
  timestamp timestamptz,
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
    m.timestamp,
    m.author,
    m.content,
    ts_rank(m.search_vector, plainto_tsquery('french', search_query)) as relevance
  FROM claude_messages m
  LEFT JOIN claude_projects p ON p.id = m.project_id
  WHERE
    m.search_vector @@ plainto_tsquery('french', search_query)
    AND (project_filter IS NULL OR m.project_id = project_filter)
    AND (date_from IS NULL OR m.timestamp >= date_from)
    AND (date_to IS NULL OR m.timestamp <= date_to)
  ORDER BY relevance DESC, m.timestamp DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Rechercher décisions par impact
CREATE OR REPLACE FUNCTION get_important_decisions(
  project_filter uuid DEFAULT NULL,
  impact_filter text DEFAULT 'high'
)
RETURNS TABLE (
  decision_id uuid,
  project_name text,
  timestamp timestamptz,
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
    d.timestamp,
    d.decision,
    d.rationale,
    d.impact_level,
    d.executed
  FROM claude_decisions d
  LEFT JOIN claude_projects p ON p.id = d.project_id
  WHERE
    (project_filter IS NULL OR d.project_id = project_filter)
    AND (impact_filter IS NULL OR d.impact_level = impact_filter)
  ORDER BY d.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- VALIDATION
-- ==============================================================================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Vérifier tables créées
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'claude_projects',
      'claude_messages',
      'claude_files_touched',
      'claude_decisions',
      'claude_knowledge'
    );

  IF table_count != 5 THEN
    RAISE EXCEPTION 'Tables mémoire non créées. Attendu: 5, Trouvé: %', table_count;
  END IF;

  -- Vérifier fonctions créées
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('search_claude_history', 'get_important_decisions');

  IF function_count != 2 THEN
    RAISE EXCEPTION 'Fonctions recherche non créées. Attendu: 2, Trouvé: %', function_count;
  END IF;

  RAISE NOTICE '✅ Système Mémoire Claude installé avec succès';
  RAISE NOTICE '   • Tables: 5 (projects, messages, files, decisions, knowledge)';
  RAISE NOTICE '   • Fonctions recherche: 2 (history, decisions)';
  RAISE NOTICE '   • Full-text search: activé (français)';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Rechercher dans l''historique:';
  RAISE NOTICE '   SELECT * FROM search_claude_history(''phase 1'');';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Décisions importantes:';
  RAISE NOTICE '   SELECT * FROM get_important_decisions(NULL, ''high'');';
END $$;
