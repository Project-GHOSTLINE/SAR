-- ============================================
-- Migration: Add Email Tracking to signature_documents
-- Date: 2026-01-28
-- Description: Track email delivery status and timestamp
-- ============================================

-- Add email tracking columns
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending'
  CHECK (email_status IN ('pending', 'sent', 'failed', 'not_sent')),
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Add index for email status queries
CREATE INDEX IF NOT EXISTS idx_signature_documents_email_status
  ON signature_documents(email_status)
  WHERE email_status != 'sent';

-- Add comment
COMMENT ON COLUMN signature_documents.email_status IS 'Email delivery status: pending, sent, failed, not_sent';
COMMENT ON COLUMN signature_documents.email_sent_at IS 'Timestamp when email was successfully sent';
COMMENT ON COLUMN signature_documents.email_error IS 'Error message if email failed to send';
