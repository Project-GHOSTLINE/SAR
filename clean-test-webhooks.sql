-- Supprimer tous les webhooks de test
DELETE FROM vopay_webhook_logs
WHERE transaction_id LIKE 'TEST_%';

-- Vérifier les webhooks restants
SELECT COUNT(*) as total_webhooks FROM vopay_webhook_logs;
