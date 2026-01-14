# 🧠 Guide du Système de Mémoire Longue Durée de Claude

**Créé le**: 13 janvier 2026
**Version**: 1.0.0
**Status**: ✅ Prêt à l'emploi

---

## 🎯 Vue d'Ensemble

Ce système permet à Claude de:
- **Se souvenir** de tout ce qu'il lit et apprend sur le projet
- **Charger automatiquement** le contexte au début de chaque session
- **Stocker** les décisions techniques, patterns de code, et architecture
- **Éviter de relire** la même documentation plusieurs fois
- **Suivre** l'historique des sessions et modifications

---

## 📦 Ce qui a été créé

### 1. **Base de Données (Supabase)**

**Fichier SQL**: `database/claude-memory-system.sql`

**5 Tables créées**:
1. `claude_memory` - Mémoire principale (connaissances du projet)
2. `claude_sessions` - Historique des sessions de travail
3. `claude_docs_read` - Trace des documents lus
4. `claude_code_insights` - Insights sur le code
5. `claude_questions` - Questions en suspens

**3 Fonctions SQL**:
- `get_project_context()` - Obtenir le contexte complet
- `search_claude_memory()` - Rechercher dans la mémoire
- `refresh_webhook_stats()` - Rafraîchir les stats

---

### 2. **API Endpoints**

**5 Routes créées**:

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/memory/store` | POST | Stocker une nouvelle mémoire |
| `/api/memory/recall` | GET | Récupérer des mémoires |
| `/api/memory/context` | GET | Obtenir le contexte complet |
| `/api/memory/session` | POST/GET | Enregistrer/lire les sessions |
| `/api/memory/doc-read` | POST/GET | Enregistrer/vérifier les docs lus |

---

### 3. **Script d'Initialisation**

**Fichier**: `scripts/init-claude-memory.mjs`

Ce script:
- ✅ Lit tous les fichiers MD importants
- ✅ Stocke leur contenu dans la base de données
- ✅ Crée les mémoires essentielles (stack, services, architecture)
- ✅ Génère un résumé de chaque document
- ✅ Calcule des hash pour détecter les modifications

---

## 🚀 Installation (3 étapes)

### Étape 1: Créer les Tables dans Supabase

1. Ouvrir Supabase Dashboard: https://supabase.com/dashboard
2. Aller dans **SQL Editor**
3. Créer une nouvelle query
4. Copier le contenu de `database/claude-memory-system.sql`
5. Cliquer sur **Run** (▶️)

**Vérification**:
```sql
-- Vérifier que les tables sont créées
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'claude_%';

-- Devrait retourner: claude_memory, claude_sessions, claude_docs_read,
-- claude_code_insights, claude_questions
```

---

### Étape 2: Exécuter le Script d'Initialisation

```bash
cd "/Users/xunit/Desktop/📁 Projets/sar"

# Installer les dépendances si nécessaire
npm install dotenv

# Exécuter le script d'initialisation
node scripts/init-claude-memory.mjs
```

**Ce que fait le script**:
1. ✅ Lit les fichiers MD importants (SAR-README.md, ARCHITECTURE_OPTIMIZATION_PLAN.md, etc.)
2. ✅ Extrait les points clés et sections de chaque document
3. ✅ Stocke tout dans Supabase (table `claude_docs_read`)
4. ✅ Crée les mémoires essentielles (stack, services, URLs, etc.)
5. ✅ Enregistre la session d'initialisation

**Sortie attendue**:
```
🚀 Initialisation de la Mémoire de Claude

📁 Projet: sar
📍 Répertoire: /Users/xunit/Desktop/📁 Projets/sar

📚 Lecture des fichiers Markdown...

✅ Stocké: SAR-README.md (86 lignes, 2.1 KB)
✅ Stocké: ADMIN-DASHBOARD-IMPLEMENTATION.md (525 lignes, 17.3 KB)
✅ Stocké: ARCHITECTURE_OPTIMIZATION_PLAN.md (965 lignes, 32.5 KB)
...

✅ Documents stockés: 17
❌ Échecs: 0

🧠 Création des mémoires essentielles...

🧠 Mémoire: stack/tech_stack
🧠 Mémoire: deployment/workflow
🧠 Mémoire: urls/production_urls
...

✅ Mémoires essentielles créées

📝 Création de la session initiale...

✅ Session créée: abc-123-def

