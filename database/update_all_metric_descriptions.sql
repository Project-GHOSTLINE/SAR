-- ============================================================================
-- DESCRIPTIONS DÉTAILLÉES POUR TOUTES LES MÉTRIQUES
-- ============================================================================
-- Ajoute des explications claires pour chaque métrique du système
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION: GLOBAL (Dashboard Principal)
-- ============================================================================

-- 1. Total Clients
UPDATE metric_registry
SET description = 'Nombre total de clients uniques qui ont complété au moins une analyse IBV/Flinks.

📊 CE QUE ÇA REPRÉSENTE:
- Compte le nombre d''emails clients distincts dans client_analyses
- Un client = une personne qui a soumis ses informations bancaires

💡 COMMENT C''EST CALCULÉ:
COUNT(DISTINCT client_email) FROM client_analyses WHERE client_email IS NOT NULL

🚨 INDICATEURS:
- 0-50 clients: Phase de démarrage, augmenter le marketing
- 50-200 clients: Croissance stable, optimiser la conversion
- 200-500 clients: Échelle, automatiser les processus
- > 500 clients: Mature, focus sur rétention et referrals

📈 CROISSANCE SAINE:
- +10-20% par mois en phase de lancement
- +5-10% par mois en phase de croissance
- +2-5% par mois en phase mature

📌 EXEMPLE:
6 clients = Tu débutes, chaque nouveau client compte!'
WHERE metric_key = 'total_clients';

-- 2. Total Revenue MTD
UPDATE metric_registry
SET description = 'Revenu total généré depuis le début du mois en cours (Month-To-Date).

📊 CE QUE ÇA REPRÉSENTE:
- Somme de tous les revenus du 1er du mois à aujourd''hui
- Inclut: Frais de prêts, intérêts, frais de service, etc.

💡 COMMENT C''EST CALCULÉ:
SUM(amount) FROM revenue_transactions WHERE transaction_date >= début_du_mois

⚠️ STATUT ACTUEL:
Cette métrique est à $0 car la table "revenue_transactions" n''existe pas encore.
Il faut créer une table pour tracker les revenus générés par chaque prêt.

🎯 OBJECTIFS TYPIQUES (prêts rapides):
- Démarrage (0-50 prêts/mois): $5,000 - $15,000 MTD
- Croissance (50-200 prêts/mois): $15,000 - $60,000 MTD
- Maturité (200+ prêts/mois): $60,000 - $200,000+ MTD

📊 REVENUS PAR PRÊT:
- Prêt $500 avec 15% intérêt = $75 revenu
- Prêt $1000 avec 15% intérêt = $150 revenu
- Prêt $2000 avec 15% intérêt = $300 revenu

📌 TODO:
Créer la table revenue_transactions pour activer cette métrique'
WHERE metric_key = 'total_revenue_mtd';

-- 3. Active Loans
UPDATE metric_registry
SET description = 'Nombre de prêts actuellement actifs (approuvés et non encore remboursés).

📊 CE QUE ÇA REPRÉSENTE:
- Prêts qui ont été décaissés au client
- Client n''a pas encore remboursé complètement
- Argent actuellement prêté et en circulation

💡 COMMENT C''EST CALCULÉ:
COUNT(*) FROM loans WHERE status = ''active'' AND balance_remaining > 0

⚠️ STATUT ACTUEL:
Cette métrique est à 0 car la table "loans" n''existe pas encore.
Il faut créer une table pour tracker chaque prêt approuvé.

🎯 RATIO SAIN:
- Active Loans ÷ Total Clients = Taux de pénétration
- 30-50%: Excellent (la moitié des clients ont un prêt actif)
- 20-30%: Bon (augmenter la conversion)
- < 20%: Faible (problème d''approbation ou de demande)

