-- Migration: Security Logs Table
-- Crée une table pour logger tous les accès aux routes OSINT

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Type d'événement
  event_type TEXT NOT NULL,
  -- Exemples: 'osint_access_granted', 'osint_access_denied', 'osint_rate_limited', 'osint_error'

  -- Informations requête
  ip_address INET NOT NULL,
  request_path TEXT NOT NULL,
  user_agent TEXT,

  -- Utilisateur (si authentifié)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Métadonnées
  metadata JSONB DEFAULT '{}',
  -- Exemples: {"has_token": true, "success": false, "reason": "Invalid token"}

  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Index pour performance
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address);
CREATE INDEX idx_security_logs_user ON security_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_path ON security_logs(request_path);

-- Index composite pour analytics
CREATE INDEX idx_security_logs_type_time ON security_logs(event_type, timestamp DESC);

-- RLS Policies (lecture authentifiée seulement)
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- NOTE: Policy simplifiée car pas de table profiles dans le schéma actuel.
-- TODO: Restreindre aux admins quand système de rôles sera implémenté.
CREATE POLICY "Authenticated users can read security logs"
  ON security_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Fonction pour nettoyer vieux logs (> 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM security_logs
  WHERE timestamp < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;

-- Cron job pour nettoyer (si pg_cron est disponible)
-- SELECT cron.schedule('cleanup-security-logs', '0 2 * * *', 'SELECT cleanup_old_security_logs()');

-- View pour dashboard sécurité
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_id) as unique_users,
  DATE(timestamp) as date
FROM security_logs
WHERE timestamp > now() - interval '30 days'
GROUP BY event_type, DATE(timestamp)
ORDER BY date DESC, count DESC;

-- View pour alertes (tentatives suspectes)
CREATE OR REPLACE VIEW security_alerts AS
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(timestamp) as last_attempt,
  array_agg(DISTINCT request_path) as targeted_paths,
  array_agg(DISTINCT event_type) as event_types
FROM security_logs
WHERE event_type IN ('osint_access_denied', 'osint_rate_limited', 'osint_error')
  AND timestamp > now() - interval '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;

COMMENT ON TABLE security_logs IS 'Logs de sécurité pour toutes les tentatives d''accès aux routes OSINT';
COMMENT ON VIEW security_dashboard IS 'Dashboard des événements de sécurité des 30 derniers jours';
COMMENT ON VIEW security_alerts IS 'IPs suspectes avec plus de 5 tentatives échouées dans les dernières 24h';
