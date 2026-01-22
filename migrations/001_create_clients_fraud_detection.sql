-- ============================================
-- Table: clients_sar
-- Description: Stockage des données clients Margill pour détection de fraude
-- Créé le: 2026-01-22
-- ============================================

-- Créer la table clients avec tous les champs nécessaires
CREATE TABLE IF NOT EXISTS clients_sar (
  -- Identifiants uniques
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  margill_id TEXT UNIQUE NOT NULL, -- Identifiant du client dans Margill
  dossier_id TEXT, -- ID du dossier Margill (GPM)

  -- Informations personnelles
  prenom TEXT,
  nom TEXT,
  nom_complet TEXT,
  date_naissance DATE,
  nas TEXT, -- Numéro d'assurance sociale (chiffré)
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

  -- Informations d'emploi
  employeur TEXT,
  telephone_employeur TEXT,
  date_embauche DATE,
  occupation TEXT,
  personne_contact_employeur TEXT,

  -- Contacts d'urgence
  contact1_nom TEXT,
  contact1_telephone TEXT,
  contact1_relation TEXT,
  contact2_nom TEXT,
  contact2_telephone TEXT,
  contact2_relation TEXT,

  -- Informations bancaires
  banque_institution TEXT,
  banque_transit TEXT,
  banque_compte TEXT,

  -- Informations du prêt
  capital_origine DECIMAL(10,2),
  montant_paiement DECIMAL(10,2),
  frequence_paiement TEXT,
  etat_dossier TEXT,
  responsable_dossier TEXT,
  date_creation_dossier TIMESTAMP,
  date_maj_dossier TIMESTAMP,

  -- Historique de paiements
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

  -- INDICATEURS DE FRAUDE
  -- Score de risque (0-100, calculé automatiquement)
  score_fraude INTEGER DEFAULT 0,

  -- Flags de fraude (booléens pour recherche rapide)
  flag_pas_ibv BOOLEAN DEFAULT FALSE, -- Pas de lien IBV = SUSPECT
  flag_documents_email BOOLEAN DEFAULT FALSE, -- Documents bancaires par email = SUSPECT
  flag_paiement_rate_precoce BOOLEAN DEFAULT FALSE, -- Paiement raté dans les 3 premiers mois
  flag_mauvaise_creance BOOLEAN DEFAULT FALSE, -- Marqué comme mauvaise créance
  flag_contact_invalide BOOLEAN DEFAULT FALSE, -- Numéro de contact invalide/déconnecté
  flag_adresse_suspecte BOOLEAN DEFAULT FALSE, -- Adresse non vérifiable
  flag_multiple_demandes BOOLEAN DEFAULT FALSE, -- Plusieurs demandes avec mêmes infos
  flag_liste_noire BOOLEAN DEFAULT FALSE, -- Sur liste noire

  -- Métadonnées de vérification
  lien_ibv TEXT, -- URL du lien IBV s'il existe
  verification_ibv_completee BOOLEAN DEFAULT FALSE,
  verification_ibv_date TIMESTAMP,
  notes_fraude TEXT, -- Notes manuelles sur les indices de fraude

  -- Métadonnées système
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Données brutes JSON (pour conserver toutes les infos du CSV)
  raw_data JSONB
);

-- Index pour performance de recherche
CREATE INDEX idx_clients_sar_margill_id ON clients_sar(margill_id);
CREATE INDEX idx_clients_sar_email ON clients_sar(email);
CREATE INDEX idx_clients_sar_telephone ON clients_sar(telephone);
CREATE INDEX idx_clients_sar_nas ON clients_sar(nas);
CREATE INDEX idx_clients_sar_nom_complet ON clients_sar USING gin(nom_complet gin_trgm_ops);
CREATE INDEX idx_clients_sar_etat_dossier ON clients_sar(etat_dossier);
CREATE INDEX idx_clients_sar_score_fraude ON clients_sar(score_fraude DESC);

-- Index composites pour recherches fréquentes
CREATE INDEX idx_clients_sar_fraude_flags ON clients_sar(
  flag_pas_ibv,
  flag_paiement_rate_precoce,
  flag_mauvaise_creance
) WHERE score_fraude > 50;

-- Index pour recherche géographique
CREATE INDEX idx_clients_sar_location ON clients_sar(province, ville);

-- Index pour recherche par banque
CREATE INDEX idx_clients_sar_banque ON clients_sar(banque_institution, banque_transit);

