-- =====================================================
-- MIGRATION: SSL Labs SSL/TLS Monitoring
-- Date: 2026-01-27
-- SSL Certificate Quality & Security Monitoring
-- =====================================================

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS seo_ssl_checks CASCADE;

-- Créer la table
CREATE TABLE seo_ssl_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host TEXT NOT NULL,
  date DATE NOT NULL,

  -- SSL Labs Grade
  grade TEXT, -- A+, A, A-, B, C, D, E, F, T (no trust)
  grade_trust_ignored TEXT, -- Grade without certificate trust issues

  -- Certificate Info
  cert_common_name TEXT,
  cert_issuer TEXT,
  cert_valid_from TIMESTAMPTZ,
  cert_valid_until TIMESTAMPTZ,
  cert_days_remaining INTEGER,
  cert_serial_number TEXT,

  -- Security Features
  has_scts BOOLEAN, -- Certificate Transparency (SCTs)
  supports_tls_1_3 BOOLEAN,
  supports_tls_1_2 BOOLEAN,
  supports_tls_1_1 BOOLEAN, -- Should be false (deprecated)
  supports_tls_1_0 BOOLEAN, -- Should be false (deprecated)
  supports_ssl_3 BOOLEAN, -- Should be false (insecure)
  supports_ssl_2 BOOLEAN, -- Should be false (insecure)

  -- Vulnerabilities
  vulnerable_beast BOOLEAN DEFAULT false,
  vulnerable_heartbleed BOOLEAN DEFAULT false,
  vulnerable_poodle BOOLEAN DEFAULT false,
  vulnerable_freak BOOLEAN DEFAULT false,
  vulnerable_logjam BOOLEAN DEFAULT false,
  vulnerable_drown BOOLEAN DEFAULT false,

  -- Forward Secrecy
  forward_secrecy INTEGER, -- 0=No, 1=Some, 2=Most, 4=All

  -- HSTS (HTTP Strict Transport Security)
  hsts_enabled BOOLEAN DEFAULT false,
  hsts_max_age INTEGER,
  hsts_preloaded BOOLEAN DEFAULT false,

  -- Cipher Suites
  weak_ciphers_count INTEGER DEFAULT 0,
  strong_ciphers_count INTEGER DEFAULT 0,

  -- Overall Status
  status TEXT, -- 'READY', 'IN_PROGRESS', 'ERROR'
  status_message TEXT,

  -- Full SSL Labs data
  ssl_labs_data JSONB,

  -- Metadata
  scan_duration_seconds INTEGER,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte unique
  CONSTRAINT seo_ssl_checks_unique UNIQUE(host, date)
);

-- Index pour améliorer les performances
CREATE INDEX idx_ssl_date ON seo_ssl_checks(date DESC);
CREATE INDEX idx_ssl_host ON seo_ssl_checks(host);
CREATE INDEX idx_ssl_grade ON seo_ssl_checks(grade);
CREATE INDEX idx_ssl_cert_expiry ON seo_ssl_checks(cert_days_remaining);

-- RLS (Row Level Security)
ALTER TABLE seo_ssl_checks ENABLE ROW LEVEL SECURITY;

-- Policy: Service role accès complet
CREATE POLICY "Service role full access" ON seo_ssl_checks
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Lecture authentifiée
CREATE POLICY "Authenticated read access" ON seo_ssl_checks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Commentaires
COMMENT ON TABLE seo_ssl_checks IS 'Audits SSL/TLS quotidiens (SSL Labs)';
COMMENT ON COLUMN seo_ssl_checks.grade IS 'Grade SSL Labs: A+ (meilleur) à F (pire)';
COMMENT ON COLUMN seo_ssl_checks.cert_days_remaining IS 'Jours avant expiration du certificat';
COMMENT ON COLUMN seo_ssl_checks.supports_tls_1_3 IS 'Support TLS 1.3 (recommandé)';
COMMENT ON COLUMN seo_ssl_checks.vulnerable_heartbleed IS 'Vulnérable à Heartbleed (CVE-2014-0160)';
COMMENT ON COLUMN seo_ssl_checks.hsts_enabled IS 'HTTP Strict Transport Security activé';
