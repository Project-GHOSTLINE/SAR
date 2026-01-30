# 🚀 Guide de Déploiement - Améliorations Système de Signature

## 📋 Résumé des Changements

### ✅ Bugs Critiques Corrigés
- Email admin configurable via variable d'environnement
- Tracking complet des statuts d'envoi d'email
- Validation stricte des signatures (format, taille, complétude)
- Validation des positions de champs (limites, chevauchements)
- Limite de taille pour les PDFs (50 MB max)

### ✅ Nouvelles Fonctionnalités
- Prévisualisation des templates avec modal détaillée
- API et UI de révocation de contrats
- Pagination des contrats (20 par page)

### ✅ Sécurité Renforcée
- Rate limiting sur les endpoints de signature
- Validation stricte des emails (RFC 5322)
- Sanitization XSS des inputs
- Validation des longueurs de champs

### ✅ Optimisations Performance
- Rendu PDF optimisé avec memoization
- 5 index composites en base de données

---

## 🔧 Étape 1 : Variables d'Environnement

Ajouter dans votre fichier `.env` (ou configuration Vercel) :

```bash
# Email Configuration
FROM_EMAIL=SAR <noreply@solutionargentrapide.ca>
ADMIN_SIGNATURE_EMAIL=anthony@solutionargentrapide.ca

# Vérifier que ces variables existent déjà
NEXT_PUBLIC_SUPABASE_URL=<your-url>
SUPABASE_SERVICE_KEY=<your-service-key>
RESEND_API_KEY=<your-resend-key>
```

### Configuration dans Vercel
```bash
vercel env add FROM_EMAIL
# Entrer: SAR <noreply@solutionargentrapide.ca>

vercel env add ADMIN_SIGNATURE_EMAIL
# Entrer: anthony@solutionargentrapide.ca
```

---

## 🗄️ Étape 2 : Migrations Base de Données

### Option A : Via Supabase CLI (Recommandé)

```bash
# Se connecter à Supabase
supabase link --project-ref <your-project-ref>

# Appliquer les migrations
supabase db push

# Vérifier que les migrations sont appliquées
supabase migration list
```

### Option B : Via Dashboard Supabase

1. Aller sur https://app.supabase.com
2. Sélectionner votre projet
3. Aller dans "SQL Editor"
4. Exécuter les fichiers dans l'ordre :

#### Migration 1 : Email Tracking
```sql
-- Copier le contenu de supabase/migrations/*_add_email_tracking.sql
-- et exécuter dans SQL Editor
```

#### Migration 2 : Index Composites
```sql
-- Copier le contenu de supabase/migrations/*_add_composite_indexes.sql
-- et exécuter dans SQL Editor
```

### Option C : Via psql

```bash
# Se connecter à votre base Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Exécuter les migrations
\i supabase/migrations/20260129105911_add_email_tracking.sql
\i supabase/migrations/20260129105911_add_composite_indexes.sql

# Vérifier les tables
\dt signature_documents
\d signature_documents
```

---

## 🧪 Étape 3 : Tests

### 1. Tester la création de contrat

```bash
# Démarrer le serveur de dev
npm run dev

# Ouvrir http://localhost:3000/admin/contrats-clients
# Cliquer sur "Créer un contrat"
# Remplir le formulaire et vérifier :
```

✅ Validation des longueurs de champs
✅ Compteurs de caractères affichés
✅ Validation email stricte
✅ Limite de taille PDF (essayer un fichier > 50 MB)
✅ Validation des positions de champs

### 2. Tester le tracking d'email

```bash
# Créer un contrat
# Vérifier dans la liste des contrats :
```

✅ Badge "Email envoyé" avec coche verte
✅ Si échec : "Email non envoyé" avec icône d'alerte

### 3. Tester la révocation

```bash
# Dans la liste des contrats non signés
# Cliquer sur l'icône "Interdiction" (Ban)
# Confirmer la révocation
```

✅ Statut passe à "Révoqué"
✅ Le lien de signature ne fonctionne plus
✅ Le bouton de révocation disparaît

### 4. Tester la pagination

```bash
# Si vous avez plus de 20 contrats
```

✅ Navigation entre les pages
✅ Affichage "Page X sur Y"
✅ Stats globales maintenues

### 5. Tester le rate limiting

```bash
# Ouvrir un lien de signature
# Rafraîchir la page 15 fois rapidement
```

✅ Erreur 429 "Trop de requêtes" après 10 requêtes
✅ Header "Retry-After" présent

### 6. Tester la preview de template

```bash
# Aller sur /admin/contrats-signature
# Cliquer sur "Voir" sur un template
```

