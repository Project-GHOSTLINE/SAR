-- ============================================================================
-- MISE À JOUR DES DESCRIPTIONS DES MÉTRIQUES VOPAY
-- ============================================================================
-- Ajoute des descriptions détaillées pour comprendre ce que chaque chiffre représente
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. vopay_success_rate - Taux de Succès
-- ============================================================================

UPDATE metric_registry
SET description = 'Pourcentage de transactions VoPay qui se sont terminées avec succès (status = ''successful'') par rapport au total des transactions reçues.

📊 CE QUE ÇA REPRÉSENTE:
- Un taux de 100% = Toutes les transactions passent sans problème
- Un taux de 80-95% = Normal, quelques échecs attendus (cartes refusées, fonds insuffisants)
- Un taux < 80% = Problème potentiel avec l''intégration VoPay ou les clients

💡 COMMENT C''EST CALCULÉ:
(Nombre de webhooks avec status ''successful'') ÷ (Total de tous les webhooks) × 100

🚨 QUAND AGIR:
- Taux < 70%: Vérifier les logs VoPay pour identifier les causes d''échec
- Chute soudaine: Incident technique possible avec VoPay ou la plateforme
- Taux > 95%: Excellent, tout fonctionne normalement

📌 EXEMPLE:
Si tu as 998 webhooks dont 850 successful:
850 ÷ 998 × 100 = 85.17% de succès'
WHERE metric_key = 'vopay_success_rate';

-- ============================================================================
-- 2. vopay_pending - Transactions en Attente
-- ============================================================================

UPDATE metric_registry
SET description = 'Nombre de transactions VoPay actuellement en cours de traitement (status = ''pending'' ou ''in progress''). Ces transactions n''ont pas encore reçu de confirmation finale.

📊 CE QUE ÇA REPRÉSENTE:
- Transactions qui attendent validation bancaire
- Transferts bancaires qui prennent 1-3 jours ouvrables
- Vérifications de compte en cours

💡 COMMENT C''EST CALCULÉ:
Compte de tous les webhooks avec status IN (''pending'', ''in progress'')

🚨 QUAND AGIR:
- 0-5 transactions: Normal, flux régulier de transactions en cours
- 5-20 transactions: Flux élevé, surveiller si ça augmente
- > 20 transactions: Possible goulot d''étranglement, contacter VoPay
- > 50 transactions: Incident probable, vérifier le statut de l''API VoPay

⏱️ DURÉE NORMALE:
- Interac e-Transfer: 1-2 minutes
- EFT (virement bancaire): 1-3 jours ouvrables
- Vérification de compte: 5-10 minutes

📌 EXEMPLE:
Si tu as 2 pending:
- Probablement 2 clients qui ont soumis un prêt il y a quelques minutes
- Attendre 5-10 minutes avant de s''inquiéter'
WHERE metric_key = 'vopay_pending';

-- ============================================================================
-- 3. vopay_failed - Transactions Échouées
-- ============================================================================

UPDATE metric_registry
SET description = 'Nombre total de transactions VoPay qui ont échoué ou été annulées (status = ''failed'' ou ''cancelled''). Ces transactions n''ont PAS été complétées.

📊 CE QUE ÇA REPRÉSENTE:
- Transactions refusées par la banque du client
- Fonds insuffisants dans le compte
- Informations bancaires invalides
- Transactions annulées manuellement
- Erreurs de l''API VoPay

💡 COMMENT C''EST CALCULÉ:
Compte de tous les webhooks avec status IN (''failed'', ''cancelled'')

🚨 RAISONS D''ÉCHEC COURANTES:
1. Fonds insuffisants (NSF) - 40-50% des échecs
2. Compte bancaire fermé ou bloqué - 20-30%
3. Informations bancaires incorrectes - 15-20%
4. Transaction annulée par le client - 5-10%
5. Erreur technique VoPay - < 5%

📈 TAUX D''ÉCHEC NORMAL:
- 5-15%: Normal dans l''industrie des prêts
- 15-25%: Légèrement élevé, revoir le processus de validation
- > 25%: Problème sérieux, vérifier la qualité des leads

🔍 ACTION À PRENDRE:
1. Cliquer sur la métrique pour voir les détails dans failure_reason
2. Grouper les échecs par type (NSF, invalid account, etc.)
3. Contacter les clients avec échecs pour mettre à jour leurs infos bancaires
4. Si > 30 échecs: Analyser le raw_payload dans vopay_webhook_logs

📌 EXEMPLE:
Si tu as 67 failed sur 998 webhooks:
67 ÷ 998 = 6.7% de taux d''échec
C''est EXCELLENT - bien en dessous de la moyenne de l''industrie (10-15%)'
WHERE metric_key = 'vopay_failed';

COMMIT;

-- ============================================================================
-- VÉRIFICATION DES DESCRIPTIONS
-- ============================================================================

SELECT
  metric_key,
  label,
  LEFT(description, 100) || '...' as description_preview,
  LENGTH(description) as description_length
FROM metric_registry
WHERE section_key = 'vopay'
ORDER BY display_order;