📊 CAPITAL EN CIRCULATION:
- 10 prêts × $1,000 moyen = $10,000 capital prêté
- 50 prêts × $1,000 moyen = $50,000 capital prêté
- 100 prêts × $1,000 moyen = $100,000 capital prêté

⚖️ GESTION DU RISQUE:
- < 20 prêts actifs: Risque faible, croissance lente
- 20-100 prêts actifs: Zone optimale, surveiller le NSF
- > 100 prêts actifs: Risque élevé, renforcer la validation

📌 TODO:
Créer la table loans pour activer cette métrique'
WHERE metric_key = 'active_loans';

-- 4. Open Fraud Cases
UPDATE metric_registry
SET description = 'Nombre de cas de fraude actuellement en investigation (status = ''open'' ou ''investigating'').

📊 CE QUE ÇA REPRÉSENTE:
- Cas détectés mais pas encore résolus
- Investigations en cours par l''équipe
- Fraudes potentielles à confirmer

💡 COMMENT C''EST CALCULÉ:
COUNT(*) FROM fraud_cases WHERE status IN (''open'', ''investigating'') AND closed_at IS NULL

🚨 TYPES DE FRAUDE COURANTS:
1. Identité volée (40-50% des cas)
2. Documents falsifiés (20-30%)
3. Coordonnées bancaires frauduleuses (15-20%)
4. Applications multiples simultanées (10-15%)
5. Fraude organisée/réseaux (5-10%)

📊 TAUX NORMAL:
- 0-2%: Excellent système de détection
- 2-5%: Normal dans l''industrie
- 5-10%: Élevé, renforcer la validation
- > 10%: Critique, revoir tout le processus

⏱️ TEMPS DE RÉSOLUTION:
- Fraude simple: 1-3 jours
- Fraude complexe: 5-10 jours
- Fraude organisée: 2-4 semaines

🎯 OBJECTIF:
- Maintenir < 2% de fraudes par rapport au total de clients
- Résoudre 80% des cas en moins de 7 jours
- Récupérer au moins 30% des montants fraudés

📌 EXEMPLE:
0 cas ouverts = Excellent! Soit pas de fraude, soit bonne détection préventive'
WHERE metric_key = 'fraud_cases_open';

-- ============================================================================
-- SECTION: ANALYSES CLIENT
-- ============================================================================

-- 5. NSF Count 30d
UPDATE metric_registry
SET description = 'Nombre de transactions NSF (Non-Sufficient Funds / chèque sans provision) dans les 30 derniers jours.

📊 CE QUE ÇA REPRÉSENTE:
- Transactions rejetées par manque de fonds dans le compte
- Indicateur clé de risque financier du client
- Affecte directement la décision d''approbation de prêt

💡 COMMENT C''EST CALCULÉ:
COUNT(*) FROM client_transactions
WHERE description LIKE ''%NSF%'' OR description LIKE ''%insufficient%''
AND transaction_date >= NOW() - INTERVAL ''30 days''

🚨 ÉVALUATION DU RISQUE:
- 0 NSF: ✅ Excellent (risque très faible)
- 1 NSF: ⚠️ Acceptable (peut être un incident isolé)
- 2-3 NSF: 🔶 Moyen (client en difficulté financière)
- 4-5 NSF: 🔴 Élevé (recommander refus ou montant réduit)
- > 5 NSF: 🚫 Critique (refuser automatiquement)

💰 IMPACT SUR L''APPROBATION:
- 0 NSF: Approuver montant complet demandé
- 1 NSF: Approuver avec montant réduit de 20-30%
- 2+ NSF: Refuser ou exiger co-signataire

📊 FRAIS TYPIQUES:
Chaque NSF coûte au client: $45-$50 en frais bancaires
3 NSF = $135-$150 de frais = Client vraiment en difficulté

📌 EXEMPLE:
Client avec 4 NSF en 30 jours = Haut risque de défaut sur le prêt'
WHERE metric_key = 'nsf_count_30d';

