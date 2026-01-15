# 🚨 SYSTÈME DE RÈGLES CLAUDE - OBLIGATOIRE

**Créé:** 2026-01-14
**Objectif:** Claude DOIT TOUJOURS faire ces checks, automatiquement

---

## 🎯 PROBLÈME RÉSOLU

**Avant:**
- Claude oubliait de vérifier dépendances
- Erreurs répétitives (colonnes manquantes, mots réservés)
- Pas de système d'apprentissage

**Après:**
- ✅ Règles chargées automatiquement au démarrage
- ✅ Checks obligatoires AVANT chaque action
- ✅ Violations enregistrées pour apprentissage
- ✅ Système partagé entre tous les Claude

---

## 📋 RÈGLES OBLIGATOIRES

### 1. 🔴 CRITIQUE: Vérifier dépendances SQL

**AVANT d'écrire SQL:**
```
✅ Lister toutes les REFERENCES
✅ Vérifier que chaque table existe
✅ Vérifier que chaque colonne existe
✅ Si manquante → STOP
```

**Exemple:**
```sql
❌ MAL:
CREATE VIEW vw_clients WHERE client_id IS NOT NULL
-- client_id n'existe pas encore!

✅ BON:
1. ALTER TABLE ... ADD COLUMN client_id
2. CREATE VIEW vw_clients WHERE client_id IS NOT NULL
```

### 2. 🟠 HIGH: Mots réservés PostgreSQL

**Ne JAMAIS utiliser:**
- `timestamp`
- `user`
- `table`
- `order`
- `select`
- `group`

**Solution:** Préfixer
```sql
❌ MAL: timestamp timestamptz
✅ BON: msg_timestamp timestamptz
```

### 3. 🟠 HIGH: Vérifier blueprint

**Si blueprint existe:**
```
✅ Lire schéma AVANT d'écrire code
✅ Utiliser EXACTEMENT mêmes noms
✅ Ne PAS deviner
```

**Exemple:**
```
❌ MAL: Deviner "client_email"
✅ BON: Lire blueprint → voir "courriel"
```

### 4. 🔴 CRITIQUE: Lire avant écrire

**JAMAIS modifier fichier sans Read:**
```
✅ Read tool AVANT Write/Edit
✅ Comprendre structure actuelle
✅ Vérifier cohérence modification
```

### 5. 🟠 HIGH: Simulation mentale

**Avant exécution:**
```
✅ Ligne 1 marche?
✅ Ligne 10 dépend de quoi?
✅ Foreign keys vers quoi?
✅ Ordre logique?
```

---

## 🔧 INSTALLATION

### 1. Fichiers locaux (déjà créés)

```
~/.claude/rules.json ✅
~/.claude/hooks/pre-execution.sh ✅
~/.claude/hooks/startup.sh ✅
```

### 2. Tables Supabase

**Exécuter:**
```sql
database/migrations/restructure/002_create_claude_rules_system.sql
```

**Crée:**
- `claude_rules` (règles)
- `claude_rule_violations` (violations)
- `get_active_rules()` (fonction)
- `log_rule_violation()` (fonction)

### 3. Hook startup (déjà actif)

Au démarrage, Claude:
1. ✅ Lit `~/.claude/rules.json`
2. ✅ Charge règles depuis Supabase
3. ✅ Affiche règles critiques
4. ✅ Active checks automatiques

---

## 🎯 UTILISATION

### Pour Claude

**Au démarrage de chaque session:**
```javascript
// Auto-chargé
const rules = await loadRules();
// Règles actives en mémoire
```

**Avant chaque action:**
```javascript
// Avant SQL
if (action === 'sql_generation') {
  checkDependencies();
  checkReservedWords();
  verifyBlueprint();
}

// Avant fichier
if (action === 'file_modification') {
  ensureFileRead();
  checkBackup();
}
```

### Pour toi

**Voir règles actives:**
```sql
SELECT * FROM get_active_rules();
```

**Voir violations:**
```sql
SELECT
  r.rule_name,
  v.violated_at,
  v.context,
  v.error_message
FROM claude_rule_violations v
JOIN claude_rules r ON r.id = v.rule_id
ORDER BY v.violated_at DESC
LIMIT 20;
```

**Ajouter nouvelle règle:**
```sql
INSERT INTO claude_rules (
  rule_id,
  rule_name,
  category,
  description,
  priority,
  checks
) VALUES (
  'new_rule',
  'Nom règle',
  'before_code',
  'Description',
  'high',
  '["Check 1", "Check 2"]'::jsonb
);
```

---

## 📊 APPRENTISSAGE AUTOMATIQUE

### Quand Claude fait une erreur

**Auto-détection:**
```sql
-- Erreur "does not exist"
→ Auto-match avec règle "check_dependencies"
→ Violation enregistrée
→ Compteur incrémenté
```

**Exemple:**
```sql
-- Erreur détectée
ERROR: column "client_id" does not exist

-- Auto-logged
INSERT INTO claude_rule_violations (
  rule_id = 'check_dependencies',
  context = 'CREATE VIEW vw_orphan_records',
  error_message = 'column "client_id" does not exist'
);

-- Règle renforcée
UPDATE claude_rules
SET times_violated = times_violated + 1
WHERE rule_id = 'check_dependencies';
```

### Analytics

**Règles les plus violées:**
```sql
SELECT
  rule_name,
  times_violated,
  last_violated_at
FROM claude_rules
WHERE times_violated > 0
ORDER BY times_violated DESC;
```

