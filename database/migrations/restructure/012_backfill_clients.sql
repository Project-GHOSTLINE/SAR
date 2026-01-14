-- 012_backfill_clients.sql
-- Décision A: courriel prioritaire + fallback telephone.

-- 1) Créer clients depuis loan_applications (courriel, telephone, prenom, nom)
INSERT INTO public.clients (primary_email, primary_phone, first_name, last_name)
SELECT DISTINCT
  lower(NULLIF(trim(courriel),'')) AS primary_email,
  NULLIF(trim(telephone),'') AS primary_phone,
  NULLIF(trim(prenom),'') AS first_name,
  NULLIF(trim(nom),'') AS last_name
FROM public.loan_applications
WHERE (courriel IS NOT NULL AND trim(courriel) <> '')
   OR (telephone IS NOT NULL AND trim(telephone) <> '')
ON CONFLICT (lower(primary_email)) DO NOTHING;

-- 2) Créer clients depuis support_tickets (client_email)
INSERT INTO public.clients (primary_email)
SELECT DISTINCT lower(NULLIF(trim(client_email),'')) AS primary_email
FROM public.support_tickets
WHERE client_email IS NOT NULL AND trim(client_email) <> ''
ON CONFLICT (lower(primary_email)) DO NOTHING;

-- 3) Créer clients depuis contact_messages (email, telephone, nom)
INSERT INTO public.clients (primary_email, primary_phone, first_name, last_name)
SELECT DISTINCT
  lower(NULLIF(trim(email),'')) AS primary_email,
  NULLIF(trim(telephone),'') AS primary_phone,
  NULLIF(trim(split_part(nom,' ',1)),'') AS first_name,
  NULLIF(trim(regexp_replace(nom,'^\S+\s*','')),'') AS last_name
FROM public.contact_messages
WHERE (email IS NOT NULL AND trim(email) <> '')
   OR (telephone IS NOT NULL AND trim(telephone) <> '')
ON CONFLICT (lower(primary_email)) DO NOTHING;

-- A) Liaison: loan_applications.client_id par courriel, sinon telephone
UPDATE public.loan_applications la
SET client_id = c.id
FROM public.clients c
WHERE la.client_id IS NULL
  AND la.courriel IS NOT NULL AND trim(la.courriel) <> ''
  AND lower(la.courriel)=lower(c.primary_email);

UPDATE public.loan_applications la
SET client_id = c.id
FROM public.clients c
WHERE la.client_id IS NULL
  AND (la.courriel IS NULL OR trim(la.courriel) = '')
  AND la.telephone IS NOT NULL AND trim(la.telephone) <> ''
  AND la.telephone = c.primary_phone;

-- B) client_accounts.client_id via application_id
UPDATE public.client_accounts ca
SET client_id = la.client_id
FROM public.loan_applications la
WHERE ca.client_id IS NULL
  AND ca.application_id = la.id
  AND la.client_id IS NOT NULL;

-- C) client_analyses.client_id via application_id
UPDATE public.client_analyses an
SET client_id = la.client_id
FROM public.loan_applications la
WHERE an.client_id IS NULL
  AND an.application_id = la.id
  AND la.client_id IS NOT NULL;

-- D) support_tickets.client_id via client_email
UPDATE public.support_tickets st
SET client_id = c.id
FROM public.clients c
WHERE st.client_id IS NULL
  AND st.client_email IS NOT NULL AND trim(st.client_email) <> ''
  AND lower(st.client_email)=lower(c.primary_email);

-- E) contact_messages.client_id via email sinon telephone
UPDATE public.contact_messages cm
SET client_id = c.id
FROM public.clients c
WHERE cm.client_id IS NULL
  AND cm.email IS NOT NULL AND trim(cm.email) <> ''
  AND lower(cm.email)=lower(c.primary_email);

UPDATE public.contact_messages cm
SET client_id = c.id
FROM public.clients c
WHERE cm.client_id IS NULL
  AND (cm.email IS NULL OR trim(cm.email) = '')
  AND cm.telephone IS NOT NULL AND trim(cm.telephone) <> ''
  AND cm.telephone=c.primary_phone;
