-- Vérifier la structure de la table vopay_webhook_logs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vopay_webhook_logs'
ORDER BY ordinal_position;

-- Voir un exemple de données
SELECT *
FROM vopay_webhook_logs
LIMIT 5;
