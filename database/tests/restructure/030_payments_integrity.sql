SELECT to_regclass('public.loans') AS loans_table;

SELECT COUNT(*) AS loans_without_client
FROM public.loans l
LEFT JOIN public.clients c ON c.id=l.client_id
WHERE c.id IS NULL;
