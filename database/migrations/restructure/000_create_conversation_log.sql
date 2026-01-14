-- ==============================================================================
-- TABLE: claude_conversation_log
-- ==============================================================================
-- Enregistre toutes les sessions de travail avec Claude
-- Permet de tracer l'historique complet des décisions et modifications
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
  travail_accompli text[], -- Array de tâches accomplies
  fichiers_modifies text[], -- Array de fichiers touchés
  fichiers_crees text[], -- Array de nouveaux fichiers
  commandes_executees text[], -- Array de commandes bash

  -- Décisions importantes
  decisions_prises jsonb, -- {decision: string, rationale: string, timestamp: string}[]
  problemes_rencontres jsonb, -- {probleme: string, solution: string, timestamp: string}[]

  -- Métriques
  lignes_code_ajoutees integer DEFAULT 0,
  lignes_code_modifiees integer DEFAULT 0,
  tables_db_creees integer DEFAULT 0,
  tables_db_modifiees integer DEFAULT 0,
  migrations_executees integer DEFAULT 0,

  -- Git
  git_branch text,
  git_commits text[], -- Array de commit hashes
  git_commit_messages text[],

  -- Statut
  statut text DEFAULT 'en_cours', -- en_cours, completee, interrompue
  phase_projet text, -- Phase 0, Phase 1, etc.

  -- Notes
  notes_importantes text,
  actions_suivantes text[],
  warnings text[],

  -- Metadata
  claude_version text DEFAULT 'Sonnet 4.5',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS claude_conversation_log_date_idx
  ON public.claude_conversation_log(session_date DESC);

CREATE INDEX IF NOT EXISTS claude_conversation_log_phase_idx
  ON public.claude_conversation_log(phase_projet);

CREATE INDEX IF NOT EXISTS claude_conversation_log_branch_idx
  ON public.claude_conversation_log(git_branch);

COMMENT ON TABLE public.claude_conversation_log IS 'Journal complet des sessions de travail avec Claude. Traçabilité totale des décisions et modifications.';

-- Trigger auto-update
CREATE TRIGGER trg_conversation_log_updated_at
  BEFORE UPDATE ON public.claude_conversation_log
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
