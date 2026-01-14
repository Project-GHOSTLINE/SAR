# 🚀 RÉSUMÉ RAPIDE - BLUEPRINT SAR

**Pour l'autre Claude:** Voici toutes les infos nécessaires pour créer le blueprint "dossiers clients".

---

## 📊 BASE DE DONNÉES ACTUELLE

### Projet Supabase
- **ID:** `dllyzfuqjzuhvshrlmuq`
- **URL:** `https://dllyzfuqjzuhvshrlmuq.supabase.co`
- **26 tables existantes** (voir détails dans SAR-STRUCTURE-COMPLETE.md)

### Tables principales liées aux clients
```sql
-- Demandes de prêt
loan_applications (id, reference, prenom, nom, courriel, telephone, status, ...)

-- Comptes clients
client_accounts (id, application_id, account_number, client_name, status, balance)

-- Transactions
client_transactions (id, account_id, transaction_type, amount, reference)

-- Analyses
client_analyses (id, application_id, analysis_type, score, result)

-- Support
support_tickets (id, ticket_number, client_email, status, assigned_to)
support_messages (id, ticket_id, message_from, content)
support_attachments (id, ticket_id, file_name, storage_path)
```

---

## 🎯 CE QU'ON VEUT CRÉER

### Objectif
Système de "dossiers clients" pour organiser et stocker tous les documents liés à une demande de prêt.

### Structure de dossier souhaitée
```
📁 Client ID: abc-123
  ├── 📂 Identity (Identité)
  │   ├── photo_id.pdf
  │   ├── proof_address.pdf
  │   └── sin_card.pdf
  ├── 📂 Financial (Finances)
  │   ├── pay_stub_jan.pdf
  │   ├── bank_statement.pdf
  │   └── tax_return_2025.pdf
  ├── 📂 Documents (Documents légaux)
  │   ├── contract_signed.pdf
  │   └── terms_accepted.pdf
  └── 📂 Correspondence (Communications)
      ├── email_confirmation.pdf
      └── letter_approval.pdf
```

---

## 💻 BLUEPRINT DEMANDÉ

### 1. Tables SQL

**Table: client_folders**
```sql
CREATE TABLE client_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  folder_type TEXT NOT NULL, -- 'identity', 'financial', 'documents', 'correspondence'
  folder_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_client_folders_application_id ON client_folders(application_id);
CREATE INDEX idx_client_folders_type ON client_folders(folder_type);

ALTER TABLE client_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage folders"
  ON client_folders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**Table: client_documents**
```sql
CREATE TABLE client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES client_folders(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'photo_id', 'pay_stub', 'bank_statement', etc.
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  -- Optionnel: vérification/validation
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_client_documents_folder_id ON client_documents(folder_id);
CREATE INDEX idx_client_documents_document_type ON client_documents(document_type);
CREATE INDEX idx_client_documents_uploaded_at ON client_documents(uploaded_at DESC);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage documents"
  ON client_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

### 2. Storage Supabase

**Créer le bucket:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false);
```

**RLS Policy pour Storage:**
```sql
CREATE POLICY "Admins can access all client files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'client-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

**Structure de paths:**
```
client-files/{application_id}/{folder_type}/{filename}

Exemples:
- client-files/abc-123/identity/photo_id.pdf
- client-files/abc-123/financial/pay_stub_jan.pdf
- client-files/def-456/documents/contract.pdf
```

---

### 3. Endpoints Next.js API

**GET /api/admin/clients/[id]/folders**
- Récupère tous les dossiers + documents d'un client
- Retour: Structure hiérarchique avec folders et documents

**POST /api/admin/clients/[id]/upload**
- Upload un document dans un dossier
- Body: FormData avec file, folderType, documentType
- Actions:
  1. Upload vers Storage Supabase
  2. Créer/trouver le folder
  3. Enregistrer métadonnées dans client_documents

**GET /api/admin/clients/documents/[documentId]/download**
- Génère signed URL pour téléchargement
- Expiration: 1 heure
- Retour: { url, document: { name, type, size } }

**DELETE /api/admin/clients/documents/[documentId]**
- Supprime document du Storage
- Supprime enregistrement de la table
- Auth admin requise

