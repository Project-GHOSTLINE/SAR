-- =====================================================
-- SYSTÈME DE TRACKING D'ACTIVITÉ RÉEL POUR CLAUDE
-- =====================================================
-- Table pour logger toutes les actions réelles de Claude

CREATE TABLE IF NOT EXISTS claude_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  project_name TEXT NOT NULL DEFAULT 'sar',
  session_id TEXT, -- ID de session

  -- Action
  action_type TEXT NOT NULL, -- 'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', etc.
  target TEXT NOT NULL, -- Fichier, commande, etc.
  details JSONB, -- Détails supplémentaires

  -- Résultat
  status TEXT DEFAULT 'success', -- 'success', 'error', 'pending'
  error_message TEXT,
  duration_ms INTEGER, -- Durée en millisecondes

  -- Contexte
  thought TEXT, -- La pensée derrière l'action
  goal TEXT, -- L'objectif de l'action

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_actions_project_date ON claude_actions(project_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_type ON claude_actions(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_session ON claude_actions(session_id, created_at DESC);

-- Table pour tracker les fichiers modifiés
CREATE TABLE IF NOT EXISTS claude_file_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  project_name TEXT NOT NULL DEFAULT 'sar',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,

  -- Type de changement
  change_type TEXT NOT NULL, -- 'created', 'modified', 'deleted'

  -- Détails
  lines_added INTEGER,
  lines_removed INTEGER,
  size_bytes INTEGER,

  -- Contenu (optionnel, pour diff)
  old_content TEXT,
  new_content TEXT,

  -- Contexte
  reason TEXT, -- Pourquoi ce fichier a été modifié
  related_action_id UUID REFERENCES claude_actions(id),

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_file_changes_project_date ON claude_file_changes(project_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_changes_type ON claude_file_changes(change_type, created_at DESC);

-- Vue: Activité récente
CREATE OR REPLACE VIEW claude_recent_activity AS
SELECT
  a.id,
  a.action_type,
  a.target,
  a.status,
  a.duration_ms,
  a.thought,
  a.created_at,
  f.file_path,
  f.change_type
FROM claude_actions a
LEFT JOIN claude_file_changes f ON f.related_action_id = a.id
WHERE a.project_name = 'sar'
ORDER BY a.created_at DESC
LIMIT 100;

-- Fonction: Obtenir l'activité récente
CREATE OR REPLACE FUNCTION get_claude_activity(
  p_project TEXT DEFAULT 'sar',
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action_type TEXT,
  target TEXT,
  status TEXT,
  duration_ms INTEGER,
  thought TEXT,
  created_at TIMESTAMPTZ,
  files_changed JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.action_type,
    a.target,
    a.status,
    a.duration_ms,
    a.thought,
    a.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'file', f.file_path,
            'type', f.change_type
          )
        )
        FROM claude_file_changes f
        WHERE f.related_action_id = a.id
      ),
      '[]'::jsonb
    ) as files_changed
  FROM claude_actions a
  WHERE a.project_name = p_project
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Stats d'activité
CREATE OR REPLACE FUNCTION get_claude_stats(
  p_project TEXT DEFAULT 'sar'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_actions', (
      SELECT COUNT(*) FROM claude_actions WHERE project_name = p_project
    ),
    'actions_today', (
      SELECT COUNT(*) FROM claude_actions
      WHERE project_name = p_project
      AND created_at >= CURRENT_DATE
    ),
    'files_changed', (
      SELECT COUNT(DISTINCT file_path) FROM claude_file_changes
      WHERE project_name = p_project
    ),
    'avg_duration_ms', (
      SELECT ROUND(AVG(duration_ms)) FROM claude_actions
      WHERE project_name = p_project AND duration_ms IS NOT NULL
    ),
    'by_type', (
      SELECT json_object_agg(action_type, count)
      FROM (
        SELECT action_type, COUNT(*) as count
        FROM claude_actions
        WHERE project_name = p_project
        GROUP BY action_type
      ) sub
    ),
    'recent_thoughts', (
      SELECT json_agg(thought)
      FROM (
        SELECT DISTINCT thought
        FROM claude_actions
        WHERE project_name = p_project AND thought IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 10
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE claude_actions IS 'Log de toutes les actions réelles de Claude';
COMMENT ON TABLE claude_file_changes IS 'Historique des modifications de fichiers par Claude';
