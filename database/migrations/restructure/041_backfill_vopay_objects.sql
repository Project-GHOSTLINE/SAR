-- 041_backfill_vopay_objects.sql (optionnel)
-- Blueprint vopay_webhook_logs: (id, event_type, transaction_id, payload, processed, error, received_at)

INSERT INTO public.vopay_objects (object_type, vopay_id, status, amount, payload, occurred_at, raw_log_id)
SELECT
  COALESCE(NULLIF(trim(event_type),''),'unknown') AS object_type,
  COALESCE(NULLIF(trim(transaction_id),''), id::text) AS vopay_id,
  NULLIF(payload->>'status','') AS status,
  CASE
    WHEN (payload ? 'amount') AND (payload->>'amount') ~ '^[0-9]+(\.[0-9]+)?$' THEN (payload->>'amount')::numeric
    ELSE NULL
  END AS amount,
  payload,
  received_at AS occurred_at,
  id AS raw_log_id
FROM public.vopay_webhook_logs
ON CONFLICT (object_type, vopay_id) DO NOTHING;
