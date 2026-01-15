-- 022_view_support_as_communications.sql (FIXED)
-- Adapté à la structure réelle: sender_role, message, sender_email, is_internal_note

CREATE OR REPLACE VIEW public.vw_support_as_communications AS
SELECT
  sm.id AS id,
  st.client_id,
  'support'::text AS channel,
  CASE WHEN sm.sender_role = 'client' THEN 'inbound' ELSE 'outbound' END AS direction,
  st.ticket_number AS thread_key,
  CASE
    WHEN sm.sender_role = 'client' THEN COALESCE(sm.sender_email, st.client_email)
    ELSE 'support'
  END AS from_addr,
  jsonb_build_array(st.client_email) AS to_addrs,
  st.subject AS subject,
  sm.message AS body_text,
  'support_module'::text AS provider,
  NULL::text AS provider_message_id,
  sm.created_at AS occurred_at,
  sm.created_at AS created_at,
  jsonb_build_object(
    'ticket_id', st.id,
    'sender_name', sm.sender_name,
    'sender_role', sm.sender_role,
    'is_internal_note', sm.is_internal_note
  ) AS metadata
FROM public.support_messages sm
JOIN public.support_tickets st ON st.id = sm.ticket_id
WHERE st.client_id IS NOT NULL
  AND sm.is_internal_note = false;  -- Exclure les notes internes
