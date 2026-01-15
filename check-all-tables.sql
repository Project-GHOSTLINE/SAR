-- Vérifier toutes les tables et vues avec comptage des données

-- 1. TABLES PRINCIPALES
SELECT 'clients' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'loans', COUNT(*) FROM loans
UNION ALL
SELECT 'communications', COUNT(*) FROM communications
UNION ALL
SELECT 'payment_events', COUNT(*) FROM payment_events
UNION ALL
SELECT 'vopay_objects', COUNT(*) FROM vopay_objects
UNION ALL
SELECT 'vopay_webhook_logs', COUNT(*) FROM vopay_webhook_logs
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL
SELECT 'applications', COUNT(*) FROM applications
UNION ALL
SELECT 'payment_schedules', COUNT(*) FROM payment_schedules
ORDER BY count DESC;

-- 2. VUES TIMELINE
SELECT 'VUE: vw_client_timeline' as metric, COUNT(*) as count FROM vw_client_timeline
UNION ALL
SELECT 'VUE: vw_client_timeline_by_type', COUNT(*) FROM vw_client_timeline_by_type
UNION ALL
SELECT 'VUE: vw_client_summary', COUNT(*) FROM vw_client_summary;

-- 3. VUES VOPAY
SELECT 'VUE: vw_vopay_by_client' as metric, COUNT(*) as count FROM vw_vopay_by_client
UNION ALL
SELECT 'VUE: vw_vopay_orphans', COUNT(*) FROM vw_vopay_orphans
UNION ALL
SELECT 'VUE: vw_vopay_summary', COUNT(*) FROM vw_vopay_summary;

-- 4. VUES AUDIT
SELECT 'VUE: vw_audit_recent' as metric, COUNT(*) as count FROM vw_audit_recent
UNION ALL
SELECT 'VUE: vw_audit_stats_by_table', COUNT(*) FROM vw_audit_stats_by_table;

-- 5. VUES PERFORMANCE
SELECT 'VUE: vw_performance_cache_hit_ratio' as metric, COUNT(*) as count FROM vw_performance_cache_hit_ratio
UNION ALL
SELECT 'VUE: vw_performance_table_sizes', COUNT(*) FROM vw_performance_table_sizes
UNION ALL
SELECT 'VUE: vw_performance_index_usage', COUNT(*) FROM vw_performance_index_usage
UNION ALL
SELECT 'VUE: vw_performance_bloat_check', COUNT(*) FROM vw_performance_bloat_check;

-- 6. Détails VoPay par status
SELECT
    'VoPay status: ' || COALESCE(status, 'NULL') as metric,
    COUNT(*) as count
FROM vopay_objects
GROUP BY status
ORDER BY count DESC;

-- 7. Détails Communications par type
SELECT
    'Communications type: ' || COALESCE(communication_type, 'NULL') as metric,
    COUNT(*) as count
FROM communications
GROUP BY communication_type
ORDER BY count DESC;

-- 8. Détails Loans par status
SELECT
    'Loans status: ' || COALESCE(status, 'NULL') as metric,
    COUNT(*) as count
FROM loans
GROUP BY status
ORDER BY count DESC;

-- 9. Payment Events par type
SELECT
    'Payment event type: ' || COALESCE(event_type, 'NULL') as metric,
    COUNT(*) as count
FROM payment_events
GROUP BY event_type
ORDER BY count DESC;
