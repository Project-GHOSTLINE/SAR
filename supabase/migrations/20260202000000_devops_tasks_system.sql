-- ============================================
-- DevOps Tasks Management System
-- Date: 2026-02-02
-- Purpose: Gestion complète des tâches DevOps pour SAR et Crédit Secours
-- ============================================

-- ============================================
-- Table principale: devops_tasks
-- ============================================
CREATE TABLE IF NOT EXISTS devops_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Classification
  task_type TEXT NOT NULL CHECK (task_type IN ('todo', 'fix', 'modify', 'debug', 'create')),
  department TEXT NOT NULL CHECK (department IN (
    'accounting',           -- Comptabilité & Administration
    'web_sar',             -- Site Web SAR
    'web_credit',          -- Site Web Crédit Secours
    'logistics',           -- Logistique Employés (Email, GDrive, etc.)
    'margill_app',         -- Margill Application
    'margill_dashboard',   -- Margill Dashboard
    'infrastructure'       -- Infrastructure (Vercel, Railway, Cloudflare, etc.)
  )),

  -- Infrastructure Layer (pour diagramme)
  infrastructure_layer TEXT CHECK (infrastructure_layer IN (
    'frontend',    -- SAR Site, Crédit Secours Site
    'backend',     -- Next.js API, Margill Backend
    'database',    -- Supabase
    'hosting',     -- Vercel, Railway, Cloudways
    'external'     -- VoPay, Flinks, Cloudflare, GoDaddy
  )),

  -- Workflow
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Assignation
  assigned_to TEXT,                    -- Nom de l'assignee (ex: "Anthony", "Frederic")
  assigned_at TIMESTAMPTZ,

  -- Dates
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Blocage
  blocked_reason TEXT,

  -- Tags & Metadata
  tags TEXT[] DEFAULT '{}',            -- Ex: ['bug', 'urgent', 'cloudflare']
  related_service TEXT,                -- Ex: 'Vercel', 'Railway', 'Cloudflare'
  metadata JSONB DEFAULT '{}'::jsonb,  -- Données additionnelles flexibles

  -- Audit
  created_by TEXT DEFAULT 'Frederic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: devops_task_comments
-- ============================================
CREATE TABLE IF NOT EXISTS devops_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES devops_tasks(id) ON DELETE CASCADE,

  -- Auteur
  user_name TEXT NOT NULL,
  user_email TEXT,

  -- Contenu
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,   -- Note interne vs commentaire public

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: devops_task_attachments (Phase 2)
-- ============================================
CREATE TABLE IF NOT EXISTS devops_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES devops_tasks(id) ON DELETE CASCADE,

  -- Fichier
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  -- Auteur
  uploaded_by TEXT NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes pour performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_devops_tasks_status
  ON devops_tasks(status);

CREATE INDEX IF NOT EXISTS idx_devops_tasks_priority
  ON devops_tasks(priority);

CREATE INDEX IF NOT EXISTS idx_devops_tasks_department
  ON devops_tasks(department);