-- 6. NSF Count 60d
UPDATE metric_registry
SET description = 'Nombre de transactions NSF dans les 60 derniers jours.

📊 CE QUE ÇA REPRÉSENTE:
- Historique plus long pour détecter les patterns
- Permet de voir si le client s''améliore ou empire
- Utilisé en combinaison avec NSF 30d

💡 ANALYSE COMPARATIVE:
- NSF 60d = NSF 30d: Problème récent seulement
- NSF 60d > NSF 30d: Client s''améliore (bon signe!)
- NSF 60d < NSF 30d × 2: Situation qui empire (alerte!)

📊 PATTERNS À DÉTECTER:
- NSF groupés en début de mois: Problème de timing cash flow
- NSF aléatoires: Mauvaise gestion financière
- NSF constants: Revenus insuffisants vs dépenses

🎯 DÉCISION:
Si NSF 30d = 0 mais NSF 60d = 3:
→ Client s''est amélioré récemment (bon signe, peut approuver)

Si NSF 30d = 3 et NSF 60d = 3:
→ Tous les NSF sont récents (mauvais signe, refuser)

📌 EXEMPLE:
NSF 60d: 2 | NSF 30d: 0 = Client s''est stabilisé'
WHERE metric_key = 'nsf_count_60d';

-- 7. NSF Count 90d
UPDATE metric_registry
SET description = 'Nombre de transactions NSF dans les 90 derniers jours (3 mois).

📊 CE QUE ÇA REPRÉSENTE:
- Vue complète du comportement financier du client
- Couvre généralement 3 cycles de paie
- Métrique la plus fiable pour prédire le risque

💡 SEUILS CRITIQUES (90 jours):
- 0-1 NSF: Risque FAIBLE (5-10% défaut)
- 2-4 NSF: Risque MOYEN (15-25% défaut)
- 5-7 NSF: Risque ÉLEVÉ (30-45% défaut)
- 8+ NSF: Risque CRITIQUE (50-70% défaut)

📊 CALCUL DU RISQUE SCORE:
Score = (NSF 90d × 10) + (NSF 30d × 5)

Exemple 1: NSF 90d = 2, NSF 30d = 0
Score = (2 × 10) + (0 × 5) = 20 points (FAIBLE)

Exemple 2: NSF 90d = 5, NSF 30d = 3
Score = (5 × 10) + (3 × 5) = 65 points (ÉLEVÉ)

🎯 RÈGLE D''OR:
Ne JAMAIS prêter à un client avec > 5 NSF en 90 jours
Taux de défaut trop élevé = perte garantie

📈 TENDANCE:
Comparer avec NSF 60d et 30d pour voir l''évolution:
- Si décroissant: Client s''améliore ✅
- Si stable: Situation chronique ⚠️
- Si croissant: Spirale descendante 🚫

📌 EXEMPLE:
8 NSF en 90 jours = 1 NSF tous les 11 jours = CRITIQUE'
WHERE metric_key = 'nsf_count_90d';

-- 8. Average Balance
UPDATE metric_registry
SET description = 'Solde moyen du compte bancaire principal du client sur 90 jours.

📊 CE QUE ÇA REPRÉSENTE:
- Cushion financier du client
- Capacité à absorber les dépenses imprévues
- Indicateur de stabilité financière

💡 COMMENT C''EST CALCULÉ:
AVG(daily_balance) FROM client_accounts WHERE account_type = ''checking'' AND date >= NOW() - INTERVAL ''90 days''

💰 ÉVALUATION PAR TRANCHE:
- < $100: 🔴 Critique - Vie de paie en paie
- $100-$500: 🔶 Faible - Peu de marge d''erreur
- $500-$1,500: ⚠️ Acceptable - Buffer minimal
- $1,500-$5,000: ✅ Bon - Gestion stable
- > $5,000: 💎 Excellent - Très faible risque

