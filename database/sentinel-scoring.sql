-- ============================================
-- SENTINEL SCORING SYSTEM
-- Tracking des analyses et scoring du projet
-- ============================================

-- Table pour stocker les scans
CREATE TABLE IF NOT EXISTS sentinel_scans (
  id BIGSERIAL PRIMARY KEY,
  project_name TEXT NOT NULL,
  threats_found INT NOT NULL DEFAULT 0,
  high_severity INT NOT NULL DEFAULT 0,
  medium_severity INT NOT NULL DEFAULT 0,
  low_severity INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  health_score INT NOT NULL DEFAULT 100, -- 0-100
  scan_details JSONB, -- Détails complets des menaces
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index
  CREATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_sentinel_scans_project ON sentinel_scans(project_name);
CREATE INDEX IF NOT EXISTS idx_sentinel_scans_scanned_at ON sentinel_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentinel_scans_health ON sentinel_scans(health_score DESC);

-- Activer RLS (Row Level Security)
ALTER TABLE sentinel_scans ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire
CREATE POLICY "Allow public read access"
  ON sentinel_scans FOR SELECT
  USING (true);

-- Policy: Tout le monde peut insérer
CREATE POLICY "Allow public insert access"
  ON sentinel_scans FOR INSERT
  WITH CHECK (true);

-- Vue pour les statistiques
CREATE OR REPLACE VIEW sentinel_stats AS
SELECT
  project_name,
  COUNT(*) as total_scans,
  AVG(health_score)::INT as avg_health,
  MAX(health_score) as best_score,
  MIN(health_score) as worst_score,
  AVG(duration_ms)::INT as avg_duration,
  SUM(threats_found) as total_threats,
  MAX(scanned_at) as last_scan
FROM sentinel_scans
GROUP BY project_name;

-- Fonction pour nettoyer les vieux scans (garder 100 derniers)
CREATE OR REPLACE FUNCTION cleanup_old_scans()
RETURNS void AS $$
BEGIN
  DELETE FROM sentinel_scans
  WHERE id NOT IN (
    SELECT id FROM sentinel_scans
    ORDER BY scanned_at DESC
    LIMIT 100
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE sentinel_scans IS 'Historique des scans Sentinel avec scoring';
COMMENT ON COLUMN sentinel_scans.health_score IS 'Score de santé du projet (0-100)';
COMMENT ON COLUMN sentinel_scans.scan_details IS 'JSON avec détails complets des menaces trouvées';