CREATE INDEX IF NOT EXISTS idx_devops_tasks_assigned_to
  ON devops_tasks(assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devops_tasks_layer
  ON devops_tasks(infrastructure_layer)
  WHERE infrastructure_layer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devops_tasks_created_at
  ON devops_tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_devops_tasks_last_activity
  ON devops_tasks(last_activity_at DESC);

-- Composite indexes pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_devops_tasks_status_priority
  ON devops_tasks(status, priority DESC, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_devops_tasks_department_status
  ON devops_tasks(department, status);

-- Full-text search sur title + description
CREATE INDEX IF NOT EXISTS idx_devops_tasks_search
  ON devops_tasks USING gin(to_tsvector('french',
    coalesce(title,'') || ' ' ||
    coalesce(description,'')
  ));

-- GIN index pour tags
CREATE INDEX IF NOT EXISTS idx_devops_tasks_tags
  ON devops_tasks USING gin(tags);

-- Index sur comments
CREATE INDEX IF NOT EXISTS idx_devops_task_comments_task_id
  ON devops_task_comments(task_id, created_at DESC);

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_devops_tasks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_devops_tasks_updated_at
  BEFORE UPDATE ON devops_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_devops_tasks_timestamp();

-- ============================================
-- Trigger: Auto-generate task_number
-- ============================================
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_prefix TEXT;
BEGIN
  -- Prefix basé sur le type
  v_prefix := CASE NEW.task_type
    WHEN 'fix' THEN 'FIX'
    WHEN 'create' THEN 'FEAT'
    WHEN 'modify' THEN 'ENH'
    WHEN 'debug' THEN 'DBG'
    ELSE 'TASK'
  END;

  -- Compter les tâches existantes pour ce type
  SELECT COUNT(*) INTO v_count
  FROM devops_tasks
  WHERE task_type = NEW.task_type;

  -- Générer le numéro: FIX-0001, FEAT-0042, etc.
  NEW.task_number := v_prefix || '-' || LPAD((v_count + 1)::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_task_number
  BEFORE INSERT ON devops_tasks
  FOR EACH ROW
  WHEN (NEW.task_number IS NULL OR NEW.task_number = '')
  EXECUTE FUNCTION generate_task_number();

-- ============================================
-- Function: Get DevOps Stats
-- ============================================
CREATE OR REPLACE FUNCTION get_devops_stats()
RETURNS TABLE(
  total_tasks BIGINT,
  todo_count BIGINT,
  in_progress_count BIGINT,
  blocked_count BIGINT,
  done_count BIGINT,
  urgent_count BIGINT,
  high_priority_count BIGINT,
  overdue_count BIGINT,
  completed_this_week BIGINT,
  tasks_by_department JSONB,
  tasks_by_layer JSONB,
  tasks_by_assignee JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'todo') as todo,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
      COUNT(*) FILTER (WHERE status = 'done') as done,
      COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
      COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'done') as overdue,
      COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days') as completed_week
    FROM devops_tasks
  ),
  dept_stats AS (
    SELECT jsonb_object_agg(
      department,
      jsonb_build_object(
        'total', count(*),
        'todo', COUNT(*) FILTER (WHERE status = 'todo'),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'done', COUNT(*) FILTER (WHERE status = 'done')
      )
    ) as by_dept
    FROM devops_tasks
    GROUP BY department
  ),
  layer_stats AS (
    SELECT jsonb_object_agg(
      infrastructure_layer,
      count(*)
    ) as by_layer
    FROM devops_tasks
    WHERE infrastructure_layer IS NOT NULL
    GROUP BY infrastructure_layer
  ),
  assignee_stats AS (
    SELECT jsonb_object_agg(
      COALESCE(assigned_to, 'Unassigned'),
      jsonb_build_object(
        'total', count(*),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'done', COUNT(*) FILTER (WHERE status = 'done')
      )
    ) as by_assignee
    FROM devops_tasks
    GROUP BY assigned_to
  )
  SELECT
    s.total,
    s.todo,
    s.in_progress,
    s.blocked,
    s.done,
    s.urgent,
    s.high_priority,
    s.overdue,
    s.completed_week,
    COALESCE(d.by_dept, '{}'::jsonb),
    COALESCE(l.by_layer, '{}'::jsonb),
    COALESCE(a.by_assignee, '{}'::jsonb)
  FROM stats s
  CROSS JOIN dept_stats d
  CROSS JOIN layer_stats l
  CROSS JOIN assignee_stats a;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE devops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE devops_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE devops_task_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins peuvent tout faire
CREATE POLICY "Admins can manage devops_tasks"
  ON devops_tasks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage devops_task_comments"
  ON devops_task_comments FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage devops_task_attachments"
  ON devops_task_attachments FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Sample Data (pour tests)
-- ============================================
INSERT INTO devops_tasks (task_number, title, description, task_type, department, infrastructure_layer, priority, status, assigned_to)
VALUES
  ('TASK-0001', 'Optimiser le temps de chargement du site SAR', 'Réduire le TTFB et améliorer les Core Web Vitals. Analyser les bundles JavaScript et optimiser les images.', 'modify', 'web_sar', 'frontend', 'high', 'todo', 'Anthony'),
  ('FIX-0001', 'Corriger bug formulaire Crédit Secours', 'Le formulaire ne soumet pas sur mobile Safari. Erreur console : "Cannot read property of undefined". Vérifier validation côté client.', 'fix', 'web_credit', 'frontend', 'urgent', 'in_progress', 'Anthony'),
  ('FEAT-0001', 'Configurer backup automatique Supabase', 'Mettre en place backup quotidien avec retention 30 jours. Configurer via Supabase dashboard et tester restauration.', 'create', 'infrastructure', 'database', 'high', 'todo', 'Frederic'),
  ('DBG-0001', 'Analyser logs Railway pour erreurs API', 'Investiguer pics de 500 errors hier soir (23h-01h). Vérifier logs backend et connexions base de données.', 'debug', 'infrastructure', 'hosting', 'medium', 'blocked', 'Anthony'),
  ('FEAT-0002', 'Créer rapport mensuel Margill', 'Template Excel pour statistiques mensuelles : prêts actifs, montants, taux de défaut. Export automatisé.', 'create', 'margill_dashboard', 'backend', 'low', 'todo', NULL)
ON CONFLICT (task_number) DO NOTHING;

-- Ajouter quelques commentaires de test
INSERT INTO devops_task_comments (task_id, user_name, user_email, comment, is_internal)
SELECT
  id,
  'Frederic',
  'frederic@solutionargentrapide.ca',
  'Tâche créée automatiquement lors de la migration. À réviser.',
  false
FROM devops_tasks
WHERE task_number IN ('TASK-0001', 'FIX-0001', 'FEAT-0001')
LIMIT 3;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ DevOps Tasks System created successfully';
  RAISE NOTICE '📊 Tables: devops_tasks, devops_task_comments, devops_task_attachments';
  RAISE NOTICE '🔍 Indexes: 11 indexes created for performance';
  RAISE NOTICE '⚡ Triggers: auto-update timestamps + auto-generate task_number';
  RAISE NOTICE '📈 RPC Function: get_devops_stats() available';
  RAISE NOTICE '🧪 Sample Data: 5 tasks + 3 comments inserted for testing';
END $$;
