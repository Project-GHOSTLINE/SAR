SELECT to_regclass('public.vopay_objects') AS vopay_objects_table;

SELECT object_type, vopay_id, COUNT(*)
FROM public.vopay_objects
GROUP BY 1,2 HAVING COUNT(*) > 1;
