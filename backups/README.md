# 📦 Système de Backup - Solution Argent Rapide

Ce dossier contient tous les backups du système Solution Argent Rapide.

---

## 📋 Table des Matières

1. [Structure des Backups](#structure-des-backups)
2. [Utilisation du Script Automatisé](#utilisation-du-script-automatisé)
3. [Backups Manuels](#backups-manuels)
4. [Restauration](#restauration)
5. [Planning de Backup](#planning-de-backup)
6. [Stockage et Sécurité](#stockage-et-sécurité)

---

## 📁 Structure des Backups

Chaque backup est organisé par date dans un dossier `YYYY-MM-DD/`:

```
backups/
├── 2026-01-27/
│   ├── BACKUP_REPORT.md          # Rapport détaillé complet
│   ├── BACKUP_SUMMARY.txt        # Résumé rapide
│   ├── backup-script.sql         # Schéma de la base de données
│   ├── api-endpoints.txt         # Inventaire des API (161)
│   ├── admin-pages.txt           # Pages admin (27)
│   ├── public-pages.txt          # Pages publiques (15)
│   ├── components.txt            # Composants React
│   ├── migrations.txt            # Migrations DB
│   ├── documentation.txt         # Documentation
│   ├── dependencies.txt          # Dépendances npm
│   ├── git-info.txt              # Information Git
│   ├── env-template.txt          # Variables d'environnement (sanitisé)
│   ├── build-output.txt          # Résultat du build
│   ├── build-status.txt          # Status du build
│   ├── statistics.txt            # Statistiques du projet
│   └── inventory.sh              # Script d'inventaire (réutilisable)
├── 2026-01-27-backup.tar.gz      # Archive compressée
└── README.md                      # Ce fichier
```

---

## 🚀 Utilisation du Script Automatisé

### Exécution Manuelle

```bash
# Depuis la racine du projet
./scripts/backup-system.sh
```

### Ce que fait le script

1. **Git Backup**: Status, commits, branches, diff
2. **Inventaire**: APIs, pages, composants, migrations
3. **Dépendances**: package.json parsé
4. **Environnement**: Variables sanitisées
5. **Build**: Vérification que le projet compile
6. **Base de données**: Schéma SQL
7. **Statistiques**: Métriques du projet
8. **Archive**: Compression en .tar.gz
9. **Nettoyage**: Supprime backups > 28 jours

### Durée d'exécution

- **Normal**: 2-3 minutes
- **Première fois**: 3-5 minutes (build plus long)

---

## 📝 Backups Manuels

### Backup Rapide (Git seulement)

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
git add -A
git commit -m "Checkpoint avant modifications"
git push origin main
```

### Backup Base de Données

Via Supabase Dashboard:
1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet
3. Settings → Database → Backups
4. Cliquer "Create backup"

### Backup Manuel Complet

```bash
# 1. Créer dossier de backup
DATE=$(date +%Y-%m-%d)
mkdir -p backups/$DATE

# 2. Copier fichiers importants
cp -r src backups/$DATE/
cp -r supabase/migrations backups/$DATE/
cp package.json backups/$DATE/
cp .env.local backups/$DATE/env.backup  # ATTENTION: sensible!

# 3. Git info
git log --oneline -50 > backups/$DATE/git-commits.txt

# 4. Compresser
tar -czf backups/$DATE-manual.tar.gz backups/$DATE/
```

---

## 🔄 Restauration

### Restauration Complète

#### 1. Cloner le Repository

```bash
git clone git@github.com:votre-org/sar.git
cd sar

# Checkout vers le commit du backup
git checkout <commit-hash>  # Voir git-commits.txt
```

#### 2. Restaurer les Dépendances

```bash
npm install
```

#### 3. Restaurer les Variables d'Environnement

```bash
# Copier le template
cp backups/YYYY-MM-DD/env-template.txt .env.local

# IMPORTANT: Remplacer tous les ***REDACTED*** par les vraies valeurs
# Les valeurs sont dans le coffre-fort sécurisé ou .env.master
```

#### 4. Restaurer la Base de Données

**Via Supabase Dashboard**:
1. Aller sur SQL Editor
2. Coller le contenu de `backup-script.sql`
3. Exécuter les requêtes

**Via CLI** (si configuré):
```bash
supabase db reset
psql -h db.xxx.supabase.co -U postgres -d postgres < backups/YYYY-MM-DD/backup-script.sql
```

#### 5. Tester Localement

```bash
npm run dev
# Ouvrir http://localhost:3000
# Vérifier que tout fonctionne
```

#### 6. Déployer

```bash
# Via Vercel CLI
vercel --prod

# OU via GitHub (push to main)
git push origin main  # Auto-deploy si configuré
```

### Restauration Partielle

#### Restaurer un fichier spécifique

```bash
# Depuis un backup Git
git checkout <commit-hash> -- path/to/file.ts

# Depuis une archive
tar -xzf backups/2026-01-27-backup.tar.gz
cp backups/2026-01-27/path/to/file.ts src/path/to/file.ts
```

#### Restaurer une table spécifique

```sql
-- 1. Drop table existante (ATTENTION!)
DROP TABLE IF EXISTS table_name CASCADE;

-- 2. Copier la création de table depuis backup-script.sql
-- 3. Exécuter dans Supabase SQL Editor
```

---

## 📅 Planning de Backup

### Recommandé

| Fréquence | Type | Automatique | Rétention |
|-----------|------|-------------|-----------|
| **Quotidien** | Git commits | Oui (développement) | Permanent |
| **Hebdomadaire** | Backup complet | **À configurer** | 4 semaines |
| **Mensuel** | Archive externe | Manuel | 12 mois |
| **Avant deploy** | Snapshot | Manuel | Jusqu'au prochain deploy |
| **Avant modif DB** | Schema backup | Manuel | Permanent |

### Configuration Cron (Hebdomadaire)

Ajouter au crontab:

```bash
# Editer crontab
crontab -e

# Ajouter cette ligne (tous les lundis à 2h du matin)
0 2 * * 1 cd /Users/xunit/Desktop/📁\ Projets/sar && ./scripts/backup-system.sh >> backups/cron.log 2>&1
```

### Configuration Vercel Cron (Backup DB)

Créer `/api/cron/backup-db/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  // Vérifier auth cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Exporter schéma DB via Supabase API
  // Stocker dans S3 ou autre storage

  return NextResponse.json({ success: true })
}
```

Ajouter dans `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup-db",
      "schedule": "0 3 * * 1"
    }
  ]
}
```

---

## 🔒 Stockage et Sécurité

### Stockage Local

```
✅ Avantages:
- Rapide à accéder
- Pas de coût
- Contrôle total

❌ Inconvénients:
- Pas de protection contre perte de disque
- Pas de protection incendie/vol
- Limité par espace disque
```

**Recommandation**: Garder 4 semaines localement (configuré dans le script)

### Stockage Cloud (Recommandé)

#### Option 1: AWS S3

```bash
# Installer AWS CLI
brew install awscli

# Configurer
aws configure

# Upload backup
aws s3 cp backups/2026-01-27-backup.tar.gz s3://sar-backups/2026-01-27-backup.tar.gz

# Automatiser
cat >> scripts/backup-system.sh << 'EOF'
# Upload to S3
aws s3 cp "$BACKUP_DATE-backup.tar.gz" "s3://sar-backups/$BACKUP_DATE-backup.tar.gz"
EOF
```

#### Option 2: Dropbox

```bash
# Symlink backups folder à Dropbox
ln -s /Users/xunit/Desktop/📁\ Projets/sar/backups ~/Dropbox/SAR-Backups
```

#### Option 3: GitHub Releases

```bash
# Créer release avec backup attaché
gh release create "backup-$DATE" backups/$DATE-backup.tar.gz \
  --title "Backup $DATE" \
  --notes "Automated system backup"
```

### Sécurité des Backups

#### ⚠️ ATTENTION: Ne JAMAIS commiter

```bash
# .gitignore doit contenir:
.env*
backups/*.tar.gz
backups/*/env-template.txt  # Contient structure mais pas valeurs
*.backup
```

#### ✅ Chiffrement Recommandé

```bash
# Chiffrer archive avant upload
openssl enc -aes-256-cbc -salt \
  -in backups/$DATE-backup.tar.gz \
  -out backups/$DATE-backup.tar.gz.enc

# Déchiffrer
openssl enc -aes-256-cbc -d \
  -in backups/$DATE-backup.tar.gz.enc \
  -out backups/$DATE-backup.tar.gz
```

#### 🔑 Gestion des Secrets

**Les variables d'environnement ne sont PAS dans les backups Git!**

Stocker séparément:
1. **Coffre-fort Password Manager** (1Password, LastPass)
2. **Fichier .env.master** (encrypted, hors Git)
3. **Vercel Dashboard** (Environment Variables)
4. **Supabase Dashboard** (API keys)

---

## 🧪 Tester la Restauration

### Test de Restauration (Dry Run)

```bash
# 1. Créer dossier de test
mkdir -p ~/test-restore
cd ~/test-restore

# 2. Extraire backup
tar -xzf /path/to/backups/2026-01-27-backup.tar.gz

# 3. Vérifier contenu
ls -la 2026-01-27/
cat 2026-01-27/BACKUP_SUMMARY.txt

# 4. Suivre les étapes de restauration
# (sans overwrite le projet actuel)
```

### Vérification Post-Backup

```bash
# Vérifier que tous les fichiers critiques sont présents
./scripts/verify-backup.sh backups/2026-01-27

# Comparer avec backup précédent
diff -r backups/2026-01-20 backups/2026-01-27 | grep "Only in"
```

---

## 📞 Support

### En cas de problème

1. **Backup échoue**: Vérifier les logs dans `backups/cron.log`
2. **Restauration échoue**: Vérifier les variables d'environnement
3. **Build échoue**: Vérifier `build-output.txt` pour les erreurs
4. **DB ne restaure pas**: Vérifier version PostgreSQL compatible

### Contacts

- **Documentation complète**: `BACKUP_REPORT.md`
- **Script de backup**: `scripts/backup-system.sh`
- **Système**: Next.js 14 + Supabase + Vercel

---

## 📊 Historique des Backups

| Date | Commit | Taille | Notes |
|------|--------|--------|-------|
| 2026-01-27 | 29b99ea | 12 MB | Unified Client Metrics feature |

---

**Dernière mise à jour**: 2026-01-27
**Prochain backup recommandé**: 2026-02-03
