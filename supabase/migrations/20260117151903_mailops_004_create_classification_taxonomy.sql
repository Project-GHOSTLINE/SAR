-- Mail Ops - Migration 004: Classification Taxonomy
-- Description: Taxonomie des catégories d'emails (modifiable, versionnée)
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

CREATE TABLE IF NOT EXISTS classification_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL DEFAULT 'SAR_EMAIL_V1',
  category_code TEXT NOT NULL,
  category_label TEXT NOT NULL,
  category_description TEXT,
  parent_category_code TEXT,
  priority_default TEXT,
  auto_response_template_id UUID,
  sla_hours INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_version_code UNIQUE(version, category_code)
);

-- Indexes
CREATE INDEX idx_taxonomy_version ON classification_taxonomy(version, is_active);
CREATE INDEX idx_taxonomy_category ON classification_taxonomy(category_code);

-- Commentaires
COMMENT ON TABLE classification_taxonomy IS 'Taxonomie des catégories d''emails (modifiable en BD, versionnée)';
COMMENT ON COLUMN classification_taxonomy.version IS 'Version taxonomie (permet évolution): SAR_EMAIL_V1, SAR_EMAIL_V2, etc.';
COMMENT ON COLUMN classification_taxonomy.category_code IS 'Code catégorie (uppercase snake_case): QUESTION_GENERALE, DEMANDE_INFO_PRET, PLAINTE, etc.';
COMMENT ON COLUMN classification_taxonomy.priority_default IS 'Priorité par défaut: low, medium, high, urgent';
COMMENT ON COLUMN classification_taxonomy.sla_hours IS 'SLA en heures pour cette catégorie';

-- Seed initial (catégories de base)
INSERT INTO classification_taxonomy (version, category_code, category_label, priority_default, sla_hours) VALUES
  ('SAR_EMAIL_V1', 'QUESTION_GENERALE', 'Question Générale', 'low', 48),
  ('SAR_EMAIL_V1', 'DEMANDE_INFO_PRET', 'Demande Info Prêt', 'medium', 24),
  ('SAR_EMAIL_V1', 'PLAINTE', 'Plainte Client', 'high', 4),
  ('SAR_EMAIL_V1', 'URGENCE', 'Urgence', 'urgent', 1),
  ('SAR_EMAIL_V1', 'SUIVI_DOSSIER', 'Suivi Dossier', 'medium', 24),
  ('SAR_EMAIL_V1', 'PAIEMENT', 'Question Paiement', 'high', 12),
  ('SAR_EMAIL_V1', 'AUTRE', 'Autre', 'low', 72)
ON CONFLICT (version, category_code) DO NOTHING;
