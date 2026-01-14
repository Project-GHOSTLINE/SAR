-- 021_migrate_emails_envoyes_to_communications.sql
-- Blueprint emails_envoyes: (id, message_id, type, destinataire, sujet, contenu, envoye_par, created_at)

INSERT INTO public.communications (
  client_id, channel, direction, thread_key,
  from_addr, to_addrs, subject, body_text,
  provider, provider_message_id, occurred_at, metadata
)
SELECT
  c.id AS client_id,
  'email' AS channel,
  'outbound' AS direction,
  ee.message_id AS thread_key,
  ee.envoye_par AS from_addr,
  jsonb_build_array(ee.destinataire) AS to_addrs,
  ee.sujet AS subject,
  ee.contenu AS body_text,
  'emails_envoyes' AS provider,
  ee.message_id AS provider_message_id,
  ee.created_at AS occurred_at,
  jsonb_build_object('legacy_table','emails_envoyes','legacy_id',ee.id,'type',ee.type)
FROM public.emails_envoyes ee
JOIN public.clients c
  ON lower(c.primary_email) = lower(ee.destinataire)
WHERE ee.message_id IS NOT NULL
ON CONFLICT (provider, provider_message_id) DO NOTHING;
