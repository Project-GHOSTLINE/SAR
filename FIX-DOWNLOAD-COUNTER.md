# Fix: Compteur de Téléchargements Non Fonctionnel

**Date:** 22 janvier 2026
**Statut:** ⚠️ **ACTION REQUISE**

---

## 🔍 Diagnostic du Problème

### Symptôme
Le compteur de téléchargements sur https://admin.solutionargentrapide.ca/admin/downloads affiche toujours **0 téléchargements**, même après avoir téléchargé l'extension.

### Cause Identifiée
Le système de tracking des téléchargements **n'a pas encore été créé dans la base de données Supabase**.

### Ce qui Fonctionne Déjà ✅
- ✅ La route de téléchargement `/api/download/[filename]/route.ts` est configurée
- ✅ Le code pour logger les téléchargements est en place (ligne 76-90)
- ✅ La route des stats `/api/admin/downloads/stats/route.ts` est prête
- ✅ La page d'administration affiche l'interface correctement

### Ce qui Manque ❌
- ❌ Table `download_logs` (pour stocker les téléchargements)
- ❌ Vue `download_stats` (pour calculer les statistiques)
- ❌ Fonction `get_download_stats()` (pour récupérer les stats d'un fichier)

---

## 🛠️ Solution: Appliquer la Migration SQL

### Option 1: Via Supabase Dashboard (Recommandé)

1. **Ouvrir le SQL Editor de Supabase:**
   - Aller sur: https://supabase.com/dashboard
   - Sélectionner votre projet SAR
   - Cliquer sur "SQL Editor" dans le menu de gauche

2. **Créer une nouvelle requête:**
   - Cliquer sur "New Query"

3. **Copier-coller le SQL suivant:**

```sql
-- ============================================================================
-- SYSTÈME DE TRACKING DES TÉLÉCHARGEMENTS
-- ============================================================================

BEGIN;

-- 1. Table des téléchargements
CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations sur le fichier
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_version TEXT,

  -- Informations utilisateur
  user_email TEXT,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,

  -- Informations device
  device_type TEXT,
  browser TEXT,
  os TEXT,

  -- Métadonnées
  downloaded_at TIMESTAMP DEFAULT NOW(),
  download_success BOOLEAN DEFAULT true,
  referrer TEXT,

  CONSTRAINT download_logs_file_name_check CHECK (char_length(file_name) > 0)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_download_logs_file_name ON download_logs(file_name);
CREATE INDEX IF NOT EXISTS idx_download_logs_downloaded_at ON download_logs(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_logs_user_email ON download_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_download_logs_file_type ON download_logs(file_type);

-- 2. Vue des statistiques par fichier
CREATE OR REPLACE VIEW download_stats AS
SELECT
  file_name,
  file_type,
  file_version,
  COUNT(*) as total_downloads,
  COUNT(DISTINCT user_email) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(downloaded_at) as last_download,
  MIN(downloaded_at) as first_download,
  COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as downloads_24h,
  COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_7d,
  COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_30d
FROM download_logs
WHERE download_success = true
GROUP BY file_name, file_type, file_version
ORDER BY total_downloads DESC;

-- 3. Vue des téléchargements récents
CREATE OR REPLACE VIEW recent_downloads AS
SELECT
  id,
  file_name,
  file_type,
  user_email,
  device_type,
  browser,
  downloaded_at
FROM download_logs
ORDER BY downloaded_at DESC
LIMIT 100;

-- 4. Fonction pour obtenir les stats d'un fichier spécifique
CREATE OR REPLACE FUNCTION get_download_stats(p_file_name TEXT)
RETURNS TABLE (
  total_downloads BIGINT,
  unique_users BIGINT,
  unique_ips BIGINT,
  downloads_today BIGINT,
  downloads_this_week BIGINT,
  downloads_this_month BIGINT,
  last_download TIMESTAMP,
  first_download TIMESTAMP,
  avg_downloads_per_day NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_downloads,
    COUNT(DISTINCT user_email)::BIGINT as unique_users,
    COUNT(DISTINCT ip_address)::BIGINT as unique_ips,
    COUNT(CASE WHEN downloaded_at >= CURRENT_DATE THEN 1 END)::BIGINT as downloads_today,
    COUNT(CASE WHEN downloaded_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::BIGINT as downloads_this_week,
    COUNT(CASE WHEN downloaded_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::BIGINT as downloads_this_month,
    MAX(downloaded_at) as last_download,
    MIN(downloaded_at) as first_download,
    CASE
      WHEN MIN(downloaded_at) IS NOT NULL THEN
        COUNT(*)::NUMERIC / GREATEST(1, EXTRACT(DAY FROM NOW() - MIN(downloaded_at)))
      ELSE 0
    END as avg_downloads_per_day
  FROM download_logs
  WHERE file_name = p_file_name
    AND download_success = true;
END;
$$;

COMMIT;

-- Vérification
SELECT 'download_logs table created successfully' as status;
SELECT * FROM download_stats LIMIT 5;
```

4. **Exécuter la requête:**
   - Cliquer sur "Run" ou appuyer sur `Ctrl+Enter` (Windows/Linux) ou `Cmd+Enter` (Mac)

5. **Vérifier le succès:**
   - Vous devriez voir le message: `download_logs table created successfully`

---

### Option 2: Via le Fichier de Migration

Le fichier SQL complet est disponible dans le projet à:
```
/Users/xunit/Desktop/📁 Projets/sar/database/create_download_tracking.sql
```

Ou dans les migrations Supabase à:
```
/Users/xunit/Desktop/📁 Projets/sar/supabase/migrations/20260122000002_add_download_tracking.sql
```

---

## ✅ Vérification du Fix

### 1. Vérifier que la table existe

Dans Supabase SQL Editor, exécuter:
```sql
SELECT COUNT(*) FROM download_logs;
```

**Résultat attendu:** `0` (table vide mais existante)

### 2. Vérifier que la vue existe

```sql
SELECT * FROM download_stats LIMIT 5;
```

**Résultat attendu:** Aucune ligne (table vide)

### 3. Vérifier que la fonction existe

```sql
SELECT * FROM get_download_stats('ibv-crawler-v2.16.zip');
```

**Résultat attendu:** Une ligne avec des zéros
```
total_downloads: 0
unique_users: 0
unique_ips: 0
downloads_today: 0
downloads_this_week: 0
downloads_this_month: 0
last_download: null
first_download: null
avg_downloads_per_day: 0
```

### 4. Tester le tracking en téléchargeant l'extension

1. **Aller sur:** https://admin.solutionargentrapide.ca/admin/downloads
2. **Cliquer sur:** "Télécharger l'extension Chrome"
3. **Rafraîchir la page** (F5)
4. **Vérifier que le compteur affiche:** `1 téléchargement`

### 5. Vérifier dans la base de données

```sql
SELECT * FROM download_logs ORDER BY downloaded_at DESC LIMIT 10;
```

**Résultat attendu:** Une ou plusieurs lignes avec vos téléchargements

---

## 📊 Données Trackées

Après l'application du SQL, le système trackera automatiquement:

### Informations Fichier
- ✅ Nom du fichier (`ibv-crawler-v2.16.zip`)
- ✅ Type de fichier (`extension`)
- ✅ Version (`2.16.0`)

### Informations Utilisateur
- ✅ Email de l'utilisateur (si connecté)
- ✅ Adresse IP
- ✅ User Agent complet

### Informations Device
- ✅ Type d'appareil (desktop/mobile/tablet)
- ✅ Navigateur (Chrome/Firefox/Safari/Edge)
- ✅ Système d'exploitation (Windows/macOS/Linux)

### Métadonnées
- ✅ Date et heure du téléchargement
- ✅ Succès du téléchargement
- ✅ Page de référence

---

## 📈 Statistiques Disponibles

Une fois le système en place, vous pourrez voir:

### Stats Globales (Header de la carte)
- Total de téléchargements
- Utilisateurs uniques
- Téléchargements aujourd'hui
- Téléchargements cette semaine

### Stats Détaillées (Cartes colorées)
- 🔵 **Total:** Tous les téléchargements depuis le début
- 🟢 **Aujourd'hui:** Téléchargements de la journée
- 🟣 **Cette semaine:** 7 derniers jours
- 🟠 **Moyenne/jour:** Depuis le premier téléchargement

---

## 🚀 Résultat Final

Après avoir appliqué la migration SQL:

✅ **Les compteurs fonctionneront immédiatement**
✅ **Chaque téléchargement sera tracké automatiquement**
✅ **Les statistiques seront mises à jour en temps réel**
✅ **Vous pourrez voir qui télécharge, quand, et depuis quel appareil**

---

## 🔧 Troubleshooting

### Problème: "Permission denied for table download_logs"

**Solution:** Assurez-vous d'utiliser le service role key dans `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Problème: "Function get_download_stats does not exist"

**Solution:** La fonction n'a pas été créée. Réexécutez le SQL complet depuis le début.

### Problème: Les compteurs affichent toujours 0 après un téléchargement

**Vérifications:**
1. Vérifier que le téléchargement a été loggé:
   ```sql
   SELECT * FROM download_logs ORDER BY downloaded_at DESC LIMIT 1;
   ```

2. Vérifier que le nom du fichier correspond:
   ```sql
   SELECT * FROM download_logs WHERE file_name LIKE '%ibv-crawler%';
   ```

3. Vérifier la vue:
   ```sql
   SELECT * FROM download_stats;
   ```

---

## 📝 Notes Importantes

1. **Le système est rétroactif:** Si vous aviez déjà tenté des téléchargements avant, ils ne seront pas comptés car ils n'ont pas été loggés.

2. **Privacy:** Les adresses IP sont stockées mais uniquement pour compter les utilisateurs uniques. Elles ne sont pas exposées dans l'interface.

3. **Performance:** Les index sont créés automatiquement pour garantir des requêtes rapides même avec des milliers de téléchargements.

4. **Auto-nettoyage:** Considérez d'ajouter une politique de rétention plus tard si nécessaire (ex: garder 1 an de logs).

---

**Une fois le SQL appliqué, le compteur fonctionnera immédiatement!** 🎉
