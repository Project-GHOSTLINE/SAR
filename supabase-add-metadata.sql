-- ============================================
-- SCRIPT SQL: Ajouter colonnes metadata
-- Table: contact_messages
-- Date: 2025-12-19
-- ============================================

-- Ajouter colonnes pour métriques de connexion client
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
ADD COLUMN IF NOT EXISTS client_device VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_browser VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_os VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS client_screen_resolution VARCHAR(50),
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- Index pour recherches rapides par IP
CREATE INDEX IF NOT EXISTS idx_contact_messages_client_ip ON contact_messages(client_ip);

-- Commentaires sur les colonnes
COMMENT ON COLUMN contact_messages.client_ip IS 'Adresse IP du client (IPv4 ou IPv6)';
COMMENT ON COLUMN contact_messages.client_user_agent IS 'User-Agent complet du navigateur';
COMMENT ON COLUMN contact_messages.client_device IS 'Type d''appareil (Desktop, Mobile, Tablet)';
COMMENT ON COLUMN contact_messages.client_browser IS 'Navigateur détecté (Chrome, Firefox, Safari, etc.)';
COMMENT ON COLUMN contact_messages.client_os IS 'Système d''exploitation (Windows, macOS, Android, iOS, etc.)';
COMMENT ON COLUMN contact_messages.client_timezone IS 'Fuseau horaire du client';
COMMENT ON COLUMN contact_messages.client_language IS 'Langue préférée du navigateur';
COMMENT ON COLUMN contact_messages.client_screen_resolution IS 'Résolution d''écran (ex: 1920x1080)';
COMMENT ON COLUMN contact_messages.referrer IS 'URL de provenance';
COMMENT ON COLUMN contact_messages.utm_source IS 'Source UTM pour tracking campagnes';
COMMENT ON COLUMN contact_messages.utm_medium IS 'Medium UTM pour tracking campagnes';
COMMENT ON COLUMN contact_messages.utm_campaign IS 'Campagne UTM pour tracking';

-- Afficher les colonnes ajoutées
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'contact_messages'
AND column_name LIKE 'client_%' OR column_name LIKE 'utm_%' OR column_name = 'referrer'
ORDER BY ordinal_position;