🎯 RATIO D''APPROBATION:
Montant max à prêter = Average Balance × 1.5

Exemples:
- Balance moy. $500 → Prêter max $750
- Balance moy. $1,000 → Prêter max $1,500
- Balance moy. $3,000 → Prêter max $4,500

📊 CORRÉLATION AVEC NSF:
- Balance < $200 + NSF > 2 = 80% chance défaut
- Balance > $1,000 + NSF = 0 = 95% taux remboursement

⚠️ ATTENTION:
Balance élevé récent (< 1 semaine) peut être un dépôt temporaire
→ Vérifier l''historique sur 90 jours complets

📌 EXEMPLE:
Average Balance $250 = Prêter max $300-$400 seulement'
WHERE metric_key = 'avg_balance';

-- 9. Total Income 90d
UPDATE metric_registry
SET description = 'Revenu total détecté dans les 90 derniers jours (dépôts de paie, transferts gouvernement, etc).

📊 CE QUE ÇA REPRÉSENTE:
- Tous les dépôts identifiés comme revenus
- Salaires, paies, prestations gouvernementales
- Capacité de remboursement du client

💡 COMMENT C''EST DÉTECTÉ:
Dépôts contenant: "paie", "salary", "govt", "employment", "direct deposit", etc.

💰 TRANCHES DE REVENUS:
- < $3,000: 🔴 Très faible (< $1,000/mois)
- $3,000-$6,000: 🔶 Faible ($1,000-$2,000/mois)
- $6,000-$12,000: ⚠️ Moyen ($2,000-$4,000/mois)
- $12,000-$18,000: ✅ Bon ($4,000-$6,000/mois)
- > $18,000: 💎 Excellent (> $6,000/mois)

🎯 RATIO DETTE/REVENU:
Montant max à prêter = (Total Income 90d ÷ 3) × 0.15

Exemple:
- Revenu 90d: $12,000 ($4,000/mois)
- Revenu mensuel: $4,000
- Max à prêter: $4,000 × 0.15 = $600

📊 RÈGLE INDUSTRIE:
Le paiement mensuel du prêt ne doit PAS dépasser 15% du revenu mensuel

Exemple:
- Revenu mensuel: $3,000
- Max paiement prêt: $450/mois
- Si prêt $1,500 sur 4 mois = $375/mois ✅

⚠️ ATTENTION:
Revenus irréguliers (freelance, pourboires) = Multiplier par 0.8 pour sécurité

📌 EXEMPLE:
$9,000 revenus en 90 jours = $3,000/mois = Prêter max $450'
WHERE metric_key = 'total_income_90d';

-- 10. Risk Score
UPDATE metric_registry
SET description = 'Score de risque calculé automatiquement basé sur tous les indicateurs financiers (0-100).

📊 CE QUE ÇA REPRÉSENTE:
- 0 = Risque le plus faible (client parfait)
- 100 = Risque le plus élevé (refus automatique)
- Combinaison de tous les facteurs financiers

💡 FORMULE DE CALCUL:
Score = (NSF 90d × 8) + (NSF 30d × 10) + Balance_Factor + Income_Factor + Transaction_Pattern

Balance_Factor:
- < $100: +20 points
- $100-$500: +15 points
- $500-$1,500: +10 points
- > $1,500: +0 points

Income_Factor:
- < $3,000: +15 points
- $3,000-$6,000: +10 points
- $6,000-$12,000: +5 points
- > $12,000: +0 points

🎯 SEUILS DE DÉCISION:
- 0-20: ✅ APPROUVER (Risque très faible)
- 21-40: ✅ APPROUVER montant réduit (Risque faible)
- 41-60: ⚠️ APPROUVER avec garanties (Risque moyen)
- 61-80: 🔶 REFUSER ou montant minimal (Risque élevé)
- 81-100: 🔴 REFUSER automatiquement (Risque critique)

📊 EXEMPLES RÉELS:

