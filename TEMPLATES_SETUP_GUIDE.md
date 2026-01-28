# 📋 Guide: Système de Templates de Signature SAR

## 🎯 Statut actuel

### ✅ Ce qui est créé:

1. **Table Supabase**
   - Fichier SQL: `supabase-signature-templates.sql`
   - **⚠️  IMPORTANT: À exécuter manuellement dans Supabase Dashboard**

2. **API Routes** ✅ COMPLÈTE
   - `GET /api/admin/signature-templates` - Liste tous les templates
   - `POST /api/admin/signature-templates` - Créer un template
   - `GET /api/admin/signature-templates/[id]` - Obtenir un template
   - `PATCH /api/admin/signature-templates/[id]` - Modifier un template
   - `DELETE /api/admin/signature-templates/[id]` - Supprimer un template

3. **Page Admin** ✅ COMPLÈTE
   - `/admin/contrats-signature` - Galerie de templates
   - Stats, filtres par catégorie
   - Bouton pour ouvrir l'outil de coordonnées
   - Ajouté dans AdminNav

4. **Outil de coordonnées** ✅ EXISTE
   - Fichier: `/Users/xunit/Desktop/Margiil Files/outil-coordonnees-pdf.html`
   - Permet de cliquer sur un PDF pour générer les coordonnées
   - Intégré avec API SAR (envoie directement vers `/api/admin/signature-templates`)

---

## 🔧 Étapes d'installation

### 1. Créer la table Supabase (OBLIGATOIRE)

```bash
# Option A: Via Dashboard Supabase (RECOMMANDÉ)
# 1. Va sur https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
# 2. Clique sur "SQL Editor"
# 3. Copie le contenu de: supabase-signature-templates.sql
# 4. Exécute le script

# Option B: Via psql (si installé)
PGPASSWORD="Solution%99" psql \
  -h db.dllyzfuqjzuhvshrlmuq.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f supabase-signature-templates.sql
```

### 2. Redémarrer le serveur Next.js

```bash
cd "/Users/xunit/Desktop/📁 Projets/sar"

# Tuer le serveur actuel
lsof -ti:3000 | xargs kill -9

# Redémarrer
npm run dev
```

### 3. Vérifier que tout fonctionne

```bash
# Test 1: API Templates
curl http://localhost:3000/api/admin/signature-templates

# Devrait retourner:
# {"success":true,"templates":[...],"total":1}

# Test 2: Page Admin
open http://localhost:3000/admin/contrats-signature
```

---

## 📖 Utilisation

### Créer un template

#### Méthode 1: Via l'outil de coordonnées (RECOMMANDÉ)

1. Ouvre `outil-coordonnees-pdf.html` depuis:
   ```
   /Users/xunit/Desktop/Margiil Files/outil-coordonnees-pdf.html
   ```

2. Charge ton PDF de contrat (ex: `Contrat-de-pret-SAR.pdf`)

3. Sélectionne le type: **Signature** ou **Initiales**

4. Clique exactement sur les zones `[SIGNATURE]` et `[INIT]` dans le PDF

5. Ajuste la largeur/hauteur si nécessaire:
   - Signature: 180 x 40 (par défaut)
   - Initiales: 80 x 25 (par défaut)

6. Clique sur "➕ Ajouter ce champ" pour chaque zone

7. Répète pour toutes les pages du contrat

8. Clique sur "💾 Sauvegarder dans SAR"

9. Entre le nom du template (ex: "Contrat SAR Standard")

10. Le template apparaît automatiquement dans `/admin/contrats-signature`!

#### Méthode 2: Via API directe

```bash
curl -X POST http://localhost:3000/api/admin/signature-templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Template",
    "description": "Description optionnelle",
    "category": "loan",
    "signature_fields": [
      {
        "id": "sig_1",
        "type": "signature",
        "label": "Signature du client",
        "page": 1,
        "x": 100,
        "y": 650,
        "width": 180,
        "height": 40
      },
      {
        "id": "init_1",
        "type": "initials",
        "label": "Initiales",
        "page": 1,
        "x": 400,
        "y": 650,
        "width": 80,
        "height": 25
      }
    ]
  }'
```

### Utiliser un template

#### Option A: Depuis la page Templates

1. Va sur http://localhost:3000/admin/contrats-signature

2. Clique sur "Voir" sur le template voulu

3. Les champs seront automatiquement pré-remplis

#### Option B: Depuis CreateContractModal (À venir - Task #4)

1. Ouvre le modal de création de contrat

2. Sélectionne un template dans la liste déroulante

3. Les champs de signature sont automatiquement positionnés

4. Tu peux ajuster si nécessaire

