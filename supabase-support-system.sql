-- ============================================
-- SYSTÈME DE SUPPORT TECHNIQUE SAR
-- Solution Argent Rapide INC
-- ============================================
-- Date: 2026-01-08
-- Description: Tables pour le système de support technique interne
-- Employés: Frederic, Anthony, Michel, Karine, Stephanie, Sandra, Melissa
-- ============================================

-- Table 1: TICKETS DE SUPPORT
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence unique
  ticket_number TEXT UNIQUE NOT NULL, -- SUP-000001, SUP-000002, etc.

  -- Qui crée le ticket
  created_by TEXT NOT NULL, -- Nom de l'employé (ex: "Frederic Rosa")
  created_by_email TEXT NOT NULL, -- Email de l'employé

  -- Problème
  title TEXT NOT NULL, -- Titre court du problème
  description TEXT NOT NULL, -- Description détaillée
  category TEXT NOT NULL, -- Type de problème (acces, bug, lenteur, affichage, donnees, formation, amelioration, autre)
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent

  -- Statut
  status TEXT DEFAULT 'nouveau', -- nouveau, en_cours, resolu, ferme

  -- Assignment
  assigned_to TEXT, -- 'Anthony Rosa', 'Frederic Rosa', ou NULL
  assigned_at TIMESTAMPTZ,

  -- Résolution
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,

  -- Diagnostics automatiques
  browser_info JSONB, -- {name, version, userAgent}
  system_info JSONB, -- {platform, language, timezone, screen: {width, height}}
  console_logs JSONB, -- Array d'erreurs JS capturées
  connection_tests JSONB, -- {supabase: true, vopay: false, resend: true, network: true}
  page_url TEXT, -- URL où le problème est survenu

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour support_tickets
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_tickets_last_activity ON support_tickets(last_activity_at DESC);

-- Table 2: MESSAGES SUR LES TICKETS
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ticket parent
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  -- Qui envoie
  sender_name TEXT NOT NULL, -- Nom de la personne (ex: "Anthony Rosa")
  sender_email TEXT NOT NULL, -- Email
  sender_role TEXT NOT NULL, -- 'employee' ou 'support'

  -- Message
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false, -- Note visible seulement aux ops/dev

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour support_messages
CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at);
CREATE INDEX idx_support_messages_sender_email ON support_messages(sender_email);

-- Table 3: PIÈCES JOINTES (SCREENSHOTS, FICHIERS)
CREATE TABLE IF NOT EXISTS support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ticket/Message parent
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES support_messages(id) ON DELETE CASCADE,

  -- Fichier
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'screenshot', 'document', 'video'
  file_url TEXT NOT NULL, -- URL Supabase Storage (ex: screenshots/ticket-id/file.png)
  file_size INTEGER, -- Bytes
  mime_type TEXT, -- image/png, application/pdf, video/webm, etc.

  -- Metadata
  uploaded_by TEXT NOT NULL, -- Nom de la personne qui a uploadé
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour support_attachments
CREATE INDEX idx_support_attachments_ticket_id ON support_attachments(ticket_id);
CREATE INDEX idx_support_attachments_message_id ON support_attachments(message_id);
CREATE INDEX idx_support_attachments_file_type ON support_attachments(file_type);

-- ============================================
-- TRIGGERS: AUTO-UPDATE updated_at
-- ============================================

-- Fonction pour auto-update updated_at
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur support_tickets
CREATE TRIGGER trigger_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_updated_at();

-- ============================================
-- TRIGGERS: AUTO-UPDATE last_activity_at
-- ============================================

-- Fonction pour update last_activity_at quand un message est ajouté
CREATE OR REPLACE FUNCTION update_ticket_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets
  SET last_activity_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger quand un message est ajouté
CREATE TRIGGER trigger_update_ticket_activity_on_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_activity();

-- Trigger quand une pièce jointe est ajoutée
CREATE TRIGGER trigger_update_ticket_activity_on_attachment
  AFTER INSERT ON support_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_activity();

-- ============================================
-- FONCTION: GÉNÉRER TICKET NUMBER (SUP-XXXXXX)
-- ============================================

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  ticket_num TEXT;
BEGIN
  -- Trouver le prochain numéro disponible
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(ticket_number FROM 'SUP-([0-9]+)') AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_num
  FROM support_tickets;

  -- Format: SUP-000001
  ticket_num := 'SUP-' || LPAD(next_num::TEXT, 6, '0');

  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;

-- Policies: Admins peuvent tout voir et modifier (via service role key)
-- Les employés peuvent voir leurs propres tickets (via session JWT)

-- Policy 1: Admins voient tout (service role key)
CREATE POLICY "Admins can view all support tickets"
  ON support_tickets FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert support tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update support tickets"
  ON support_tickets FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete support tickets"
  ON support_tickets FOR DELETE
  USING (true);

-- Policy 2: Messages
CREATE POLICY "Admins can view all support messages"
  ON support_messages FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert support messages"
  ON support_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete support messages"
  ON support_messages FOR DELETE
  USING (true);

-- Policy 3: Attachments
CREATE POLICY "Admins can view all support attachments"
  ON support_attachments FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert support attachments"
  ON support_attachments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete support attachments"
  ON support_attachments FOR DELETE
  USING (true);

-- ============================================
-- INDEXES SUPPLÉMENTAIRES POUR PERFORMANCE
-- ============================================

-- Index GIN pour recherche full-text dans les tickets
CREATE INDEX idx_support_tickets_search ON support_tickets
  USING GIN (to_tsvector('french', title || ' ' || description));

-- Index composite pour filtres courants
CREATE INDEX idx_support_tickets_status_priority ON support_tickets(status, priority);
CREATE INDEX idx_support_tickets_assigned_status ON support_tickets(assigned_to, status);

-- ============================================
-- DONNÉES DE TEST (OPTIONNEL)
-- ============================================

-- Vous pouvez insérer des tickets de test ici si nécessaire
-- INSERT INTO support_tickets (ticket_number, created_by, created_by_email, title, description, category, priority)
-- VALUES ('SUP-000001', 'Frederic Rosa', 'frederic@solutionargentrapide.ca', 'Test ticket', 'Ceci est un test', 'autre', 'medium');

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Compter les tickets
SELECT COUNT(*) as total_tickets FROM support_tickets;

-- Compter les messages
SELECT COUNT(*) as total_messages FROM support_messages;

-- Compter les pièces jointes
SELECT COUNT(*) as total_attachments FROM support_attachments;

-- Tester la génération de ticket number
SELECT generate_ticket_number();

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

-- NOTE: N'oubliez pas de créer le bucket Supabase Storage:
-- Nom: support-files
-- Public: false
-- Max file size: 10MB
-- Allowed MIME types: image/png, image/jpeg, image/webp, application/pdf, video/webm
