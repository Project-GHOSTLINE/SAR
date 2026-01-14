SELECT to_regclass('public.clients') AS clients_table;

SELECT COUNT(*) AS total_apps,
       SUM(CASE WHEN client_id IS NULL THEN 1 ELSE 0 END) AS apps_without_client_id
FROM public.loan_applications;

SELECT lower(primary_email) AS email, COUNT(*)
FROM public.clients
WHERE primary_email IS NOT NULL
GROUP BY 1
HAVING COUNT(*) > 1;
