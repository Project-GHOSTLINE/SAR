-- Table pour les documents de signature électronique
CREATE TABLE IF NOT EXISTS signature_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  title TEXT NOT NULL,

  -- URLs des PDFs
  original_pdf_url TEXT,
  signed_pdf_url TEXT,

  -- Champs de signature (JSONB)
  signature_fields JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Sécurité
  sign_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'signed', 'expired', 'revoked')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,

  -- Métadonnées de signature
  signed_ip TEXT,
  signed_user_agent TEXT
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_signature_documents_document_id ON signature_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_documents_sign_token ON signature_documents(sign_token);
CREATE INDEX IF NOT EXISTS idx_signature_documents_status ON signature_documents(status);
CREATE INDEX IF NOT EXISTS idx_signature_documents_created_at ON signature_documents(created_at DESC);

-- Table d'audit pour la traçabilité
CREATE TABLE IF NOT EXISTS signature_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_signature_audit_logs_document_id ON signature_audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_logs_timestamp ON signature_audit_logs(timestamp DESC);

-- RLS (Row Level Security)
ALTER TABLE signature_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access on signature_documents" ON signature_documents;
DROP POLICY IF EXISTS "Service role full access on signature_audit_logs" ON signature_audit_logs;
DROP POLICY IF EXISTS "Public can view signature documents with valid token" ON signature_documents;

-- Policy: Service role a accès complet
CREATE POLICY "Service role full access on signature_documents"
  ON signature_documents
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on signature_audit_logs"
  ON signature_audit_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Public peut lire les documents avec token valide
CREATE POLICY "Public can view signature documents with valid token"
  ON signature_documents
  FOR SELECT
  TO public
  USING (
    status IN ('pending', 'viewed')
    AND token_expires_at > NOW()
  );

-- Commentaires
COMMENT ON TABLE signature_documents IS 'Documents de signature électronique pour les contrats clients';
COMMENT ON COLUMN signature_documents.signature_fields IS 'Champs de signature au format JSON: [{id, type, label, page, x, y, width, height, value?}]';
COMMENT ON TABLE signature_audit_logs IS 'Logs d''audit pour la traçabilité des actions sur les documents';
