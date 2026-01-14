-- =====================================================
-- SYSTÈME DE MÉMOIRE À LONG TERME POUR CLAUDE
-- =====================================================
-- Créé le: 2026-01-13
-- Description: Tables pour stocker la mémoire contextuelle de Claude
-- =====================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: claude_memory (Mémoire principale)
-- =====================================================
-- Stocke toutes les connaissances du projet

CREATE TABLE IF NOT EXISTS claude_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  project_name TEXT NOT NULL, -- 'sar', 'frictrak', etc.
  category TEXT NOT NULL, -- 'architecture', 'features', 'decisions', 'bugs', 'apis', 'conventions'
  key TEXT NOT NULL, -- identifiant unique pour la mémoire (ex: 'auth_system', 'supabase_integration')

  -- Contenu
  content JSONB NOT NULL, -- contenu flexible et structuré
  context TEXT, -- contexte textuel pour recherche
  tags TEXT[], -- tags pour catégorisation supplémentaire

  -- Métadonnées
  importance INTEGER DEFAULT 5, -- 1-10, pour prioriser les infos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,

  -- Contrainte d'unicité
  UNIQUE(project_name, category, key)
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_claude_memory_project ON claude_memory(project_name);
CREATE INDEX IF NOT EXISTS idx_claude_memory_category ON claude_memory(project_name, category);
CREATE INDEX IF NOT EXISTS idx_claude_memory_tags ON claude_memory USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_claude_memory_search ON claude_memory USING gin(content);
CREATE INDEX IF NOT EXISTS idx_claude_memory_importance ON claude_memory(project_name, importance DESC);

-- =====================================================
-- TABLE 2: claude_sessions (Historique des sessions)
-- =====================================================
-- Stocke l'historique de chaque session de travail

CREATE TABLE IF NOT EXISTS claude_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  project_name TEXT NOT NULL,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  session_duration INTEGER, -- en minutes

  -- Contenu
  summary TEXT, -- résumé de la session
  tasks_completed JSONB, -- liste des tâches complétées
  learnings JSONB, -- nouvelles connaissances acquises
  next_steps JSONB, -- prochaines étapes suggérées
  files_modified TEXT[], -- fichiers modifiés pendant la session

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_claude_sessions_project ON claude_sessions(project_name);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_date ON claude_sessions(project_name, session_date DESC);

-- =====================================================
-- TABLE 3: claude_docs_read (Documentation lue)
-- =====================================================
-- Garde une trace de tous les fichiers de documentation lus

CREATE TABLE IF NOT EXISTS claude_docs_read (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  project_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT, -- 'md', 'tsx', 'ts', 'sql', etc.

  -- Contenu
  file_hash TEXT, -- hash SHA256 pour détecter les modifications
  summary TEXT, -- résumé du fichier
  key_points JSONB, -- points clés extraits
  sections JSONB, -- structure du document

  -- Métadonnées
  file_size INTEGER, -- taille en bytes
  lines_count INTEGER, -- nombre de lignes
  read_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ,
  needs_reread BOOLEAN DEFAULT FALSE, -- true si le fichier a changé

  -- Contrainte d'unicité
  UNIQUE(project_name, file_path)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_claude_docs_project ON claude_docs_read(project_name);
CREATE INDEX IF NOT EXISTS idx_claude_docs_needs_reread ON claude_docs_read(project_name, needs_reread);
CREATE INDEX IF NOT EXISTS idx_claude_docs_type ON claude_docs_read(project_name, file_type);

-- =====================================================
-- TABLE 4: claude_code_insights (Insights sur le code)
-- =====================================================
-- Stocke les insights sur l'architecture et les patterns

CREATE TABLE IF NOT EXISTS claude_code_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  project_name TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'pattern', 'convention', 'architecture', 'api', 'component'
  title TEXT NOT NULL,

  -- Contenu
  description TEXT,
  code_example TEXT, -- exemple de code
  location TEXT, -- fichier ou dossier concerné
  related_files TEXT[], -- fichiers liés
  dependencies TEXT[], -- dépendances

  -- Métadonnées
  confidence_score INTEGER DEFAULT 5, -- 1-10, confiance dans l'insight
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte d'unicité
  UNIQUE(project_name, insight_type, title)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_claude_insights_project ON claude_code_insights(project_name);
CREATE INDEX IF NOT EXISTS idx_claude_insights_type ON claude_code_insights(project_name, insight_type);
CREATE INDEX IF NOT EXISTS idx_claude_insights_confidence ON claude_code_insights(project_name, confidence_score DESC);

-- =====================================================
-- TABLE 5: claude_questions (Questions en suspens)
-- =====================================================
-- Stocke les questions qui nécessitent clarification

CREATE TABLE IF NOT EXISTS claude_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  project_name TEXT NOT NULL,
  question TEXT NOT NULL,
  context TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'answered', 'irrelevant'
  answer TEXT,
  answered_at TIMESTAMPTZ,

  -- Métadonnées
  priority INTEGER DEFAULT 5, -- 1-10
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_claude_questions_project ON claude_questions(project_name);
CREATE INDEX IF NOT EXISTS idx_claude_questions_status ON claude_questions(project_name, status);
CREATE INDEX IF NOT EXISTS idx_claude_questions_priority ON claude_questions(project_name, priority DESC);

-- =====================================================
-- FONCTIONS HELPER
-- =====================================================

-- Fonction: Mettre à jour last_accessed_at automatiquement
CREATE OR REPLACE FUNCTION update_claude_memory_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur claude_memory
DROP TRIGGER IF EXISTS trigger_update_memory_access ON claude_memory;
CREATE TRIGGER trigger_update_memory_access
  BEFORE UPDATE ON claude_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_memory_access();

-- Fonction: Recherche dans la mémoire
CREATE OR REPLACE FUNCTION search_claude_memory(
  p_project_name TEXT,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  context TEXT,
  importance INTEGER,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.category,
    cm.key,
    cm.context,
    cm.importance,
    ts_rank(
      to_tsvector('english', COALESCE(cm.context, '') || ' ' || cm.key),
      plainto_tsquery('english', p_search_term)
    ) as relevance
  FROM claude_memory cm
  WHERE
    cm.project_name = p_project_name
    AND (
      to_tsvector('english', COALESCE(cm.context, '') || ' ' || cm.key) @@ plainto_tsquery('english', p_search_term)
      OR cm.tags @> ARRAY[p_search_term]
    )
  ORDER BY relevance DESC, cm.importance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Obtenir le contexte complet d'un projet
CREATE OR REPLACE FUNCTION get_project_context(
  p_project_name TEXT,
  p_top_n INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_context JSONB;
BEGIN
  SELECT jsonb_build_object(
    'project', p_project_name,
    'top_memories', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', category,
          'key', key,
          'content', content,
          'importance', importance
        ) ORDER BY importance DESC, last_accessed_at DESC
      )
      FROM (
        SELECT * FROM claude_memory
        WHERE project_name = p_project_name
        ORDER BY importance DESC, last_accessed_at DESC
        LIMIT p_top_n
      ) sub
    ),
    'recent_sessions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', session_date,
          'summary', summary,
          'tasks_completed', tasks_completed
        ) ORDER BY session_date DESC
      )
      FROM (
        SELECT * FROM claude_sessions
        WHERE project_name = p_project_name
        ORDER BY session_date DESC
        LIMIT 5
      ) sub
    ),
    'docs_count', (
      SELECT COUNT(*) FROM claude_docs_read WHERE project_name = p_project_name
    ),
    'insights_count', (
      SELECT COUNT(*) FROM claude_code_insights WHERE project_name = p_project_name
    ),
    'pending_questions', (
      SELECT COUNT(*) FROM claude_questions WHERE project_name = p_project_name AND status = 'pending'
    )
  ) INTO v_context;

  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS (Row Level Security) - Optionnel
