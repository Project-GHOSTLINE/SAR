-- ============================================
-- SCRIPT SIMPLIFIÉ - Création Table clients_sar
-- À EXÉCUTER DANS: Supabase SQL Editor
-- ============================================

-- Étape 1: Créer la table principale
CREATE TABLE IF NOT EXISTS clients_sar (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  margill_id TEXT UNIQUE NOT NULL,
  dossier_id TEXT,

  -- Infos personnelles
  prenom TEXT,
  nom TEXT,
  nom_complet TEXT,
  date_naissance DATE,
  nas TEXT,
  email TEXT,
  telephone TEXT,
  telephone_mobile TEXT,

  -- Adresse
  adresse_ligne1 TEXT,
  adresse_ligne2 TEXT,
  ville TEXT,
  province TEXT,
  code_postal TEXT,
  pays TEXT DEFAULT 'CA',

  -- Emploi
  employeur TEXT,
  telephone_employeur TEXT,
  date_embauche DATE,
  occupation TEXT,
  personne_contact_employeur TEXT,

  -- Contacts
  contact1_nom TEXT,
  contact1_telephone TEXT,
  contact1_relation TEXT,
  contact2_nom TEXT,
  contact2_telephone TEXT,
  contact2_relation TEXT,

  -- Banque
  banque_institution TEXT,
  banque_transit TEXT,
  banque_compte TEXT,

  -- Prêt
  capital_origine DECIMAL(10,2),
  montant_paiement DECIMAL(10,2),
  frequence_paiement TEXT,
  etat_dossier TEXT,
  responsable_dossier TEXT,
  date_creation_dossier TIMESTAMP,
  date_maj_dossier TIMESTAMP,

  -- Paiements
  total_paiements_positifs DECIMAL(10,2) DEFAULT 0,
  total_paiements_negatifs DECIMAL(10,2) DEFAULT 0,
  nombre_paiements_faits INTEGER DEFAULT 0,
  nombre_paiements_non_payes INTEGER DEFAULT 0,
  nombre_mauvaises_creances INTEGER DEFAULT 0,
  solde_actuel DECIMAL(10,2) DEFAULT 0,
  solde_capital_recevoir DECIMAL(10,2) DEFAULT 0,

  -- Dates importantes
  date_premier_paiement DATE,
  date_dernier_paiement DATE,
  montant_dernier_paiement DECIMAL(10,2),
  etat_dernier_paiement TEXT,

  -- INDICATEURS DE FRAUDE (booléens)
  flag_pas_ibv BOOLEAN DEFAULT FALSE,
  flag_documents_email BOOLEAN DEFAULT FALSE,
  flag_paiement_rate_precoce BOOLEAN DEFAULT FALSE,
  flag_mauvaise_creance BOOLEAN DEFAULT FALSE,
  flag_contact_invalide BOOLEAN DEFAULT FALSE,
  flag_adresse_suspecte BOOLEAN DEFAULT FALSE,
  flag_multiple_demandes BOOLEAN DEFAULT FALSE,
  flag_liste_noire BOOLEAN DEFAULT FALSE,

  -- Score de fraude (calculé automatiquement)
  score_fraude INTEGER DEFAULT 0,

  -- Vérification IBV
  lien_ibv TEXT,
  verification_ibv_completee BOOLEAN DEFAULT FALSE,
  verification_ibv_date TIMESTAMP,
  notes_fraude TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  raw_data JSONB
);

-- Étape 2: Créer les index pour performance
CREATE INDEX IF NOT EXISTS idx_clients_sar_margill_id ON clients_sar(margill_id);
CREATE INDEX IF NOT EXISTS idx_clients_sar_email ON clients_sar(email);
CREATE INDEX IF NOT EXISTS idx_clients_sar_telephone ON clients_sar(telephone);
CREATE INDEX IF NOT EXISTS idx_clients_sar_etat_dossier ON clients_sar(etat_dossier);
CREATE INDEX IF NOT EXISTS idx_clients_sar_score_fraude ON clients_sar(score_fraude DESC);

-- Étape 3: Fonction de calcul du score
CREATE OR REPLACE FUNCTION calculate_fraud_score(client_row clients_sar)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Calcul basé sur les flags
  IF client_row.flag_pas_ibv THEN score := score + 40; END IF;
  IF client_row.flag_documents_email THEN score := score + 30; END IF;
  IF client_row.flag_paiement_rate_precoce THEN score := score + 25; END IF;
  IF client_row.flag_mauvaise_creance THEN score := score + 20; END IF;
  IF client_row.flag_contact_invalide THEN score := score + 15; END IF;
  IF client_row.flag_adresse_suspecte THEN score := score + 10; END IF;
  IF client_row.flag_multiple_demandes THEN score := score + 30; END IF;
  IF client_row.flag_liste_noire THEN score := 100; END IF;

  -- Ratio paiements
  IF client_row.nombre_paiements_faits > 0 THEN
    DECLARE
      ratio_impaye NUMERIC;
    BEGIN
      ratio_impaye := client_row.nombre_paiements_non_payes::NUMERIC /
                     (client_row.nombre_paiements_faits + client_row.nombre_paiements_non_payes)::NUMERIC;
      IF ratio_impaye > 0.5 THEN score := score + 20;
      ELSIF ratio_impaye > 0.3 THEN score := score + 10;
      END IF;
    END;
  END IF;

  -- Plafonner à 100
  IF score > 100 THEN score := 100; END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Étape 4: Trigger pour calcul automatique
CREATE OR REPLACE FUNCTION update_fraud_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.score_fraude := calculate_fraud_score(NEW);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fraud_score
  BEFORE INSERT OR UPDATE ON clients_sar
  FOR EACH ROW
  EXECUTE FUNCTION update_fraud_score();

-- Étape 5: Activer RLS (sécurité)
ALTER TABLE clients_sar ENABLE ROW LEVEL SECURITY;

-- Policy admin
CREATE POLICY "Admin access to clients_sar" ON clients_sar
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Étape 6: Vérification
SELECT 'Table créée avec succès!' as status;
SELECT COUNT(*) as nombre_clients FROM clients_sar;

-- FIN DU SCRIPT
-- Copiez tout ce fichier dans Supabase SQL Editor et cliquez "Run"
