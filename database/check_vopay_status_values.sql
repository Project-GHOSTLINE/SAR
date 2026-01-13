-- Vérifier les valeurs réelles du champ status dans vopay_webhook_logs
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM vopay_webhook_logs), 2) as percentage
FROM vopay_webhook_logs
GROUP BY status
ORDER BY count DESC;