5. Upload ton PDF et envoie!

---

## 🗂️ Structure des fichiers

```
📁 Projets/sar/
├── supabase-signature-templates.sql          # Script SQL pour créer la table
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── admin/
│   │   │       └── signature-templates/
│   │   │           ├── route.ts              # GET, POST templates
│   │   │           └── [id]/
│   │   │               └── route.ts          # GET, PATCH, DELETE template
│   │   └── admin/
│   │       └── contrats-signature/
│   │           └── page.tsx                  # Page galerie templates
│   └── components/
│       └── admin/
│           ├── AdminNav.tsx                  # Navigation (mise à jour)
│           └── CreateContractModal.tsx       # Modal création (à modifier)
│
📁 Margiil Files/
└── outil-coordonnees-pdf.html                # Outil pour créer templates
```

---

## 🔍 Format des données

### Template

```typescript
interface Template {
  id: string                      // UUID généré automatiquement
  name: string                    // "Contrat SAR Standard"
  description: string | null      // Description optionnelle
  category: string                // 'loan', 'lease', 'agreement', 'general', 'other'
  signature_fields: SignatureField[]
  is_active: boolean              // true/false
  usage_count: number             // Nombre d'utilisations
  created_at: string              // Timestamp
  updated_at: string              // Timestamp
}
```

### SignatureField

```typescript
interface SignatureField {
  id: string                      // "sig_1", "init_1"
  type: 'signature' | 'initials'  // Type de champ
  label: string                   // "Signature du client"
  page: number                    // Numéro de page (1-indexed)
  x: number                       // Position X (pixels depuis le coin sup. gauche)
  y: number                       // Position Y (pixels depuis le coin sup. gauche)
  width: number                   // Largeur du champ (pixels)
  height: number                  // Hauteur du champ (pixels)
}
```

### Catégories disponibles

- `loan` - Contrats de prêt
- `lease` - Contrats de location
- `agreement` - Accords/Ententes
- `general` - Général
- `other` - Autre

---

## ⚠️ Notes importantes

### Coordonnées PDF

- **Origine**: Coin supérieur gauche (0, 0)
- **Axe X**: Horizontal, de gauche à droite
- **Axe Y**: Vertical, de haut en bas
- **Unité**: Pixels (à 72 DPI standard)

### Tailles recommandées

- **Signature complète**: 180 x 40 pixels
- **Initiales**: 80 x 25 pixels
- **Ajuster selon le PDF** si nécessaire

### Système de pages

- Les pages commencent à 1 (pas 0!)
- Pour un contrat de 3 pages: page 1, 2, 3

---

## 🧪 Tests

### Test 1: Créer un template via l'outil

```bash
# 1. Ouvrir l'outil
open "/Users/xunit/Desktop/Margiil Files/outil-coordonnees-pdf.html"

# 2. Charger un PDF de test
# 3. Cliquer sur les zones
# 4. Sauvegarder

# 5. Vérifier que le template existe
curl http://localhost:3000/api/admin/signature-templates | jq '.templates[] | .name'
```

### Test 2: Utiliser un template pour créer un contrat

```bash
# 1. Récupérer un template
TEMPLATE_ID=$(curl -s http://localhost:3000/api/admin/signature-templates | jq -r '.templates[0].id')

# 2. Récupérer les champs
curl -s "http://localhost:3000/api/admin/signature-templates/$TEMPLATE_ID" | jq '.template.signature_fields'

# 3. Créer un contrat avec ces champs
# (Via l'interface ou API /api/admin/contrats-clients)
```

---

## 🚀 Prochaines étapes

### Task #4: Intégration dans CreateContractModal

- [ ] Ajouter un sélecteur de template dans Step 1
- [ ] Charger automatiquement les champs depuis le template
- [ ] Permettre de modifier les champs après chargement
- [ ] Incrémenter le compteur `usage_count` du template

### Task #5: Tests complets

- [ ] Tester création template via outil
- [ ] Tester création contrat depuis template
- [ ] Vérifier flow de signature complet
- [ ] Valider les positions des signatures sur le PDF final

---

## 📞 Support

Si tu rencontres des problèmes:

1. **Table non créée**
   - Vérifie que le script SQL a été exécuté dans Supabase Dashboard
   - Vérifie les permissions RLS (Row Level Security)

2. **API 500 Error**
   - Vérifie les env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Regarde les logs du serveur Next.js

3. **L'outil ne sauvegarde pas**
   - Vérifie que le serveur Next.js tourne sur http://localhost:3000
   - Vérifie dans la console du navigateur pour voir les erreurs

---

**Dernière mise à jour:** 2026-01-28
**Système:** SAR - Solution Argent Rapide
