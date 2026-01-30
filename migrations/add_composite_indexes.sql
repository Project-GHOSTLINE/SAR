-- ============================================
-- Migration: Add Composite Indexes for Performance
-- Date: 2026-01-29
-- Description: Add composite indexes for frequently queried column combinations
-- ============================================

-- Composite index for (document_id, status)
-- Used in queries that filter by both document_id and status
CREATE INDEX IF NOT EXISTS idx_signature_documents_document_id_status
  ON signature_documents(document_id, status);

-- Composite index for (status, created_at)
-- Used for filtering by status and sorting by creation date
CREATE INDEX IF NOT EXISTS idx_signature_documents_status_created_at
  ON signature_documents(status, created_at DESC);

-- Composite index for (client_email, status)
-- Used for client lookups filtered by status
CREATE INDEX IF NOT EXISTS idx_signature_documents_client_email_status
  ON signature_documents(client_email, status);

-- Composite index for (token_expires_at, status)
-- Used for finding expired documents
CREATE INDEX IF NOT EXISTS idx_signature_documents_expires_status
  ON signature_documents(token_expires_at, status)
  WHERE status IN ('pending', 'viewed');

-- Composite index for audit logs (document_id, timestamp)
-- Used for retrieving audit trail for a specific document
CREATE INDEX IF NOT EXISTS idx_signature_audit_logs_document_timestamp
  ON signature_audit_logs(document_id, timestamp DESC);

-- Add comments
COMMENT ON INDEX idx_signature_documents_document_id_status IS 'Composite index for document ID and status queries';
COMMENT ON INDEX idx_signature_documents_status_created_at IS 'Composite index for status filtering with date sorting';
COMMENT ON INDEX idx_signature_documents_client_email_status IS 'Composite index for client email lookups by status';
COMMENT ON INDEX idx_signature_documents_expires_status IS 'Partial composite index for finding expired pending/viewed documents';
COMMENT ON INDEX idx_signature_audit_logs_document_timestamp IS 'Composite index for audit trail queries';

-- Analyze tables to update statistics
ANALYZE signature_documents;
ANALYZE signature_audit_logs;
