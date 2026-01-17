-- Mail Ops - Migration 005: Email Classifications
-- Description: Classifications d'emails (versionné, permet re-classification)
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

CREATE TABLE IF NOT EXISTS email_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,

  -- Classification
  category_code TEXT NOT NULL,
  category_version TEXT NOT NULL DEFAULT 'SAR_EMAIL_V1',
  priority TEXT NOT NULL,

  -- Sentiment (optionnel, pour Phase 3 ML)
  sentiment TEXT,
  sentiment_score DECIMAL(3,2),

  -- Confidence
  classification_method TEXT NOT NULL,
  confidence_score DECIMAL(3,2),

  -- Metadata
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  classified_by TEXT,

  -- Versioning (pour reclass)
  is_current BOOLEAN DEFAULT true,
  superseded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT check_method CHECK (classification_method IN ('rules', 'ml', 'manual'))
);

-- Indexes
CREATE INDEX idx_email_class_message ON email_classifications(email_message_id, is_current);
CREATE INDEX idx_email_class_category ON email_classifications(category_code);
CREATE INDEX idx_email_class_priority ON email_classifications(priority);
CREATE INDEX idx_email_class_current ON email_classifications(is_current) WHERE is_current;

-- Commentaires
COMMENT ON TABLE email_classifications IS 'Classifications d''emails (versionné, permet re-classification)';
COMMENT ON COLUMN email_classifications.classification_method IS 'Méthode: rules (règles simples), ml (machine learning), manual (manuel admin)';
COMMENT ON COLUMN email_classifications.confidence_score IS 'Score confiance 0.00 à 1.00';
COMMENT ON COLUMN email_classifications.sentiment IS 'Sentiment: positive, neutral, negative (Phase 3)';
COMMENT ON COLUMN email_classifications.is_current IS 'true = classification actuelle, false = historique (si re-classifié)';