-- Extension pour recherche floue de texte (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fonction pour calculer le score de fraude automatiquement
CREATE OR REPLACE FUNCTION calculate_fraud_score(client_row clients_sar)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Pas d'IBV = +40 points
  IF client_row.flag_pas_ibv THEN
    score := score + 40;
  END IF;

  -- Documents par email = +30 points
  IF client_row.flag_documents_email THEN
    score := score + 30;
  END IF;

  -- Paiement raté précoce = +25 points
  IF client_row.flag_paiement_rate_precoce THEN
    score := score + 25;
  END IF;

  -- Mauvaise créance = +20 points
  IF client_row.flag_mauvaise_creance THEN
    score := score + 20;
  END IF;

  -- Contact invalide = +15 points
  IF client_row.flag_contact_invalide THEN
    score := score + 15;
  END IF;

  -- Adresse suspecte = +10 points
  IF client_row.flag_adresse_suspecte THEN
    score := score + 10;
  END IF;

  -- Multiples demandes = +30 points
  IF client_row.flag_multiple_demandes THEN
    score := score + 30;
  END IF;

  -- Liste noire = +100 points (score maximum)
  IF client_row.flag_liste_noire THEN
    score := 100;
  END IF;

  -- Ratio de paiements non payés
  IF client_row.nombre_paiements_faits > 0 THEN
    DECLARE
      ratio_impaye NUMERIC;
    BEGIN
      ratio_impaye := client_row.nombre_paiements_non_payes::NUMERIC /
                     (client_row.nombre_paiements_faits + client_row.nombre_paiements_non_payes)::NUMERIC;

      IF ratio_impaye > 0.5 THEN
        score := score + 20;
      ELSIF ratio_impaye > 0.3 THEN
        score := score + 10;
      END IF;
    END;
  END IF;

  -- Plafonner à 100
  IF score > 100 THEN
    score := 100;
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le score de fraude automatiquement
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

-- Vue pour les clients à haut risque
CREATE OR REPLACE VIEW clients_sar_high_risk AS
SELECT
  *,
  CASE
    WHEN score_fraude >= 80 THEN 'CRITIQUE'
    WHEN score_fraude >= 60 THEN 'ÉLEVÉ'
    WHEN score_fraude >= 40 THEN 'MOYEN'
    ELSE 'FAIBLE'
  END as niveau_risque
FROM clients_sar
WHERE score_fraude >= 40
ORDER BY score_fraude DESC, date_creation_dossier DESC;

-- Vue pour détecter les patterns de fraude communs
CREATE OR REPLACE VIEW clients_sar_fraud_patterns AS
SELECT
  -- Pattern de même banque + même téléphone
  ARRAY_AGG(DISTINCT id) as client_ids,
  COUNT(*) as nombre_clients,
  banque_institution,
  banque_transit,
  banque_compte,
  telephone,
  'Même compte bancaire et téléphone' as pattern_type
FROM clients_sar
GROUP BY banque_institution, banque_transit, banque_compte, telephone
HAVING COUNT(*) > 1

UNION ALL

SELECT
  -- Pattern de même NAS
  ARRAY_AGG(DISTINCT id),
  COUNT(*),
  NULL as banque_institution,
  NULL as banque_transit,
  NULL as banque_compte,
  nas as telephone,
  'Même NAS pour plusieurs clients' as pattern_type
FROM clients_sar
WHERE nas IS NOT NULL
GROUP BY nas
HAVING COUNT(*) > 1

UNION ALL

SELECT
  -- Pattern de même email
  ARRAY_AGG(DISTINCT id),
  COUNT(*),
  NULL,
  NULL,
  NULL,
  email as telephone,
  'Même email pour plusieurs clients' as pattern_type
FROM clients_sar
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Politique RLS (Row Level Security) - Admin seulement
ALTER TABLE clients_sar ENABLE ROW LEVEL SECURITY;

-- Policy: Admins peuvent tout voir et modifier
CREATE POLICY "Admin access to clients_sar" ON clients_sar
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Fonction de recherche rapide avec scoring de pertinence
CREATE OR REPLACE FUNCTION search_clients_sar(
  search_query TEXT,
  limit_results INTEGER DEFAULT 50,
  min_fraud_score INTEGER DEFAULT 0
)
RETURNS TABLE (
  client clients_sar,
  relevance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.*,
    (
      -- Score de pertinence basé sur similarité
      SIMILARITY(COALESCE(c.nom_complet, ''), search_query) * 3 +
      SIMILARITY(COALESCE(c.email, ''), search_query) * 2 +
      SIMILARITY(COALESCE(c.telephone, ''), search_query) * 2 +
      SIMILARITY(COALESCE(c.margill_id, ''), search_query) * 1
    ) as relevance_score
  FROM clients_sar c
  WHERE
    c.score_fraude >= min_fraud_score
    AND (
      c.nom_complet ILIKE '%' || search_query || '%'
      OR c.email ILIKE '%' || search_query || '%'
      OR c.telephone ILIKE '%' || search_query || '%'
      OR c.margill_id ILIKE '%' || search_query || '%'
      OR c.nas ILIKE '%' || search_query || '%'
    )
  ORDER BY relevance_score DESC, c.score_fraude DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE clients_sar IS 'Base de données clients Margill avec système de détection de fraude automatique';
COMMENT ON COLUMN clients_sar.score_fraude IS 'Score de fraude calculé automatiquement (0-100). 0=Sûr, 100=Frauduleux certain';
COMMENT ON COLUMN clients_sar.flag_pas_ibv IS 'TRUE si le client n''a pas complété la vérification IBV (Interac Bank Verification)';
COMMENT ON COLUMN clients_sar.flag_documents_email IS 'TRUE si le client a envoyé des documents bancaires par email au lieu d''utiliser IBV';
COMMENT ON FUNCTION calculate_fraud_score IS 'Calcule le score de fraude basé sur les flags et l''historique de paiements';
COMMENT ON VIEW clients_sar_high_risk IS 'Vue des clients avec score de fraude >= 40';
COMMENT ON VIEW clients_sar_fraud_patterns IS 'Détecte les patterns suspects (mêmes infos partagées entre clients)';