-- =====================================================
-- Décommenter si vous voulez activer RLS

-- ALTER TABLE claude_memory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claude_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claude_docs_read ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claude_code_insights ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claude_questions ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire (à adapter selon vos besoins)
-- CREATE POLICY "Allow public read access" ON claude_memory FOR SELECT USING (true);
-- CREATE POLICY "Allow service role full access" ON claude_memory FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- DONNÉES INITIALES (Optionnel)
-- =====================================================

-- Créer une entrée initiale pour le projet SAR
INSERT INTO claude_memory (project_name, category, key, content, context, importance, tags)
VALUES (
  'sar',
  'project_info',
  'project_overview',
  jsonb_build_object(
    'name', 'Solution Argent Rapide',
    'type', 'Next.js Application',
    'description', 'Plateforme de prêts avec IBV (Flinks/Inverite)',
    'status', 'Production',
    'url', 'https://admin.solutionargentrapide.ca'
  ),
  'Solution Argent Rapide (SAR) est une application Next.js de gestion de prêts avec vérification bancaire instantanée.',
  10,
  ARRAY['project', 'nextjs', 'production']
)
ON CONFLICT (project_name, category, key) DO UPDATE
SET
  content = EXCLUDED.content,
  context = EXCLUDED.context,
  updated_at = NOW();

-- =====================================================
-- VUES UTILES
-- =====================================================

-- Vue: Résumé du projet
CREATE OR REPLACE VIEW claude_project_summary AS
SELECT
  cm.project_name,
  COUNT(DISTINCT cm.id) as total_memories,
  COUNT(DISTINCT cd.id) as docs_read,
  COUNT(DISTINCT ci.id) as insights,
  COUNT(DISTINCT cq.id) FILTER (WHERE cq.status = 'pending') as pending_questions,
  COUNT(DISTINCT cs.id) as total_sessions,
  MAX(cs.session_date) as last_session_date
FROM claude_memory cm
LEFT JOIN claude_docs_read cd ON cm.project_name = cd.project_name
LEFT JOIN claude_code_insights ci ON cm.project_name = ci.project_name
LEFT JOIN claude_questions cq ON cm.project_name = cq.project_name
LEFT JOIN claude_sessions cs ON cm.project_name = cs.project_name
GROUP BY cm.project_name;

-- =====================================================
-- STATISTIQUES
-- =====================================================

-- Afficher les stats
SELECT
  'Tables créées' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'claude_%') as count;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Coller ce script > Run
-- =====================================================

COMMENT ON TABLE claude_memory IS 'Mémoire principale de Claude pour stocker toutes les connaissances du projet';
COMMENT ON TABLE claude_sessions IS 'Historique des sessions de travail de Claude';
COMMENT ON TABLE claude_docs_read IS 'Trace de tous les fichiers de documentation lus par Claude';
COMMENT ON TABLE claude_code_insights IS 'Insights sur l''architecture et les patterns de code';
COMMENT ON TABLE claude_questions IS 'Questions en suspens nécessitant clarification';
