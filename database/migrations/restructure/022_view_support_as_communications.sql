-- 022_view_support_as_communications.sql (recommandé)
-- Blueprint:
-- support_tickets(id, ticket_number, client_name, client_email, subject, ...)
-- support_messages(id, ticket_id, message_from, sender_name, content, created_at)
-- support_attachments(id, ticket_id, message_id, file_name, storage_path, ...)

CREATE OR REPLACE VIEW public.vw_support_as_communications AS
SELECT
  sm.id AS id,
  st.client_id,
  'support'::text AS channel,
  CASE WHEN sm.message_from = 'client' THEN 'inbound' ELSE 'outbound' END AS direction,
  st.ticket_number AS thread_key,
  CASE WHEN sm.message_from = 'client' THEN st.client_email ELSE 'support' END AS from_addr,
  jsonb_build_array(st.client_email) AS to_addrs,
  st.subject AS subject,
  sm.content AS body_text,
  'support_module'::text AS provider,
  NULL::text AS provider_message_id,
  sm.created_at AS occurred_at,
  sm.created_at AS created_at,
  jsonb_build_object('ticket_id', st.id, 'sender_name', sm.sender_name) AS metadata
FROM public.support_messages sm
JOIN public.support_tickets st ON st.id = sm.ticket_id
WHERE st.client_id IS NOT NULL;
