SELECT to_regclass('public.communications') AS communications_table;

SELECT COUNT(*) AS communications_without_client
FROM public.communications co
LEFT JOIN public.clients cl ON cl.id = co.client_id
WHERE cl.id IS NULL;

SELECT channel, direction, COUNT(*) FROM public.communications
GROUP BY 1,2 ORDER BY 3 DESC;
