-- ============================================================================
-- SYSTÈME DE TRACKING DES TÉLÉCHARGEMENTS
-- ============================================================================
-- Table pour tracker tous les téléchargements de fichiers
-- ============================================================================

BEGIN;

-- 1. Table des téléchargements
CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations sur le fichier
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'extension', 'document', 'tool', etc.
  file_version TEXT,

  -- Informations utilisateur
  user_email TEXT,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,

  -- Informations device
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,

  -- Métadonnées
  downloaded_at TIMESTAMP DEFAULT NOW(),
  download_success BOOLEAN DEFAULT true,
  referrer TEXT,

  -- Index pour recherches rapides
  CONSTRAINT download_logs_file_name_check CHECK (char_length(file_name) > 0)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_download_logs_file_name ON download_logs(file_name);
CREATE INDEX IF NOT EXISTS idx_download_logs_downloaded_at ON download_logs(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_logs_user_email ON download_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_download_logs_file_type ON download_logs(file_type);

-- 2. Vue des statistiques par fichier
CREATE OR REPLACE VIEW download_stats AS
SELECT
  file_name,
  file_type,
  file_version,
  COUNT(*) as total_downloads,
  COUNT(DISTINCT user_email) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(downloaded_at) as last_download,
  MIN(downloaded_at) as first_download,
  COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as downloads_24h,
  COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_7d,
  COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_30d
FROM download_logs
WHERE download_success = true
GROUP BY file_name, file_type, file_version
ORDER BY total_downloads DESC;

-- 3. Vue des téléchargements récents
CREATE OR REPLACE VIEW recent_downloads AS
SELECT
  id,
  file_name,
  file_type,
  user_email,
  device_type,
  browser,
  downloaded_at
FROM download_logs
ORDER BY downloaded_at DESC
LIMIT 100;

-- 4. Fonction pour obtenir les stats d'un fichier spécifique
CREATE OR REPLACE FUNCTION get_download_stats(p_file_name TEXT)
RETURNS TABLE (
  total_downloads BIGINT,
  unique_users BIGINT,
  unique_ips BIGINT,
  downloads_today BIGINT,
  downloads_this_week BIGINT,
  downloads_this_month BIGINT,
  last_download TIMESTAMP,
  first_download TIMESTAMP,
  avg_downloads_per_day NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_downloads,
    COUNT(DISTINCT user_email)::BIGINT as unique_users,
    COUNT(DISTINCT ip_address)::BIGINT as unique_ips,
    COUNT(CASE WHEN downloaded_at >= CURRENT_DATE THEN 1 END)::BIGINT as downloads_today,
    COUNT(CASE WHEN downloaded_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::BIGINT as downloads_this_week,
    COUNT(CASE WHEN downloaded_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::BIGINT as downloads_this_month,
    MAX(downloaded_at) as last_download,
    MIN(downloaded_at) as first_download,
    CASE
      WHEN MIN(downloaded_at) IS NOT NULL THEN
        COUNT(*)::NUMERIC / GREATEST(1, EXTRACT(DAY FROM NOW() - MIN(downloaded_at)))
      ELSE 0
    END as avg_downloads_per_day
  FROM download_logs
  WHERE file_name = p_file_name
    AND download_success = true;
END;
$$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT 'download_logs table created successfully' as status;
SELECT * FROM download_stats LIMIT 5;
