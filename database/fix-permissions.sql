-- ============================================
-- FIX: Permissions Schema Public
-- À exécuter si erreur "permission denied"
-- ============================================

-- Activer permissions sur schema public
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO anon;

-- Activer extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Vérifier
SELECT 'Permissions OK' as status;