Client A:
- NSF 90d: 0, NSF 30d: 0
- Balance: $2,000
- Revenu 90d: $15,000
→ Score: 0 points = EXCELLENT

Client B:
- NSF 90d: 3, NSF 30d: 1
- Balance: $400
- Revenu 90d: $5,000
→ Score: (3×8) + (1×10) + 15 + 10 = 59 = MOYEN

Client C:
- NSF 90d: 8, NSF 30d: 4
- Balance: $50
- Revenu 90d: $2,500
→ Score: (8×8) + (4×10) + 20 + 15 = 139 (plafonné à 100) = CRITIQUE

🚨 ALERTES AUTOMATIQUES:
- Score > 80: Notifier le superviseur
- Score > 60: Demander validation manuelle
- Score < 20: Approbation automatique possible

📈 AMÉLIORATION:
Un client peut améliorer son score en:
- Évitant les NSF (−10 points/mois sans NSF)
- Augmentant son balance moyen
- Démontrant revenus stables

📌 EXEMPLE:
Score 35 = Risque faible, approuver $500-$800 max'
WHERE metric_key = 'risk_score';

-- ============================================================================
-- SECTION: FRAUD & RISQUE
-- ============================================================================

-- 11. Total Fraud Amount
UPDATE metric_registry
SET description = 'Montant total impliqué dans tous les cas de fraude détectés (confirmés et en investigation).

📊 CE QUE ÇA REPRÉSENTE:
- Somme d''argent potentiellement perdue à cause de fraude
- Inclut: Prêts frauduleux, identités volées, documents falsifiés
- Mesure l''impact financier de la fraude

💡 COMMENT C''EST CALCULÉ:
SUM(amount_involved) FROM fraud_cases WHERE status != ''false_positive''

💰 IMPACT PAR TRANCHE:
- $0-$5,000: Fraudes isolées, gestion normale
- $5,000-$20,000: Attention, renforcer validation
- $20,000-$50,000: Critique, audit complet requis
- > $50,000: Urgence, impliquer autorités

🎯 RATIO ACCEPTABLE:
Fraude ÷ Revenus totaux < 2%

Exemple:
- Revenus mensuels: $50,000
- Fraude acceptable: < $1,000/mois
- Si fraude > $1,000: Problème systémique

📊 TYPES DE FRAUDE PAR MONTANT:

Petite fraude ($100-$500):
- Applications avec fausses infos
- Documents retouchés amateurs

Fraude moyenne ($500-$2,000):
- Identités volées
- Documents falsifiés professionnels

Grande fraude ($2,000-$10,000+):
- Réseaux organisés
- Fraude sophistiquée avec complices

🚨 ACTIONS PAR SEUIL:

$0-$1,000:
→ Investigation interne standard

$1,000-$5,000:
→ Rapport aux bureaux de crédit

$5,000-$10,000:
→ Rapport à la police

> $10,000:
→ Police + potentiellement FBI/GRC

📈 RÉCUPÉRATION:
- 50-70% récupérable si détecté en < 24h
- 20-40% récupérable si détecté en < 7 jours
- < 10% récupérable après 30 jours

📌 EXEMPLE:
$8,500 total fraud = 3 cas confirmés à investiguer en priorité'
WHERE metric_key = 'fraud_amount_total';

-- 12. Amount Recovered
UPDATE metric_registry
SET description = 'Montant récupéré sur les cas de fraude confirmés (via remboursements, assurances, actions légales).

📊 CE QUE ÇA REPRÉSENTE:
- Argent effectivement récupéré après fraude
- Mesure l''efficacité de l''équipe d''investigation
- Réduit les pertes nettes

💡 COMMENT C''EST CALCULÉ:
SUM(amount_recovered) FROM fraud_cases WHERE status = ''closed''

💰 TAUX DE RÉCUPÉRATION:
Recovery Rate = (Amount Recovered ÷ Fraud Amount Total) × 100

