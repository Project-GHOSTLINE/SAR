SELECT to_regclass('public.vw_client_timeline') AS timeline_view;
SELECT to_regclass('public.vw_client_summary') AS summary_view;

SELECT * FROM public.vw_client_timeline ORDER BY ts DESC LIMIT 20;
SELECT * FROM public.vw_client_summary LIMIT 20;
