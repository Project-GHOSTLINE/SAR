# 🧠 SYSTÈME CENTRAL DE MÉMOIRE CLAUDE
## Guide Complet

**Créé:** 2026-01-14 21:55
**Version:** 1.0.0

---

## 🎯 OBJECTIF

**Enregistrer CHAQUE mot écrit dans CHAQUE conversation avec Claude.**

Permet de:
- ✅ Rechercher n'importe quoi dit il y a 2 semaines
- ✅ Retrouver décisions passées
- ✅ Voir l'évolution d'un projet
- ✅ Partager contexte entre tous les Claude
- ✅ Accumuler connaissances

---

## 📊 ARCHITECTURE

### 5 Tables Principales

```
claude_projects → Projets disponibles (SAR, MVP_V1, etc.)
    ↓
claude_conversation_log → Sessions de travail
    ↓
    ├─ claude_messages → Chaque message échangé
    ├─ claude_files_touched → Fichiers modifiés
    ├─ claude_decisions → Décisions importantes
    └─ claude_knowledge → Base de connaissance
```

---

## 🚀 INSTALLATION

### Étape 1: Créer les tables

```bash
# Dans Supabase SQL Editor
https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql

# Exécuter dans l'ordre:
1. database/migrations/restructure/000_create_conversation_log.sql
2. database/migrations/restructure/001_create_memory_system.sql
```

### Étape 2: Peupler avec conversation actuelle

```bash
# Exécuter:
database/migrations/restructure/000_insert_session_2026_01_14.sql
```

### Étape 3: Ajouter projets

```sql
-- Projet SAR
INSERT INTO claude_projects (
  project_name,
  project_slug,
  project_path,
  description,
  objectif_principal,
  technologies,
  status,
  priorite
) VALUES (
  'SAR - Solution Argent Rapide',
  'sar',
  '/Users/xunit/Desktop/📁 Projets/sar',
  'Plateforme de prêts avec système Titan et intégration VoPay',
  'Créer système "Dossier Médical Client" avec restructuration DB complète',
  '["Next.js", "TypeScript", "Supabase", "PostgreSQL", "VoPay", "Margill"]'::jsonb,
  'actif',
  10
);

-- Projet MVP_V1
INSERT INTO claude_projects (
  project_name,
  project_slug,
  project_path,
  description,
  technologies,
  status,
  priorite
) VALUES (
  'MVP V1',
  'mvp-v1',
  '/Users/xunit/Desktop/MVP_V1',
  'Premier MVP de la plateforme',
  '["Next.js", "Supabase"]'::jsonb,
  'pause',
  5
);
```

---

## 🔍 RECHERCHE

### Rechercher dans l'historique complet

```sql
-- Rechercher "phase 1" dans toutes les conversations
SELECT * FROM search_claude_history('phase 1');

-- Rechercher dans un projet spécifique
SELECT * FROM search_claude_history(
  'backup',
  (SELECT id FROM claude_projects WHERE project_slug = 'sar')
);

-- Rechercher dans une période
SELECT * FROM search_claude_history(
  'migration',
  NULL,
  '2026-01-14 00:00:00+00',
  '2026-01-14 23:59:59+00'
);
```

### Rechercher décisions importantes

```sql
-- Toutes les décisions critiques
SELECT * FROM get_important_decisions(NULL, 'critical');

-- Décisions haute priorité du projet SAR
SELECT * FROM get_important_decisions(
  (SELECT id FROM claude_projects WHERE project_slug = 'sar'),
  'high'
);
```

### Rechercher fichiers modifiés

```sql
-- Tous les fichiers touchés aujourd'hui
SELECT
  f.file_path,
  f.action,
  f.timestamp,
  s.titre as session_title
FROM claude_files_touched f
JOIN claude_conversation_log s ON s.id = f.session_id
WHERE f.timestamp >= CURRENT_DATE
ORDER BY f.timestamp DESC;
```