- 0-20%: 🔴 Faible (améliorer processus)
- 20-40%: 🔶 Moyen (standard industrie)
- 40-60%: ✅ Bon (équipe efficace)
- > 60%: 💎 Excellent (processus mature)

🎯 SOURCES DE RÉCUPÉRATION:

1. Client (40-50%):
- Remboursement volontaire
- Saisie de salaire
- Collections

2. Assurance (30-40%):
- Réclamation fraude
- Police d''assurance crédit

3. Actions légales (10-20%):
- Jugements de cour
- Saisie d''actifs

4. Banque (5-10%):
- Chargeback réussi
- Récupération compte

📊 TIMING DE RÉCUPÉRATION:

Rapide (0-30 jours): 60% du total
- Client rembourse immédiatement
- Chargeback bancaire

Moyen (1-6 mois): 30% du total
- Procédures collections
- Négociation assurance

Long (6-24 mois): 10% du total
- Actions légales
- Saisies

⚠️ COÛT DE RÉCUPÉRATION:
Ne pas oublier que récupérer coûte aussi:
- Temps équipe: $500-$2,000/cas
- Frais légaux: $1,000-$5,000/cas
- Agence collections: 30-50% du montant

Si fraude < $500:
→ Coût récupération > montant perdu
→ Souvent pas rentable de poursuivre

📈 AMÉLIORATION:

Pour augmenter le taux:
1. Agir en < 24h après détection
2. Contacter client immédiatement
3. Figer les comptes rapidement
4. Documenter tout parfaitement

📌 EXEMPLE:
$2,100 récupéré sur $8,500 fraudé = 24.7% recovery rate'
WHERE metric_key = 'fraud_amount_recovered';

-- 13. Average Investigation Days
UPDATE metric_registry
SET description = 'Nombre moyen de jours pour clore un cas de fraude (de la détection à la résolution).

📊 CE QUE ÇA REPRÉSENTE:
- Efficacité de l''équipe d''investigation
- Rapidité de résolution des cas
- Impact sur la capacité de récupération

💡 COMMENT C''EST CALCULÉ:
AVG(DATEDIFF(closed_at, detected_at)) FROM fraud_cases WHERE status = ''closed''

⏱️ BENCHMARKS INDUSTRIE:

- 1-3 jours: 💎 Excellent (détection préventive)
- 3-7 jours: ✅ Bon (investigation rapide)
- 7-14 jours: ⚠️ Acceptable (processus standard)
- 14-30 jours: 🔶 Lent (amélioration nécessaire)
- > 30 jours: 🔴 Critique (problème systémique)

🎯 OBJECTIFS PAR TYPE:

Fraude Simple (fausses infos):
→ Résoudre en 1-3 jours

Fraude Moyenne (documents falsifiés):
→ Résoudre en 5-10 jours

Fraude Complexe (identité volée):
→ Résoudre en 10-20 jours

Fraude Organisée (réseaux):
→ Résoudre en 20-60 jours

📊 IMPACT SUR RÉCUPÉRATION:

Résolu en < 7 jours:
→ 60-70% chance de récupération partielle

Résolu en 7-30 jours:
→ 30-40% chance de récupération

Résolu en > 30 jours:
→ < 20% chance de récupération

⚠️ COÛTS:

Chaque jour d''investigation coûte:
- Temps analyste: $100-$300/jour
- Outils forensics: $50-$100/jour
- Opportunité perdue: Variable

Investigation 5 jours = $500-$2,000 coûts
Investigation 30 jours = $3,000-$9,000 coûts

🚨 ALERTES:

Si moyenne > 14 jours:
1. Manque de personnel
2. Processus inefficaces
3. Outils inadéquats
4. Formation insuffisante

📈 AMÉLIORATION:

Pour réduire:
1. Automatiser détection initiale
2. Prioriser par montant/complexité
3. Templates de documentation
4. Checklist d''investigation
5. Outils forensics modernes