📊 Statistiques de la mémoire:

📚 Documents lus: 17
🧠 Mémoires stockées: 7
📝 Sessions: 1

✅ Initialisation terminée avec succès!
```

---

### Étape 3: Tester le Système

**Test 1: Vérifier le contexte**
```bash
# En local (si le serveur tourne)
curl "http://localhost:3000/api/memory/context?project=sar" \
  -H "Cookie: admin-session=YOUR_SESSION"

# Ou directement avec Supabase
```

**Test 2: Vérifier dans Supabase**
```sql
-- Voir les documents lus
SELECT file_name, lines_count, file_size, read_at
FROM claude_docs_read
WHERE project_name = 'sar'
ORDER BY read_at DESC;

-- Voir les mémoires
SELECT category, key, importance
FROM claude_memory
WHERE project_name = 'sar'
ORDER BY importance DESC;

-- Voir les sessions
SELECT session_date, summary
FROM claude_sessions
WHERE project_name = 'sar'
ORDER BY session_date DESC;
```

---

## 💡 Comment Claude Utilise cette Mémoire

### Au début de chaque session:

Claude peut appeler:
```javascript
const context = await fetch('/api/memory/context?project=sar');
```

Et obtenir:
```json
{
  "project": "sar",
  "top_memories": [
    {
      "category": "stack",
      "key": "tech_stack",
      "content": { "frontend": ["Next.js 14", ...], ... },
      "importance": 10
    },
    ...
  ],
  "recent_sessions": [
    {
      "date": "2026-01-13",
      "summary": "Initialisation du système de mémoire",
      "tasks_completed": [...]
    }
  ],
  "docs_count": 17,
  "insights_count": 0,
  "pending_questions": 0
}
```

### Pendant le travail:

Claude peut:

1. **Chercher des informations**:
```javascript
fetch('/api/memory/recall?project=sar&category=architecture&search=dashboard')
```

2. **Stocker de nouvelles connaissances**:
```javascript
fetch('/api/memory/store', {
  method: 'POST',
  body: JSON.stringify({
    project_name: 'sar',
    category: 'bug_fixes',
    key: 'auth_session_fix',
    content: { issue: '...', solution: '...' },
    context: 'Fixed session expiration bug',
    importance: 7,
    tags: ['auth', 'bug', 'session']
  })
})
```

3. **Vérifier si un document a été lu**:
```javascript
fetch('/api/memory/doc-read?project=sar&file_path=/path/to/file.md')
```

### À la fin de chaque session:

Claude enregistre:
```javascript
fetch('/api/memory/session', {
  method: 'POST',
  body: JSON.stringify({
    project_name: 'sar',
    summary: 'Added memory system',
    tasks_completed: ['Created tables', 'Created APIs', ...],
    learnings: ['Project uses Next.js 14', ...],
    next_steps: ['Test the system', ...],
    files_modified: ['database/claude-memory-system.sql', ...]
  })
})
```

---

## 🎯 Exemples d'Utilisation

### Exemple 1: Claude se souvient de la stack

```
User: Quel framework on utilise?

Claude:
[Appelle GET /api/memory/recall?project=sar&category=stack]

Le projet SAR utilise:
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: Next.js API Routes, Node.js
- Database: Supabase (PostgreSQL)
- Services: VoPay, Flinks, Inverite, Vercel

(Info récupérée depuis la mémoire stockée le 13 janvier 2026)
```

---

### Exemple 2: Claude évite de relire

```
User: Lis le fichier ARCHITECTURE_OPTIMIZATION_PLAN.md

Claude:
[Appelle GET /api/memory/doc-read?project=sar&file_path=.../ARCHITECTURE_OPTIMIZATION_PLAN.md]

J'ai déjà lu ce document le 13 janvier 2026. Voici un résumé:

Plan d'optimisation maximale pour SAR Admin:
- Phase 1: Optimisation DB (impact 60-70%)
  - Indexes stratégiques
  - Materialized views
  - Fonctions SQL optimisées
- Phase 2: Optimisation API (impact 20-30%)
  - Cache mémoire
  - Requêtes parallèles
  ...

Veux-tu que je relise le fichier complet ou tu as une question spécifique?
```

---

### Exemple 3: Claude stocke un nouveau pattern

```
# Pendant le développement, Claude découvre un pattern

Claude:
[Appelle POST /api/memory/store]

