# ⚡ Installation Rapide - Système de Mémoire

## 🎯 Étape 1: Créer les Tables dans Supabase (5 minutes)

### Action à faire MAINTENANT:

1. **Ouvrir Supabase SQL Editor:**

   👉 https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new

2. **Copier le SQL:**

   Ouvrir le fichier: `database/claude-memory-system.sql`

   Ou copier directement depuis le terminal:
   ```bash
   cat database/claude-memory-system.sql | pbcopy
   ```

3. **Coller et Exécuter:**

   - Coller le SQL dans l'éditeur Supabase
   - Cliquer sur le bouton **"Run"** (▶️) en bas à droite
   - Attendre ~10 secondes

4. **Vérifier:**

   Les tables suivantes doivent apparaître dans le schéma:
   - ✅ `claude_memory`
   - ✅ `claude_sessions`
   - ✅ `claude_docs_read`
   - ✅ `claude_code_insights`
   - ✅ `claude_questions`

---

## 🎯 Étape 2: Relancer le Script (30 secondes)

```bash
cd "/Users/xunit/Desktop/📁 Projets/sar"
node scripts/setup-complete.mjs
```

**Sortie attendue:**
```
✅ Tables trouvées!
✅ project_info/project_overview
✅ stack/tech_stack
✅ deployment/workflow
✅ urls/production_urls
✅ security/credentials_location

📊 Statistiques:
🧠 Mémoires stockées: 5
📝 Sessions: 1
```

---

## 🎯 Étape 3: Ouvrir la Page de Test

### Option A: Local (si tu veux tester en local)

```bash
# Démarrer le serveur
npm run dev

# Puis ouvrir:
# http://localhost:3000/test-memory.html
```

### Option B: Production (recommandé)

1. **Push sur Vercel:**
   ```bash
   git add .
   git commit -m "feat: Ajout système de mémoire longue durée"
   git push
   ```

2. **Attendre le déploiement** (~30 secondes)

3. **Ouvrir:**
   ```
   https://admin.solutionargentrapide.ca/test-memory.html
   ```

---

## 🧪 Tests Disponibles sur la Page

La page de test permet de:

1. **📊 Charger le Contexte Complet** - Voir toutes les mémoires
2. **💻 Recall: Stack Technique** - Voir la stack du projet
3. **🚀 Recall: Déploiement** - Voir le workflow
4. **🌐 Recall: URLs Production** - Voir les URLs
5. **💾 Test: Stocker une Mémoire** - Tester l'écriture
6. **📈 Rafraîchir Stats** - Mise à jour en temps réel

---

## ❓ Troubleshooting

### Erreur: "Could not find the table"

➡️ **Solution:** Les tables n'ont pas été créées dans Supabase. Retourner à l'Étape 1.

### Erreur: "Variables d'environnement manquantes"

➡️ **Solution:** Vérifier `.env.local`:
```bash
cat .env.local | grep SUPABASE
```

### La page /test-memory.html ne charge pas

➡️ **Solution:**
1. Vérifier que le fichier existe: `ls public/test-memory.html`
2. Redémarrer le serveur: `npm run dev`
3. Ou pusher sur Vercel pour tester en production

---

## ✅ Une fois terminé

Tu pourras utiliser la mémoire dans les conversations avec Claude:

```
User: "Quelle est notre stack technique?"

Claude:
[Charge automatiquement depuis /api/memory/recall]

Notre stack est:
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: Next.js API Routes
- Database: Supabase (PostgreSQL)
- Services: VoPay, Flinks, Inverite, Vercel
```

**C'est parti! 🚀**