📌 EXEMPLE:
12 jours moyens = Acceptable mais peut optimiser à 5-7 jours'
WHERE metric_key = 'investigation_avg_days';

-- 14. High Severity Cases
UPDATE metric_registry
SET description = 'Nombre de cas de fraude classés comme "high" ou "critical" severity (montants élevés ou fraude organisée).

📊 CE QUE ÇA REPRÉSENTE:
- Cas les plus graves nécessitant attention prioritaire
- Fraudes > $2,000 ou réseaux organisés
- Risque de pertes financières importantes

💡 COMMENT C''EST CALCULÉ:
COUNT(*) FROM fraud_cases WHERE severity IN (''high'', ''critical'')

🚨 CRITÈRES DE SÉVÉRITÉ:

CRITICAL (Critique):
- Montant > $5,000
- Fraude organisée/réseau
- Identités multiples compromises
- Menace de réputation publique

HIGH (Élevé):
- Montant $2,000-$5,000
- Documents professionnellement falsifiés
- Identité volée confirmée
- Récidiviste connu

MEDIUM (Moyen):
- Montant $500-$2,000
- Fausses informations
- Premier incident

LOW (Faible):
- Montant < $500
- Erreur possible vs fraude intentionnelle
- Information incomplète

🎯 GESTION PAR SÉVÉRITÉ:

CRITICAL:
→ Escalade CEO/CFO immédiate
→ Contacter autorités en < 24h
→ Geler tous comptes associés
→ Investigation forensique complète

HIGH:
→ Notification direction
→ Rapport police en < 72h
→ Investigation prioritaire
→ Alerter bureaux crédit

📊 RATIOS SAINS:

Sur 10 cas de fraude:
- 1-2 High/Critical: Normal
- 3-4 High/Critical: Attention requise
- 5+ High/Critical: Problème systémique

% High/Critical vs Total:
- < 20%: ✅ Bonne détection préventive
- 20-40%: ⚠️ Améliorer validation
- > 40%: 🔴 Système de validation défaillant

⏱️ TEMPS DE RÉPONSE:

Critical: Agir en < 2 heures
High: Agir en < 8 heures
Medium: Agir en < 24 heures
Low: Agir en < 72 heures

💰 IMPACT FINANCIER:

Moyenne industrie:
- 1 cas Critical = $8,000 perte
- 1 cas High = $3,000 perte
- 1 cas Medium = $1,000 perte
- 1 cas Low = $300 perte

📈 PRÉVENTION:

Pour réduire cas High/Critical:
1. Vérification d''identité biométrique
2. Validation téléphonique obligatoire
3. Limite $1,000 pour nouveaux clients
4. Machine learning pour patterns
5. Watchlist de fraudeurs connus

📌 EXEMPLE:
2 cas High/Critical ouverts = Priorité #1 de l''équipe'
WHERE metric_key = 'fraud_high_severity';

-- ============================================================================
-- SECTION: FINANCIAL
-- ============================================================================

-- 15. Total Deposits
UPDATE metric_registry
SET description = 'Somme de tous les dépôts (revenus + autres sources) détectés dans les comptes clients.

📊 CE QUE ÇA REPRÉSENTE:
- Tout l''argent entrant dans les comptes
- Indicateur de santé financière globale
- Base pour calcul capacité de remboursement

💡 COMMENT C''EST CALCULÉ:
SUM(amount) FROM client_transactions WHERE amount > 0 AND transaction_date >= période

🎯 UTILISATION:

Évaluation client:
- Deposits réguliers = Revenu stable ✅
- Deposits irréguliers = Risque plus élevé ⚠️

Analyse de patterns:
- Dépôts bi-hebdomadaires = Salarié
- Dépôts mensuels = Prestations gouvernement
- Dépôts aléatoires = Freelance/Cash business