Je viens de remarquer que tu utilises un pattern spécifique pour les API routes:
- Validation auth en premier
- Cache avec withCache()
- Requêtes parallèles avec Promise.all()
- Gestion d'erreurs cohérente

Je stocke ce pattern dans ma mémoire pour l'utiliser dans les futures APIs.
```

---

## 📊 Structure de la Mémoire

### Catégories Utilisées

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| `stack` | Technologies utilisées | Next.js, TypeScript, Supabase |
| `architecture` | Structure du projet | Dashboard admin, API routes |
| `features` | Fonctionnalités | Dashboard, IBV, Webhooks |
| `deployment` | Déploiement | Workflow Git/Vercel |
| `security` | Sécurité | Credentials, auth |
| `services` | Services externes | VoPay, Flinks, Inverite |
| `database` | Base de données | Tables, schemas |
| `apis` | APIs et endpoints | Routes disponibles |
| `bugs` | Bugs résolus | Historique des fixes |
| `decisions` | Décisions techniques | Choix d'architecture |
| `conventions` | Conventions de code | Naming, style |

---

## 🔄 Maintenance

### Rafraîchir la mémoire

Relancer le script d'initialisation pour mettre à jour:
```bash
node scripts/init-claude-memory.mjs
```

Le script:
- ✅ Détecte les fichiers modifiés (via hash)
- ✅ Met à jour seulement ce qui a changé
- ✅ Préserve l'historique

---

### Nettoyer la mémoire

```sql
-- Supprimer toutes les mémoires d'un projet
DELETE FROM claude_memory WHERE project_name = 'sar';
DELETE FROM claude_docs_read WHERE project_name = 'sar';
DELETE FROM claude_sessions WHERE project_name = 'sar';

-- Puis relancer l'initialisation
```

---

### Exporter la mémoire

```sql
-- Export JSON complet
SELECT json_build_object(
  'memories', (SELECT json_agg(row_to_json(t)) FROM claude_memory t WHERE project_name = 'sar'),
  'docs', (SELECT json_agg(row_to_json(t)) FROM claude_docs_read t WHERE project_name = 'sar'),
  'sessions', (SELECT json_agg(row_to_json(t)) FROM claude_sessions t WHERE project_name = 'sar')
) as backup;
```

---

## 🎓 Best Practices

### Pour Claude:

1. **TOUJOURS charger le contexte** au début d'une session
2. **Vérifier si un document a été lu** avant de le relire
3. **Stocker les nouvelles connaissances** dès qu'elles sont découvertes
4. **Enregistrer chaque session** avec un résumé des changements
5. **Utiliser des tags** pour faciliter la recherche

### Pour l'utilisateur:

1. **Relancer l'initialisation** après des changements majeurs de documentation
2. **Vérifier les stats** régulièrement avec `SELECT * FROM claude_project_summary`
3. **Nettoyer** les vieilles sessions si nécessaire (> 6 mois)

---

## 🚨 Troubleshooting

### Problème: Les tables ne se créent pas

**Solution**:
```sql
-- Vérifier les permissions
SELECT current_user;

-- Vérifier que l'extension uuid est installée
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

### Problème: Le script d'init échoue

**Solution**:
```bash
# Vérifier les variables d'environnement
cat .env.local | grep SUPABASE

# Vérifier que dotenv est installé
npm install dotenv

# Lancer avec plus de logs
node --trace-warnings scripts/init-claude-memory.mjs
```

---

### Problème: Les APIs retournent 401

**Solution**:
```javascript
// Vérifier que le cookie admin-session est présent
// Les APIs nécessitent l'authentification admin
```

---

## 🎯 Prochaines Étapes

1. ✅ **Tester le système** avec quelques requêtes
2. ✅ **Utiliser dans une conversation** avec Claude
3. ✅ **Ajouter plus de mémoires** au fur et à mesure
4. ✅ **Monitorer** l'utilisation et l'efficacité

---

## 📞 Support

Si tu rencontres des problèmes:
1. Vérifier les logs: `SELECT * FROM claude_sessions ORDER BY session_date DESC LIMIT 10`
2. Tester les APIs directement
3. Vérifier que les tables existent dans Supabase

---

**Créé le**: 13 janvier 2026
**Par**: Claude Sonnet 4.5
**Version**: 1.0.0
**Status**: ✅ Opérationnel
