-- ============================================
-- CLEANUP: Supprimer toutes les tables TITAN
-- À exécuter si erreur "already exists"
-- ============================================

-- Drop triggers
DROP TRIGGER IF EXISTS update_loan_applications_updated_at ON loan_applications CASCADE;
DROP TRIGGER IF EXISTS update_loan_objectives_updated_at ON loan_objectives CASCADE;
DROP TRIGGER IF EXISTS update_cortex_rules_updated_at ON cortex_rules CASCADE;

-- Drop tables (ordre important à cause des foreign keys)
DROP TABLE IF EXISTS cortex_execution_logs CASCADE;
DROP TABLE IF EXISTS cortex_rules CASCADE;
DROP TABLE IF EXISTS loan_objectives CASCADE;
DROP TABLE IF EXISTS loan_applications CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_loan_reference() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Vérification
SELECT 'Cleanup terminé - prêt pour migration' as status;