**Patterns d'erreurs:**
```sql
SELECT
  r.rule_name,
  v.error_message,
  COUNT(*) as count
FROM claude_rule_violations v
JOIN claude_rules r ON r.id = v.rule_id
GROUP BY r.rule_name, v.error_message
ORDER BY count DESC;
```

---

## 🚀 WORKFLOW

### 1. Démarrage session

```
Claude démarre
  ↓
Lit ~/.claude/rules.json
  ↓
Charge règles depuis Supabase
  ↓
Affiche règles critiques
  ↓
Prêt à travailler (règles actives)
```

### 2. Avant d'écrire SQL

```
Claude va générer SQL
  ↓
CHECK: Dépendances?
  ↓
CHECK: Mots réservés?
  ↓
CHECK: Blueprint existe?
  ↓
Si TOUS OK → Génère SQL
Si NON → STOP + explique pourquoi
```

### 3. Erreur détectée

```
Erreur SQL
  ↓
Match pattern erreur
  ↓
Trouve règle correspondante
  ↓
Log violation
  ↓
Incrémente compteur
  ↓
Applique correction
  ↓
Apprend pour prochaine fois
```

---

## 💡 EXEMPLES CONCRETS

### Exemple 1: Génération SQL

**Sans règles:**
```sql
-- Claude génère directement
CREATE VIEW vw_test WHERE client_id IS NOT NULL;
-- ❌ Erreur: column does not exist
```

**Avec règles:**
```
Claude: "Je vais créer une vue..."
  ↓
CHECK: client_id existe?
  ↓
NON → STOP
  ↓
Claude: "❌ STOP - client_id n'existe pas encore.
         Il faut d'abord:
         1. ALTER TABLE ... ADD COLUMN client_id
         2. Puis créer la vue"
```

### Exemple 2: Modification fichier

**Sans règles:**
```
User: "Modifie LOGBOOK.md"
Claude: *écrit directement*
-- Peut casser structure
```

**Avec règles:**
```
User: "Modifie LOGBOOK.md"
  ↓
CHECK: Fichier lu?
  ↓
NON → STOP
  ↓
Claude: "Je vais d'abord lire le fichier..."
*Read tool*
Claude: "OK, j'ai compris la structure. Maintenant je modifie."
*Edit tool*
```

---

## 📈 MÉTRIQUES

**Tracking:**
```sql
-- Nombre de sessions sans violations
SELECT COUNT(DISTINCT session_id)
FROM claude_conversation_log
WHERE id NOT IN (SELECT session_id FROM claude_rule_violations);

-- Taux de compliance
SELECT
  100.0 * (
    SELECT COUNT(*) FROM claude_conversation_log
    WHERE id NOT IN (SELECT session_id FROM claude_rule_violations)
  ) / NULLIF(COUNT(*), 0) as compliance_rate
FROM claude_conversation_log;

-- Évolution dans le temps
SELECT
  DATE(session_date) as date,
  COUNT(DISTINCT l.id) as total_sessions,
  COUNT(DISTINCT v.session_id) as sessions_with_violations,
  100.0 * (COUNT(DISTINCT l.id) - COUNT(DISTINCT v.session_id)) / NULLIF(COUNT(DISTINCT l.id), 0) as compliance
FROM claude_conversation_log l
LEFT JOIN claude_rule_violations v ON v.session_id = l.id
GROUP BY DATE(session_date)
ORDER BY date DESC;
```

---

## 🎯 RÉSULTAT ATTENDU

**Avec ce système:**

✅ **100% des checks faits automatiquement**
✅ **0 erreur de dépendances**
✅ **0 mot réservé utilisé**
✅ **0 modification sans lecture**
✅ **Apprentissage automatique**
✅ **Métriques et analytics**
✅ **Partagé entre tous les Claude**

**Performance attendue:**
- Réduction 90%+ des erreurs répétitives
- Temps de debug réduit de 80%
- Qualité code augmentée
- Confiance utilisateur maximale

---

## 🔄 MISE À JOUR RÈGLES

**Ajouter règle depuis violation:**
```sql
-- Nouvelle erreur identifiée
-- Session 2026-01-15: Oublié de vérifier RLS

INSERT INTO claude_rules (
  rule_id,
  rule_name,
  category,
  description,
  priority,
  learned_from_session
) VALUES (
  'check_rls_policies',
  'Vérifier politiques RLS',
  'before_code',
  'Vérifier que RLS est activé sur tables sensibles',
  'high',
  (SELECT id FROM claude_conversation_log WHERE session_date = '2026-01-15' LIMIT 1)
);
```

**Désactiver règle:**
```sql
UPDATE claude_rules
SET enabled = false
WHERE rule_id = 'old_rule';
```

---

## 📞 COMMANDES RAPIDES

```sql
-- Voir règles actives
SELECT * FROM get_active_rules();

-- Règles critiques seulement
SELECT * FROM get_active_rules() WHERE priority = 'critical';

-- Violations aujourd'hui
SELECT * FROM claude_rule_violations WHERE violated_at >= CURRENT_DATE;

-- Logger violation manuellement
SELECT log_rule_violation('check_dependencies', session_id, 'Contexte erreur');
```

---

**🚀 SYSTÈME ACTIVÉ!**

Maintenant Claude ne peut plus oublier les checks critiques.
