-- ============================================
-- Performance Optimization - Critical Indexes
-- Date: 2026-01-18
-- Audit: SAR-PERF-AUDIT.md
-- Impact: -50 to -200ms per query on critical tables
-- ============================================

-- NOTE: Using CONCURRENTLY to avoid locking tables during index creation
-- This is safe for production but takes longer to complete

-- ============================================
-- contact_messages (used by /api/admin/messages)
-- Current: NO indexes -> Full table scan on 100+ rows
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_messages_lu
  ON contact_messages(lu)
  WHERE lu = false;  -- Partial index for unread messages

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_messages_status
  ON contact_messages(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_messages_email
  ON contact_messages(email);

-- Composite index for main query (status + created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_messages_status_created
  ON contact_messages(status, created_at DESC);

-- ============================================
-- loan_applications (used by dashboard, webhooks, form submit)
-- Current: Only UNIQUE index on reference
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_status
  ON loan_applications(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_created_at
  ON loan_applications(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_courriel
  ON loan_applications(courriel);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_telephone
  ON loan_applications(telephone);

-- Composite index for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_status_created
  ON loan_applications(status, created_at DESC);

-- Full-text search index (French)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_search
  ON loan_applications
  USING gin(to_tsvector('french',
    coalesce(prenom,'') || ' ' ||
    coalesce(nom,'') || ' ' ||
    coalesce(courriel,'')
  ));

-- ============================================
-- vopay_objects (used by webhooks, stats, client timeline)
-- Current: NO indexes -> Slow joins and lookups
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_objects_client_id
  ON vopay_objects(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_objects_loan_id
  ON vopay_objects(loan_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_objects_vopay_id
  ON vopay_objects(vopay_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_objects_status
  ON vopay_objects(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_objects_occurred_at
  ON vopay_objects(occurred_at DESC);

-- Composite index for client timeline queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_objects_client_occurred
  ON vopay_objects(client_id, occurred_at DESC);

-- ============================================
-- client_analyses (used by Chrome extension - Inverite/Flinks)
-- Current: NO indexes -> Slow GUID lookups
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_analyses_guid
  ON client_analyses(inverite_guid)
  WHERE inverite_guid IS NOT NULL;  -- Partial index

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_analyses_email
  ON client_analyses(client_email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_analyses_status_created
  ON client_analyses(analysis_status, created_at DESC);

-- JSONB index for phone array search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_analyses_phones
  ON client_analyses USING gin(client_phones);

-- ============================================
-- Relations (Fix N+1 queries)
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emails_envoyes_message_id
  ON emails_envoyes(message_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_internes_message_id
  ON notes_internes(message_id, created_at);

-- ============================================
-- vopay_webhook_logs (used by webhooks stats)
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_webhook_logs_transaction_id
  ON vopay_webhook_logs(transaction_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_webhook_logs_status
  ON vopay_webhook_logs(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vopay_webhook_logs_received_at
  ON vopay_webhook_logs(received_at DESC);

-- ============================================
-- support_tickets (used by support dashboard)
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_priority
  ON support_tickets(priority);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_created_at
  ON support_tickets(created_at DESC);

-- ============================================
-- Analyze tables to update statistics
-- ============================================
ANALYZE contact_messages;
ANALYZE loan_applications;
ANALYZE vopay_objects;
ANALYZE client_analyses;
ANALYZE emails_envoyes;
ANALYZE notes_internes;
ANALYZE vopay_webhook_logs;
ANALYZE support_tickets;

-- Success message
SELECT '✅ Performance indexes created successfully' as status;
SELECT 'ℹ️  Impact: -50 to -200ms per query on indexed tables' as info;
SELECT 'ℹ️  Next: Apply migration 20260118000001_rpc_functions.sql' as next_step;