### Rechercher par tag

```sql
-- Tous les messages taggés 'git'
SELECT
  timestamp,
  author,
  content
FROM claude_messages
WHERE 'git' = ANY(tags)
ORDER BY timestamp DESC
LIMIT 20;
```

---

## 📝 ENREGISTREMENT AUTOMATIQUE

### Hook Claude (déjà installé)

Au démarrage, Claude lit automatiquement:
- LOGBOOK.md
- STATUS-BOARD.md
- Liste des projets
- Branche Git active

**Fichier:** `~/.claude/hooks/startup.sh`

### Enregistrer message

```sql
-- Enregistrer un message user
INSERT INTO claude_messages (
  session_id,
  project_id,
  author,
  content,
  tags
) VALUES (
  (SELECT id FROM claude_conversation_log WHERE session_date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM claude_projects WHERE project_slug = 'sar'),
  'user',
  'Contenu du message',
  ARRAY['git', 'database']
);

-- Enregistrer un message Claude
INSERT INTO claude_messages (
  session_id,
  project_id,
  author,
  content,
  tool_used,
  file_path
) VALUES (
  (SELECT id FROM claude_conversation_log WHERE session_date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM claude_projects WHERE project_slug = 'sar'),
  'claude',
  'J''ai créé le fichier...',
  'Write',
  '/path/to/file.ts'
);
```

### Enregistrer décision

```sql
INSERT INTO claude_decisions (
  session_id,
  project_id,
  decision,
  rationale,
  impact_level,
  reversible
) VALUES (
  (SELECT id FROM claude_conversation_log WHERE session_date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM claude_projects WHERE project_slug = 'sar'),
  'Exécuter Phase 1 maintenant',
  'Architecture validée par ChatGPT, safe pour production',
  'high',
  false
);
```

### Enregistrer connaissance

```sql
INSERT INTO claude_knowledge (
  project_id,
  category,
  title,
  content,
  applicable_to,
  tags
) VALUES (
  (SELECT id FROM claude_projects WHERE project_slug = 'sar'),
  'gotcha',
  'Supabase connection string format',
  'Le format de connection string Supabase nécessite un format spécial. Utiliser PostgREST API si connection directe échoue.',
  ARRAY['all-projects'],
  ARRAY['supabase', 'database', 'connection']
);
```

---

## 📊 RAPPORTS & ANALYTICS

### Sessions par projet

```sql
SELECT
  p.project_name,
  COUNT(DISTINCT s.id) as sessions_count,
  MAX(s.session_date) as last_session,
  SUM(s.session_duration_minutes) as total_minutes
FROM claude_conversation_log s
JOIN claude_projects p ON p.id = (
  SELECT project_id FROM claude_messages WHERE session_id = s.id LIMIT 1
)
GROUP BY p.project_name
ORDER BY total_minutes DESC;
```

### Fichiers les plus modifiés

```sql
SELECT
  file_path,
  COUNT(*) as times_modified,
  SUM(lines_added) as total_lines_added,
  MAX(timestamp) as last_modified
FROM claude_files_touched
WHERE action IN ('created', 'modified')
GROUP BY file_path
ORDER BY times_modified DESC
LIMIT 20;
```

### Timeline complète d'un projet

```sql
SELECT
  s.session_date,
  s.titre,
  s.travail_accompli,
  s.git_commits,
  COUNT(m.id) as messages_count
FROM claude_conversation_log s
LEFT JOIN claude_messages m ON m.session_id = s.id
WHERE s.git_branch = 'feat/db-restructure-dossier-client'
GROUP BY s.id
ORDER BY s.session_date DESC;
```

---

## 🔐 ACCÈS & LIMITES

### Configurer accès projet

