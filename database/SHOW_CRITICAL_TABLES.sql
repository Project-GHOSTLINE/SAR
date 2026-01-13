-- ============================================================================
-- STRUCTURE DES TABLES CRITIQUES SEULEMENT
-- ============================================================================
-- Exécutez ceci et copiez le résultat - c'est rapide et ciblé
-- ============================================================================

-- Table 1: vopay_webhook_logs
SELECT 'vopay_webhook_logs' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vopay_webhook_logs' AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

-- Table 2: client_analyses
SELECT 'client_analyses' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_analyses' AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

-- Table 3: client_transactions
SELECT 'client_transactions' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_transactions' AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

-- Table 4: client_accounts
SELECT 'client_accounts' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_accounts' AND table_schema = 'public'
ORDER BY ordinal_position;
