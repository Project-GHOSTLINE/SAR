-- ============================================
-- Update RPC Function for Unified Webhook System
-- Date: 2026-01-23
-- Purpose: Update process_vopay_webhook to use new webhook_logs table
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS process_vopay_webhook(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB);

-- Create updated function using unified webhook_logs table
CREATE OR REPLACE FUNCTION process_vopay_webhook(
  p_transaction_id TEXT,
  p_transaction_type TEXT,
  p_amount NUMERIC,
  p_status TEXT,
  p_failure_reason TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT 'Production',
  p_validation_key TEXT DEFAULT NULL,
  p_updated_at TIMESTAMPTZ DEFAULT now(),
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  webhook_log_id UUID,
  vopay_object_id UUID,
  client_id UUID,
  loan_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_log_id UUID;
  v_object_id UUID;
  v_client_id UUID;
  v_loan_id UUID;
  v_email TEXT;
  v_start_time TIMESTAMPTZ;
  v_processing_time_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();

  -- Extract email from payload if present
  v_email := p_payload->>'FullName' OR p_payload->>'client_email';

  BEGIN
    -- 1. Insert into unified webhook_logs table
    INSERT INTO webhook_logs (
      provider,
      event_type,
      status,
      payload,
      error_message,
      external_id,
      signature,
      is_validated,
      environment,
      received_at,
      processed_at
    )
    VALUES (
      'vopay',
      p_transaction_type,
      CASE
        WHEN p_status IN ('successful', 'completed') THEN 'completed'
        WHEN p_status IN ('failed', 'cancelled') THEN 'failed'
        WHEN p_status IN ('pending', 'in progress') THEN 'processing'
        ELSE 'received'
      END,
      p_payload,
      p_failure_reason,
      p_transaction_id,
      p_validation_key,
      true,
      LOWER(p_environment),
      now(),
      now()
    )
    RETURNING id INTO v_log_id;

    -- Calculate processing time
    v_processing_time_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_time));

    -- Update processing time
    UPDATE webhook_logs
    SET processing_time_ms = v_processing_time_ms
    WHERE id = v_log_id;

    -- 2. Insert into vopay_objects (for backward compatibility)
    INSERT INTO vopay_objects (
      object_type,
      vopay_id,
      status,
      amount,
      payload,
      occurred_at,
      raw_log_id
    )
    VALUES (
      p_transaction_type,
      p_transaction_id,
      p_status,
      p_amount,
      p_payload,
      p_updated_at,
      v_log_id
    )
    RETURNING id INTO v_object_id;

    -- 3. Lookup client (if email present in payload)
    IF v_email IS NOT NULL THEN
      SELECT c.id INTO v_client_id
      FROM clients c
      WHERE c.email = v_email
         OR c.first_name || ' ' || c.last_name = v_email
      LIMIT 1;

      -- 4. Update webhook_logs with client_id
      IF v_client_id IS NOT NULL THEN
        UPDATE webhook_logs
        SET client_id = v_client_id
        WHERE id = v_log_id;

        -- Also update vopay_objects
        UPDATE vopay_objects
        SET client_id = v_client_id
        WHERE id = v_object_id;

        -- 5. Lookup most recent loan for this client
        SELECT l.id INTO v_loan_id
        FROM loans l
        JOIN loan_applications la ON l.application_id = la.id
        WHERE la.client_id = v_client_id
        ORDER BY l.created_at DESC
        LIMIT 1;

        -- 6. Update webhook_logs with loan_id
        IF v_loan_id IS NOT NULL THEN
          UPDATE webhook_logs
          SET loan_id = v_loan_id
          WHERE id = v_log_id;

          -- Also update vopay_objects
          UPDATE vopay_objects
          SET loan_id = v_loan_id
          WHERE id = v_object_id;
        END IF;
      END IF;
    END IF;

    -- Return success
    RETURN QUERY SELECT
      v_log_id as webhook_log_id,
      v_object_id as vopay_object_id,
      v_client_id as client_id,
      v_loan_id as loan_id,
      true as success,
      NULL::TEXT as error_message;

  EXCEPTION WHEN OTHERS THEN
    -- Return error
    RETURN QUERY SELECT
      NULL::UUID as webhook_log_id,
      NULL::UUID as vopay_object_id,
      NULL::UUID as client_id,
      NULL::UUID as loan_id,
      false as success,
      SQLERRM as error_message;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_vopay_webhook TO service_role, authenticated;

-- Add comment
COMMENT ON FUNCTION process_vopay_webhook IS 'Process VoPay webhook atomically: log to webhook_logs, insert vopay_objects, match client & loan';
