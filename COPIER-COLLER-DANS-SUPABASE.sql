-- ===================================================
-- COPIER-COLLER CE SQL DANS SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql
-- ===================================================

-- Table 1: Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  created_by_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'nouveau',
  assigned_to TEXT,
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,
  browser_info JSONB,
  system_info JSONB,
  console_logs JSONB,
  connection_tests JSONB,
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Support Messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Support Attachments
CREATE TABLE IF NOT EXISTS support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES support_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;

-- Policies (Admins peuvent tout voir/modifier)
CREATE POLICY "Admins can view all support tickets" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "Admins can insert support tickets" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update support tickets" ON support_tickets FOR UPDATE USING (true);
CREATE POLICY "Admins can delete support tickets" ON support_tickets FOR DELETE USING (true);

CREATE POLICY "Admins can view all support messages" ON support_messages FOR SELECT USING (true);
CREATE POLICY "Admins can insert support messages" ON support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete support messages" ON support_messages FOR DELETE USING (true);

CREATE POLICY "Admins can view all support attachments" ON support_attachments FOR SELECT USING (true);
CREATE POLICY "Admins can insert support attachments" ON support_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete support attachments" ON support_attachments FOR DELETE USING (true);

-- ===================================================
-- TERMINE! Clique sur "Run" ou appuie sur Ctrl+Enter
-- ===================================================
