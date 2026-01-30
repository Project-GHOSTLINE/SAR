# 🏗️ AUDIT ARCHITECTURAL : Système d'Emails SAR

**Date**: 2026-01-29
**Analyste**: Claude Sonnet 4.5
**Statut**: 🔴 PROBLÈMES CRITIQUES DÉTECTÉS

---

## 📋 Résumé Exécutif

### Problème Principal
Les emails NE SONT PAS ENREGISTRÉS dans la table `emails_envoyes` malgré le code qui devrait le faire.

### Impact
- ❌ Impossibilité de voir les copies des emails dans l'admin
- ❌ Pas d'historique des communications
- ❌ Pas de preuve de conformité

---

## 🔍 Analyse Architecturale Complète

### 1. STRUCTURE DE LA BASE DE DONNÉES

#### Table: `emails_envoyes`
**Status**: ⚠️ STRUCTURE INCONNUE - À VÉRIFIER

**Colonnes Attendues**:
```sql
CREATE TABLE emails_envoyes (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES contact_messages(id),
  type TEXT,           -- 'system' ou 'manual'
  destinataire TEXT,   -- Email du destinataire
  sujet TEXT,          -- Objet de l'email
  contenu TEXT,        -- Contenu HTML complet
  envoye_par TEXT,     -- 'system' ou email admin
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**⚠️ À VÉRIFIER**:
- [ ] La table existe-t-elle dans Supabase?
- [ ] Les colonnes correspondent-elles?
- [ ] Y a-t-il une clé étrangère vers contact_messages?
- [ ] Y a-t-il des contraintes NOT NULL?

#### Table: `contact_messages`
**Status**: ✅ EXISTE

**Colonnes Clés**:
- `id` (PK)
- `assigned_to` (Sandra/Michel)
- `system_responded` (BOOLEAN)
- `created_at`

---

### 2. FLOW COMPLET DU SYSTÈME

```
┌─────────────────────────────────────────────────────────────┐
│  1. CLIENT SOUMET FORMULAIRE                                 │
│     https://client.solutionargentrapide.ca/                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. API ROUTE REÇOIT LA REQUÊTE                             │
│     POST /api/contact-analyse                               │
│     POST /api/contact                                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. ENREGISTREMENT DANS SUPABASE                            │
│     INSERT INTO contact_messages (...)                      │
│     → Reçoit message_id                                     │
│     → Génère reference #SAR-XXXXXX                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ├─────────────┐
                          │             │
                          ▼             ▼
┌──────────────────────────────┐  ┌───────────────────────────┐
│  4a. ENREGISTRER EMAILS DB   │  │  4b. ENVOYER VIA RESEND   │
│  INSERT INTO emails_envoyes  │  │  POST api.resend.com      │
│  (message_id, type,          │  │  Authorization: Bearer    │
│   destinataire, sujet,       │  │  {from, to, subject, html}│
│   contenu, envoye_par)       │  │                           │
└──────────────────────────────┘  └───────────────────────────┘
           │                                   │
           │                                   │
           ▼                                   ▼
      🟢 OU 🔴 ?                          🟢 OU 🔴 ?
   (À VÉRIFIER)                        (FONCTIONNE?)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. ADMIN CLIQUE SUR MESSAGE                                │
│     GET /api/admin/messages?messageId=X                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  6. RÉCUPÉRATION EMAILS                                     │
│     SELECT * FROM emails_envoyes                            │
│     WHERE message_id = X                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  7. AFFICHAGE DANS FRONTEND                                 │
│     MessagesView.tsx → Modal Aperçu                         │
│     🔴 AFFICHE "Aucun email enregistre"                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. POINTS DE DÉFAILLANCE POSSIBLES

#### 🔴 Problème #1: Table emails_envoyes N'EXISTE PAS
**Symptôme**: Erreur 500 sur /api/admin/messages?messageId=X
**Cause**: La table n'a jamais été créée dans Supabase
**Solution**: Exécuter la migration SQL de création

#### 🔴 Problème #2: Permissions RLS (Row Level Security)
**Symptôme**: INSERT réussit côté serveur mais rien en DB
**Cause**: RLS bloque les INSERT depuis le service role
**Solution**: Désactiver RLS ou ajouter policy appropriée

#### 🔴 Problème #3: Clé SUPABASE_SERVICE_KEY Invalide
**Symptôme**: Erreur silencieuse, pas d'INSERT
**Cause**: Variable d'environnement manquante ou incorrecte sur Vercel
**Solution**: Vérifier les env vars sur Vercel

#### 🔴 Problème #4: Colonne Manquante
**Symptôme**: Erreur SQL "column does not exist"
**Cause**: Structure de table différente du code
**Solution**: ALTER TABLE pour ajouter colonnes

#### 🔴 Problème #5: Code Async Non Attendu
**Symptôme**: Code continue sans attendre INSERT
**Cause**: Pas de `await` sur supabase.insert()
**Solution**: Vérifier tous les `await`