```sql
-- Projet en lecture seule
UPDATE claude_projects
SET
  acces_niveau = 'readonly',
  acces_limites = '{
    "commands": ["Read", "Grep", "Glob"],
    "paths": ["/Users/xunit/Desktop/📁 Projets/sar"]
  }'::jsonb
WHERE project_slug = 'archived-project';

-- Projet avec restrictions
UPDATE claude_projects
SET
  acces_niveau = 'restricted',
  acces_limites = '{
    "commands": ["Read", "Grep", "Glob", "Bash"],
    "paths": ["/Users/xunit/Desktop/📁 Projets/sar"],
    "forbidden_paths": ["/Users/xunit/Desktop/📁 Projets/sar/.env.local"],
    "max_files_per_session": 50
  }'::jsonb
WHERE project_slug = 'production-project';
```

---

## 🎨 INTERFACE (TODO)

### API Endpoints à créer

```typescript
// GET /api/memory/search
// POST body: { query: string, project?: string, dateFrom?: string }

// GET /api/memory/session/:sessionId
// Retourne session complète avec tous les messages

// GET /api/memory/projects
// Liste des projets disponibles

// POST /api/memory/log
// Enregistre message/décision/fichier automatiquement
```

### Dashboard (TODO)

Interface web pour:
- 🔍 Recherche full-text dans l'historique
- 📊 Timeline visualisée
- 📁 Explorateur de fichiers modifiés
- 🎯 Vue décisions importantes
- 📚 Base de connaissance

---

## 📋 EXEMPLE D'UTILISATION

### Cas 1: "Qu'est-ce qu'on a dit sur le backup il y a 2 semaines?"

```sql
SELECT
  timestamp,
  author,
  content
FROM search_claude_history('backup')
WHERE timestamp >= NOW() - INTERVAL '2 weeks'
ORDER BY timestamp DESC;
```

### Cas 2: "Toutes les décisions sur la Phase 1"

```sql
SELECT
  timestamp,
  decision,
  rationale
FROM claude_decisions
WHERE decision ILIKE '%phase 1%'
ORDER BY timestamp DESC;
```

### Cas 3: "Qu'est-ce qui a été fait sur le fichier LOGBOOK.md?"

```sql
SELECT
  timestamp,
  action,
  old_content,
  new_content
FROM claude_files_touched
WHERE file_path LIKE '%LOGBOOK.md'
ORDER BY timestamp DESC;
```

---

## 🚨 MAINTENANCE

### Nettoyage ancien contenu (> 6 mois)

```sql
-- Archive (ne pas supprimer, juste marquer)
UPDATE claude_conversation_log
SET statut = 'archive'
WHERE session_date < NOW() - INTERVAL '6 months';
```

### Réindexer full-text search

```sql
REINDEX INDEX claude_messages_search_idx;
REINDEX INDEX claude_knowledge_search_idx;
```

### Statistiques base

```sql
SELECT
  'conversations' as table_name,
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('claude_conversation_log')) as size
FROM claude_conversation_log
UNION ALL
SELECT
  'messages',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('claude_messages'))
FROM claude_messages
UNION ALL
SELECT
  'files_touched',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('claude_files_touched'))
FROM claude_files_touched;
```

---

## ⚡ NEXT STEPS

1. ✅ Tables créées
2. ✅ Fonctions recherche installées
3. ⏳ Peupler avec conversation actuelle
4. ⏳ Créer API endpoints
5. ⏳ Builder dashboard web
6. ⏳ Auto-logging depuis Claude CLI

---

## 📞 COMMANDES RAPIDES

```sql
-- Recherche rapide
SELECT * FROM search_claude_history('votre recherche');

-- Décisions importantes
SELECT * FROM get_important_decisions();

-- Session d'aujourd'hui
SELECT * FROM claude_conversation_log WHERE session_date = CURRENT_DATE;

-- Messages d'aujourd'hui
SELECT author, content FROM claude_messages
WHERE timestamp >= CURRENT_DATE
ORDER BY timestamp;
```

---

**Système prêt! 🚀**

Maintenant CHAQUE mot est enregistré et recherchable.