📊 RATIOS IMPORTANTS:

1. Deposit Regularity:
Écart-type des dépôts / Moyenne
- < 0.3: Très régulier ✅
- 0.3-0.7: Modéré ⚠️
- > 0.7: Irrégulier 🔴

2. Deposit Frequency:
Nombre de dépôts par mois
- 2-4: Salaire bi-hebdomadaire/mensuel ✅
- 5-10: Multiple sources ⚠️
- 1: Source unique, risqué 🔶

📌 EXEMPLE:
$15,000 deposits en 90 jours = $5,000/mois moyens'
WHERE metric_key = 'total_deposits';

-- 16. Total Withdrawals
UPDATE metric_registry
SET description = 'Somme de tous les retraits et paiements sortants des comptes clients.

📊 CE QUE ÇA REPRÉSENTE:
- Tout l''argent sortant des comptes
- Dépenses mensuelles du client
- Utilisé pour calculer le cash flow net

💡 COMMENT C''EST CALCULÉ:
SUM(ABS(amount)) FROM client_transactions WHERE amount < 0 AND transaction_date >= période

🎯 ANALYSE:

Cash Flow Net:
Total Deposits − Total Withdrawals = Épargne/Déficit

Exemple:
- Deposits: $5,000
- Withdrawals: $4,800
- Net: +$200 (client épargne) ✅

Exemple 2:
- Deposits: $5,000
- Withdrawals: $5,200
- Net: −$200 (client en déficit) 🔴

📊 SPENDING RATIO:

Withdrawals ÷ Deposits:
- < 0.85 (85%): Excellent, épargne 15%+ ✅
- 0.85-0.95: Bon, épargne 5-15% ✅
- 0.95-1.00: Limite, épargne < 5% ⚠️
- > 1.00: Déficit, dépense plus que revenus 🔴

⚠️ PATTERNS INQUIÉTANTS:

- Withdrawals > Deposits régulièrement
- Transferts vers comptes inconnus
- Retraits ATM multiples (cash business?)
- Paiements e-transfer suspects

📌 EXEMPLE:
$4,800 withdrawals vs $5,000 deposits = 96% ratio (limite)'
WHERE metric_key = 'total_withdrawals';

-- 17. Transaction Volume
UPDATE metric_registry
SET description = 'Nombre total de transactions (dépôts + retraits) sur la période analysée.

📊 CE QUE ÇA REPRÉSENTE:
- Niveau d''activité bancaire
- Indicateur de comportement financier
- Détection d''anomalies de patterns

💡 COMMENT C''EST CALCULÉ:
COUNT(*) FROM client_transactions WHERE transaction_date >= période

📊 INTERPRÉTATION:

Faible volume (< 30 tx/mois):
- Prestations gouvernement uniquement
- Revenus fixes, peu de dépenses
- Ou compte peu utilisé (suspect) 🔶

Volume moyen (30-80 tx/mois):
- Usage normal, salarié typique
- Paiements réguliers de bills
- Pattern prévisible ✅

Volume élevé (> 80 tx/mois):
- Business owner / Freelance
- Lifestyle actif
- Vérifier si légitimes ⚠️

Volume très élevé (> 200 tx/mois):
- Potentiel blanchiment d''argent 🚨
- Business cash intensif
- Investigation requise

🎯 ANALYSE COMBINÉE:

Volume + Montants:
- 200 tx × $20 moy = $4,000 (normal)
- 10 tx × $500 moy = $5,000 (suspect)

📌 EXEMPLE:
120 transactions en 90 jours = 40 tx/mois (normal)'
WHERE metric_key = 'transaction_volume';

COMMIT;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT
  section_key,
  metric_key,
  label,
  CASE
    WHEN LENGTH(description) > 0 THEN '✅'
    ELSE '❌'
  END as has_description,
  LENGTH(description) as description_length
FROM metric_registry
ORDER BY section_key, display_order;