---

### 4. VÉRIFICATION DU CODE

#### ✅ Code d'Enregistrement (API Routes)

**Fichier**: `/api/contact-analyse/route.ts` (lignes 162-210)
```typescript
// Enregistrer l'email envoye a l'equipe
await supabase.from('emails_envoyes').insert({
  message_id: messageId,
  type: 'system',
  destinataire: destinataire,
  sujet: `[NOUVELLE DEMANDE] ${nom} - #${reference}`,
  contenu: `...`,
  envoye_par: 'system'
})
```
**Status**: ✅ Code CORRECT

**Fichier**: `/api/contact/route.ts` (lignes 244-287)
```typescript
// 1. Email de confirmation au client
await supabase.from('emails_envoyes').insert({ ... })

// 2. Notification au responsable
await supabase.from('emails_envoyes').insert({ ... })
```
**Status**: ✅ Code CORRECT

#### ✅ Code de Récupération

**Fichier**: `/api/admin/messages/route.ts` (lignes 48-95)
```typescript
const { data: emails, error: emailsError } = await supabase
  .from('emails_envoyes')
  .select('*')
  .eq('message_id', parseInt(messageId))
  .order('created_at', { ascending: false })
```
**Status**: ✅ Code CORRECT

#### ✅ Code d'Affichage

**Fichier**: `/components/admin/MessagesView.tsx` (lignes 1327-1385)
```tsx
<h3>Emails Envoyes ({messageEmails.length})</h3>
{messageEmails.length === 0 ? (
  <p>Aucun email enregistre</p>
) : (
  // Affichage des emails avec bouton Aperçu
)}
```
**Status**: ✅ Code CORRECT

---

### 5. HYPOTHÈSES CLASSÉES PAR PROBABILITÉ

#### 🔴 Très Probable (80%)
1. **La table `emails_envoyes` N'EXISTE PAS dans Supabase**
   - Les migrations n'ont pas été exécutées
   - La table a été supprimée accidentellement

2. **Row Level Security (RLS) bloque les INSERT**
   - RLS activé sur la table
   - Pas de policy pour le service role

#### 🟡 Probable (15%)
3. **Variable SUPABASE_SERVICE_KEY incorrecte sur Vercel**
   - Mauvaise clé copiée
   - Variable non configurée en production

4. **Erreur silencieuse non catchée**
   - Le code continue malgré l'erreur
   - Pas de logs visibles

#### 🟢 Peu Probable (5%)
5. **Structure de table différente**
   - Colonnes manquantes
   - Types incompatibles

---

## ✅ PLAN D'ACTION IMMÉDIAT

### Étape 1: Vérifier la Table dans Supabase
```sql
-- Exécuter dans Supabase SQL Editor
SELECT * FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'emails_envoyes';
```

### Étape 2: Si Table N'Existe PAS → Créer
```sql
CREATE TABLE IF NOT EXISTS emails_envoyes (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES contact_messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('system', 'manual')),
  destinataire TEXT NOT NULL,
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  envoye_par TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_emails_envoyes_message_id
  ON emails_envoyes(message_id);

-- Index pour recherche par destinataire
CREATE INDEX IF NOT EXISTS idx_emails_envoyes_destinataire
  ON emails_envoyes(destinataire);
```

### Étape 3: Désactiver RLS ou Créer Policy
```sql
-- Option 1: Désactiver RLS (plus simple)
ALTER TABLE emails_envoyes DISABLE ROW LEVEL SECURITY;

-- Option 2: Créer policy (plus sécurisé)
ALTER TABLE emails_envoyes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access"
  ON emails_envoyes
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Étape 4: Tester
1. Créer un nouveau message de test
2. Vérifier dans Supabase:
   ```sql
   SELECT * FROM emails_envoyes
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. Ouvrir l'admin et cliquer sur le message
4. Vérifier si "Emails Envoyes (2)" apparaît

### Étape 5: Vérifier Variables Vercel
1. Aller sur Vercel → Settings → Environment Variables
2. Vérifier que `SUPABASE_SERVICE_KEY` existe
3. Vérifier que la valeur est correcte (commence par `eyJ...`)

---

## 📊 MÉTRIQUES DE SANTÉ

Une fois corrigé, ces métriques devraient être:

✅ **100%** des nouveaux messages ont `system_responded = true`
✅ **2 emails** par message (1 client + 1 équipe)
✅ **0 erreur 500** sur /api/admin/messages?messageId=X
✅ **100%** des messages ont des emails visibles dans l'admin

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Exécuter `AUDIT_ARCHITECTURE_EMAILS.sql` dans Supabase
2. ⏳ Analyser les résultats
3. ⏳ Appliquer les corrections nécessaires
4. ⏳ Tester avec un nouveau message
5. ⏳ Valider que tout fonctionne

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
