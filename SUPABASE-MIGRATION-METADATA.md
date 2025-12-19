# 🔧 Migration Supabase - Ajouter Métriques Client

**Date:** 2025-12-19
**Table:** `contact_messages`
**Objectif:** Capturer métriques de connexion client (IP, device, timezone, etc.)

---

## 📋 ÉTAPES D'INSTALLATION

### 1. Ouvrir Supabase SQL Editor

```
https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new
```

### 2. Copier-coller le SQL ci-dessous

### 3. Cliquer sur "RUN" ou Ctrl+Enter

---

## 📝 SCRIPT SQL

```sql
-- Ajouter colonnes pour métriques de connexion client
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
ADD COLUMN IF NOT EXISTS client_device VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_browser VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_os VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS client_screen_resolution VARCHAR(50),
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- Index pour recherches rapides par IP
CREATE INDEX IF NOT EXISTS idx_contact_messages_client_ip ON contact_messages(client_ip);
```

---

## ✅ VÉRIFICATION

Après avoir exécuté le script, vérifiez que les colonnes ont été ajoutées:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contact_messages'
AND (column_name LIKE 'client_%' OR column_name LIKE 'utm_%' OR column_name = 'referrer')
ORDER BY column_name;
```

**Résultat attendu:** 12 colonnes

---

## 📊 COLONNES AJOUTÉES

| Colonne | Type | Description |
|---------|------|-------------|
| `client_ip` | VARCHAR(45) | Adresse IP (IPv4/IPv6) |
| `client_user_agent` | TEXT | User-Agent complet |
| `client_device` | VARCHAR(100) | Desktop/Mobile/Tablet |
| `client_browser` | VARCHAR(100) | Chrome, Firefox, Safari, etc. |
| `client_os` | VARCHAR(100) | Windows, macOS, Android, iOS |
| `client_timezone` | VARCHAR(100) | Ex: America/Toronto |
| `client_language` | VARCHAR(10) | Ex: fr-CA |
| `client_screen_resolution` | VARCHAR(50) | Ex: 1920x1080 |
| `referrer` | TEXT | URL de provenance |
| `utm_source` | VARCHAR(100) | Source campagne |
| `utm_medium` | VARCHAR(100) | Medium campagne |
| `utm_campaign` | VARCHAR(100) | Nom campagne |

---

## 🔄 APRÈS MIGRATION

Une fois les colonnes ajoutées, le code capturera automatiquement:
- ✅ Adresse IP du client
- ✅ Type d'appareil (Desktop/Mobile/Tablet)
- ✅ Navigateur et OS
- ✅ Fuseau horaire
- ✅ Résolution d'écran
- ✅ Page de provenance
- ✅ Paramètres UTM (tracking campagnes)

Ces données s'afficheront dans l'admin dashboard sous "Métriques de Connexion".

---

**Status:** ⏳ EN ATTENTE D'EXÉCUTION MANUELLE