**PATCH /api/admin/clients/documents/[documentId]/verify**
- Marquer document comme vérifié
- Body: { verified: true }
- Met à jour verified, verified_by, verified_at

---

### 4. Queries Supabase (Patterns)

**Récupérer structure complète:**
```typescript
const { data: folders, error } = await supabase
  .from('client_folders')
  .select(`
    *,
    documents:client_documents(*)
  `)
  .eq('application_id', applicationId)
  .order('folder_type')

// Retour:
[
  {
    id: 'folder-uuid-1',
    application_id: 'app-uuid',
    folder_type: 'identity',
    folder_name: 'Identity',
    documents: [
      {
        id: 'doc-uuid-1',
        document_name: 'photo_id.pdf',
        storage_path: 'client-files/app-uuid/identity/photo_id.pdf',
        file_size: 1024000,
        verified: true
      }
    ]
  }
]
```

**Upload document:**
```typescript
// 1. Upload vers Storage
const filePath = `client-files/${applicationId}/${folderType}/${file.name}`
const { error: uploadError } = await supabase.storage
  .from('client-files')
  .upload(filePath, file)

// 2. Enregistrer métadonnées
const { data: document } = await supabase
  .from('client_documents')
  .insert({
    folder_id: folderId,
    document_name: file.name,
    document_type: documentType,
    storage_path: filePath,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: 'admin'
  })
  .select()
  .single()
```

**Télécharger document:**
```typescript
// Générer signed URL (expire dans 1h)
const { data: signedUrl } = await supabase.storage
  .from('client-files')
  .createSignedUrl(storagePath, 3600)

return { url: signedUrl.signedUrl }
```

**Supprimer document:**
```typescript
// 1. Supprimer du Storage
await supabase.storage
  .from('client-files')
  .remove([storagePath])

// 2. Supprimer enregistrement
await supabase
  .from('client_documents')
  .delete()
  .eq('id', documentId)
```

---

## 🔐 AUTHENTIFICATION

**Pattern utilisé dans SAR:**
```typescript
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')

  if (!token) return false

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    await jwtVerify(token.value, secret)
    return true
  } catch {
    return false
  }
}

// Dans chaque route:
export async function GET(request: NextRequest) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  // ... suite
}
```

---

## 📋 VARIABLES D'ENVIRONNEMENT

Déjà configurées:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=56K2TFqsBtHQjzihmTS8palyJeA3KZHI1yYsvGEkxWQ=
```

---

## ✅ CHECKLIST BLUEPRINT

- [ ] Créer table `client_folders`
- [ ] Créer table `client_documents`
- [ ] Créer indexes sur les deux tables
- [ ] Activer RLS sur les deux tables
- [ ] Créer bucket Storage `client-files`
- [ ] Ajouter RLS policy sur Storage
- [ ] Créer endpoint `GET /api/admin/clients/[id]/folders`
- [ ] Créer endpoint `POST /api/admin/clients/[id]/upload`
- [ ] Créer endpoint `GET /api/admin/clients/documents/[documentId]/download`
- [ ] Créer endpoint `DELETE /api/admin/clients/documents/[documentId]`
- [ ] Créer endpoint `PATCH /api/admin/clients/documents/[documentId]/verify`
- [ ] Tester upload de fichier
- [ ] Tester génération signed URL
- [ ] Tester suppression de fichier
- [ ] Ajouter page UI dans admin pour gérer dossiers

---

## 🎨 BONUS UI (Recommandé)

**Page admin:** `/admin/clients/[id]/files`

**Composants suggérés:**
- Liste des dossiers (tabs: Identity, Financial, Documents, Correspondence)
- Upload zone (drag & drop)
- Liste des documents avec:
  - Nom + taille + date
  - Badge "Vérifié" si verified = true
  - Actions: Download, Delete, Verify
- Modal de prévisualisation (si possible)

**Technologies UI:**
- React/Next.js
- Tailwind CSS (déjà utilisé dans SAR)
- Shadcn/ui ou composants custom

---

**Document créé par SAR Cortex**
Version: 1.0
Date: 2026-01-14
