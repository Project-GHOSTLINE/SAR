-- ============================================
-- FIX: Supprimer et recréer la table signature_templates
-- ============================================

-- Supprimer la table si elle existe (avec CASCADE pour les dépendances)
DROP TABLE IF EXISTS public.signature_templates CASCADE;

-- ============================================
-- TABLE: signature_templates
-- ============================================

CREATE TABLE public.signature_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  signature_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les contraintes APRÈS la création de la table
ALTER TABLE public.signature_templates
  ADD CONSTRAINT valid_category CHECK (category IN ('general', 'loan', 'lease', 'agreement', 'other'));

ALTER TABLE public.signature_templates
  ADD CONSTRAINT valid_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 200);

ALTER TABLE public.signature_templates
  ADD CONSTRAINT valid_fields CHECK (jsonb_typeof(signature_fields) = 'array');

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_signature_templates_name ON public.signature_templates(name);
CREATE INDEX idx_signature_templates_category ON public.signature_templates(category);
CREATE INDEX idx_signature_templates_active ON public.signature_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_signature_templates_usage ON public.signature_templates(usage_count DESC);
CREATE INDEX idx_signature_templates_fields ON public.signature_templates USING GIN (signature_fields);

-- ============================================
-- TRIGGER: Mise à jour automatique de updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_signature_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_signature_templates_updated_at
  BEFORE UPDATE ON public.signature_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_templates_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.signature_templates ENABLE ROW LEVEL SECURITY;

-- Lecture publique des templates actifs
CREATE POLICY "Templates actifs visibles par tous"
  ON public.signature_templates
  FOR SELECT
  USING (is_active = true);

-- Service role peut tout faire
CREATE POLICY "Service role peut tout lire"
  ON public.signature_templates
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role peut créer"
  ON public.signature_templates
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role peut modifier"
  ON public.signature_templates
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role peut supprimer"
  ON public.signature_templates
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================
-- FONCTION: Incrémenter le compteur d'utilisation
-- ============================================

CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.signature_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TEMPLATE PAR DÉFAUT
-- ============================================

INSERT INTO public.signature_templates (name, description, category, signature_fields, is_active)
VALUES (
  'Contrat SAR Standard',
  'Template par défaut pour les contrats de prêt Solution Argent Rapide',
  'loan',
  '[
    {
      "id": "signature_client",
      "type": "signature",
      "label": "Signature du client",
      "page": 1,
      "x": 100,
      "y": 650,
      "width": 180,
      "height": 40
    },
    {
      "id": "initiales_client",
      "type": "initials",
      "label": "Initiales du client",
      "page": 1,
      "x": 400,
      "y": 650,
      "width": 80,
      "height": 25
    }
  ]'::jsonb,
  true
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  '✅ Table signature_templates créée avec succès!' as status,
  COUNT(*) as templates_count
FROM public.signature_templates;