✅ Modal s'ouvre avec détails complets
✅ Champs groupés par page
✅ Positions et dimensions affichées

---

## 📦 Étape 4 : Build et Déploiement

### Build Local

```bash
# Installer les dépendances
npm install

# Build de production
npm run build

# Tester le build
npm start
```

### Déploiement Vercel

```bash
# Commit des changements
git add .
git commit -m "feat: Complete signature system improvements

✅ Critical Fixes:
- Configurable admin email
- Email delivery tracking
- Signature validation
- Field position validation
- PDF size limits

✅ New Features:
- Template preview modal
- Contract revocation API + UI
- Pagination (20 items/page)

✅ Security:
- Rate limiting (10/min, 5/hour)
- Strict email validation (RFC 5322)
- XSS sanitization
- Field length validation

✅ Performance:
- Optimized PDF rendering (memoization)
- Composite database indexes"

# Push vers main
git push origin main

# Vercel déploiera automatiquement
```

---

## ✅ Étape 5 : Vérification Post-Déploiement

### Checklist de Production

1. **Variables d'environnement**
   ```bash
   # Vérifier dans Vercel Dashboard > Settings > Environment Variables
   ```
   - [ ] `FROM_EMAIL` configuré
   - [ ] `ADMIN_SIGNATURE_EMAIL` configuré
   - [ ] `SUPABASE_SERVICE_KEY` configuré
   - [ ] `RESEND_API_KEY` configuré

2. **Migrations appliquées**
   ```sql
   -- Dans Supabase SQL Editor
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'signature_documents'
   AND column_name IN ('email_status', 'email_sent_at', 'email_error');

   -- Devrait retourner 3 lignes
   ```
   - [ ] Colonnes email_tracking présentes
   - [ ] Index composites créés

3. **Fonctionnalités**
   - [ ] Création de contrat fonctionne
   - [ ] Email envoyé avec succès
   - [ ] Statut email visible dans l'admin
   - [ ] Révocation fonctionne
   - [ ] Pagination s'affiche (si > 20 contrats)
   - [ ] Preview de template fonctionne
   - [ ] Rate limiting actif
   - [ ] Client peut signer normalement

4. **Performance**
   ```sql
   -- Vérifier les index
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'signature_documents';
   ```
   - [ ] Au moins 8 index présents
   - [ ] Queries rapides (< 100ms)

---

## 🔍 Dépannage

### Problème : Migrations échouent

**Solution** : Vérifier les permissions
```sql
-- Donner les permissions au service role
GRANT ALL ON signature_documents TO service_role;
GRANT ALL ON signature_audit_logs TO service_role;
```

### Problème : Email non envoyé

**Solution** : Vérifier la configuration Resend
```bash
# Test manuel
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer <RESEND_API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "SAR <noreply@solutionargentrapide.ca>",
    "to": ["test@example.com"],
    "subject": "Test",
    "text": "Test email"
  }'
```

### Problème : Rate limiting trop strict

**Solution** : Ajuster les limites dans `src/lib/rate-limit.ts`
```typescript
// Pour GET /sign/[id]
maxRequests: 20,  // Au lieu de 10
windowMs: 60 * 1000

// Pour POST /sign/[id]/submit
maxRequests: 10,  // Au lieu de 5
windowMs: 60 * 60 * 1000
```

### Problème : PDF ne s'affiche pas

**Solution** : Vérifier PDF.js
```bash
ls -la public/pdf.js/
# Devrait contenir pdf.worker.min.js
```

---

## 📊 Métriques à Surveiller

Après déploiement, surveiller dans Vercel Analytics :

1. **Taux d'erreur API**
   - `/api/admin/contrats-clients` (< 1%)
   - `/api/sign/[id]` (< 2%)
   - `/api/sign/[id]/submit` (< 3%)

2. **Temps de réponse**
   - Création contrat : < 2s
   - Chargement liste : < 500ms
   - Signature submit : < 3s

3. **Rate limiting**
   - Nombre de 429 errors/jour
   - Si trop élevé : augmenter les limites

---

## 📞 Support

En cas de problème :

1. Vérifier les logs Vercel : `vercel logs`
2. Vérifier les logs Supabase : Dashboard > Logs
3. Vérifier Resend : https://resend.com/emails

---

## 🎉 Conclusion

Une fois ces étapes complétées, votre système de signature électronique est :

✅ **Sécurisé** : Validation stricte, rate limiting, sanitization
✅ **Performant** : Index optimisés, rendu PDF memoizé
✅ **Robuste** : Gestion d'erreurs, tracking d'email, révocation
✅ **Production-ready** : Testé et validé

Bon déploiement! 🚀
