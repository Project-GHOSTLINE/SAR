-- PHASE 3: Add Performance Indexes
-- Date: 2026-01-22T23:51:15.058Z
-- Execute this script in Supabase SQL Editor

-- foreign_key: idx_loan_applications_client_id
CREATE INDEX IF NOT EXISTS idx_loan_applications_client_id ON loan_applications(client_id);

-- foreign_key: idx_contact_messages_client_id
CREATE INDEX IF NOT EXISTS idx_contact_messages_client_id ON contact_messages(client_id);

-- foreign_key: idx_vopay_objects_client_id
CREATE INDEX IF NOT EXISTS idx_vopay_objects_client_id ON vopay_objects(client_id);

-- foreign_key: idx_vopay_objects_loan_id
CREATE INDEX IF NOT EXISTS idx_vopay_objects_loan_id ON vopay_objects(loan_id);

-- status: idx_loan_applications_status
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);

-- status: idx_contact_messages_status
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

-- status: idx_vopay_objects_status
CREATE INDEX IF NOT EXISTS idx_vopay_objects_status ON vopay_objects(status);

-- lookup: idx_clients_primary_email
CREATE INDEX IF NOT EXISTS idx_clients_primary_email ON clients(primary_email);

-- lookup: idx_clients_primary_phone
CREATE INDEX IF NOT EXISTS idx_clients_primary_phone ON clients(primary_phone);

-- composite: idx_loan_applications_status_created
CREATE INDEX IF NOT EXISTS idx_loan_applications_status_created ON loan_applications(status, created_at DESC);

-- composite: idx_contact_messages_status_created
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON contact_messages(status, created_at DESC);

-- composite: idx_vopay_objects_type_status
CREATE INDEX IF NOT EXISTS idx_vopay_objects_type_status ON vopay_objects(object_type, status);

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
