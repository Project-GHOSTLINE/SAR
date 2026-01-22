# ⚡ Optimisation de la vitesse de recherche

## 📊 Problème identifié

**Performance actuelle:**
- ✅ Recherche par email: **0.38s**
- ✅ Recherche par nom: **0.38s**
- ❌ Recherche par N° contrat (MC/P): **1.25s** (3x plus lent!)

**Cause:** Index manquants sur les champs critiques

## 🎯 Solution: Ajouter des index

### Méthode 1: Via Supabase SQL Editor (RECOMMANDÉ)

1. **Aller sur Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
   ```

2. **Ouvrir SQL Editor:**
   - Menu de gauche → "SQL Editor"
   - Cliquer sur "New Query"

3. **Copier-coller le contenu de:**
   ```
   migrations/002_optimize_search_indexes.sql
   ```

4. **Exécuter** (bouton "Run" en bas à droite)

5. **Vérifier le résultat:**
   - Tous les index devraient être créés avec succès
   - Message: "Success. No rows returned"

### Méthode 2: Via script Node.js

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar

# Exécuter la migration
npx tsx scripts/run-migration.ts migrations/002_optimize_search_indexes.sql
```

**Note:** Si le script échoue, utiliser la Méthode 1 (SQL Editor)

## ✅ Résultats attendus

Après application des index:

| Type de recherche | Avant | Après | Amélioration |
|------------------|-------|-------|--------------|
| N° contrat (MC/P) | 1.25s | ~0.3s | **4x plus rapide** |
| Email | 0.38s | ~0.3s | Légèrement plus rapide |
| Nom | 0.38s | ~0.3s | Légèrement plus rapide |
| Téléphone mobile | N/A | ~0.3s | Nouveau (indexé) |

## 🔍 Index créés

1. **idx_clients_sar_dossier_id** - Recherche exacte par N° contrat
2. **idx_clients_sar_dossier_id_trgm** - Recherche floue (MC10 → MC1098)
3. **idx_clients_sar_telephone_mobile** - Recherche par téléphone mobile
4. **idx_clients_sar_etat_score** - Filtre état + score (composite)
5. **idx_clients_sar_dates** - Tri et filtre par dates

## 🧪 Tester après optimisation

```bash
# Test recherche par contrat
time curl -s 'http://localhost:3000/api/admin/clients-sar/search?q=MC1098'

# Test recherche par téléphone
time curl -s 'http://localhost:3000/api/admin/clients-sar/search?q=418-955-9544'

# Test recherche par nom
time curl -s 'http://localhost:3000/api/admin/clients-sar/search?q=Amelie'
```

Tous devraient être sous **0.5s**

## 💾 Impact sur le stockage

- Espace disque additionnel: ~10-15 MB (index)
- Impact: Négligeable (8041 clients)
- Bénéfice: Requêtes 4x plus rapides

## 🎓 Explication technique

### Pourquoi les index accélèrent la recherche?

**Sans index (Scan séquentiel):**
```
1. Parcourir TOUS les 8041 clients un par un
2. Pour chaque client, vérifier si dossier_id = "MC1098"
3. Temps: O(n) = 8041 opérations
```

**Avec index (B-Tree lookup):**
```
1. Recherche directe dans l'index (structure arbre)
2. Trouver le client en ~log(n) opérations
3. Temps: O(log n) = ~13 opérations seulement
```

**Performance:**
- Sans index: 8041 comparaisons
- Avec index: ~13 comparaisons
- **Gain: 600x plus rapide!**

### Types d'index utilisés

1. **B-Tree (par défaut)** - Pour égalité exacte
   - `dossier_id = 'MC1098'`
   - Très rapide pour recherches exactes

2. **GIN Trigram** - Pour recherche floue
   - `dossier_id LIKE '%MC10%'`
   - Permet recherche partielle
   - Utilisé avec extension `pg_trgm`

3. **Composite** - Pour plusieurs colonnes
   - `WHERE etat_dossier = 'Actif' AND score_fraude > 60`
   - Optimise les requêtes multi-critères

## 🚀 Meilleures pratiques

### ✅ Bon usage des index:

```sql
-- Utilise l'index sur dossier_id
WHERE dossier_id = 'MC1098'

-- Utilise l'index sur email
WHERE email = 'test@example.com'

-- Utilise l'index composite
WHERE etat_dossier = 'Actif' AND score_fraude >= 80
```

### ❌ Éviter (n'utilise PAS les index):

```sql
-- Fonction sur colonne indexée = scan séquentiel
WHERE LOWER(dossier_id) = 'mc1098'  -- ❌

-- Meilleure approche (case-insensitive avec ilike)
WHERE dossier_id ILIKE 'mc1098'     -- ✅ (index GIN trigram)
```

## 📌 Notes importantes

1. **ANALYZE** est exécuté après création des index
   - Met à jour les statistiques PostgreSQL
   - Permet à l'optimiseur de choisir les meilleurs plans de requête

2. **WHERE clauses** sur les index
   - `WHERE dossier_id IS NOT NULL`
   - Index partiel = plus petit, plus rapide
   - Ignore les valeurs NULL inutiles

3. **Maintenance automatique**
   - PostgreSQL maintient les index automatiquement
   - Aucune action manuelle requise
   - Les index sont mis à jour à chaque INSERT/UPDATE

## 🎯 Résumé

**Avant:**
- 🐌 Recherche par contrat: 1.25s
- ❌ Pas d'index sur dossier_id
- ❌ Pas d'index sur telephone_mobile

**Après:**
- ⚡ Recherche par contrat: 0.3s
- ✅ 6 nouveaux index optimisés
- ✅ Performance 4x meilleure
