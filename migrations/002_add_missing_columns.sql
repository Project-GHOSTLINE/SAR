-- Migration 002: Ajouter colonnes manquantes pour identifiants
-- Date: 2026-01-22
-- Objectif: Ajouter identifiant_unique_1 et identifiant_unique_2

-- Ajouter les nouvelles colonnes
ALTER TABLE clients_sar
ADD COLUMN IF NOT EXISTS identifiant_unique_1 TEXT,
ADD COLUMN IF NOT EXISTS identifiant_unique_2 TEXT;

-- Créer des index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_clients_sar_identifiant_unique_1
  ON clients_sar(identifiant_unique_1)
  WHERE identifiant_unique_1 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_sar_identifiant_unique_2
  ON clients_sar(identifiant_unique_2)
  WHERE identifiant_unique_2 IS NOT NULL;

-- Vérification
SELECT
  'Migration 002 terminée' as status,
  COUNT(*) as total_clients
FROM clients_sar;
