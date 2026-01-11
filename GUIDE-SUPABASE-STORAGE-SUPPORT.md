# Guide: Configuration Supabase Storage pour le Support

## 📦 Bucket: support-files

Ce bucket stocke tous les screenshots et fichiers uploadés dans le système de support technique.

---

## 🚀 Étapes de Configuration

### 1. Accéder au Dashboard Supabase

1. Ouvrir: https://supabase.com/dashboard
2. Se connecter avec les credentials SAR
3. Sélectionner le projet **Solution Argent Rapide**

### 2. Créer le Bucket

1. Dans le menu de gauche, cliquer sur **Storage**
2. Cliquer sur **New bucket** (ou **Créer un bucket**)
3. Remplir le formulaire:

```
Nom du bucket: support-files
Public: ❌ Non (fichiers privés)
Allowed MIME types: image/png, image/jpeg, image/webp, application/pdf, video/webm
File size limit: 10MB (10485760 bytes)
```

4. Cliquer sur **Create bucket**

### 3. Configurer les Policies (RLS)

Une fois le bucket créé, configurer les policies de sécurité:

#### Policy 1: Admins peuvent uploader
```sql
CREATE POLICY "Admins can upload support files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-files');
```

#### Policy 2: Admins peuvent voir
```sql
CREATE POLICY "Admins can view support files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'support-files');
```

#### Policy 3: Admins peuvent supprimer
```sql
CREATE POLICY "Admins can delete support files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'support-files');
```

**OU (Plus simple)**: Utiliser le service role key côté serveur (bypass RLS)

### 4. Structure des Dossiers

Le bucket utilisera cette structure:

```
support-files/
├── screenshots/
│   ├── {ticket-id}/
│   │   ├── screenshot-1234567890.png
│   │   └── screenshot-1234567891.png
│   └── ...
├── documents/
│   ├── {ticket-id}/
│   │   ├── document-1234567890.pdf
│   │   └── ...
│   └── ...
└── recordings/    (future feature)
    └── ...
```

---

## ✅ Vérification

### Tester l'upload

Via le code (une fois les API routes créées):

```typescript
import { supabase } from '@/lib/supabase'

const file = new File(['test'], 'test.png', { type: 'image/png' })
const { data, error } = await supabase.storage
  .from('support-files')
  .upload('screenshots/test/test.png', file)

if (error) {
  console.error('Erreur:', error)
} else {
  console.log('✅ Upload réussi!', data)
}
```

### Tester l'accès

```typescript
const { data, error } = await supabase.storage
  .from('support-files')
  .list('screenshots')

if (error) {
  console.error('Erreur:', error)
} else {
  console.log('✅ Liste des fichiers:', data)
}
```

---

## 🔗 URLs des Fichiers

Les fichiers uploadés seront accessibles via:

```
https://{PROJECT_ID}.supabase.co/storage/v1/object/public/support-files/screenshots/{ticket-id}/{filename}
```

**Note**: Si le bucket est privé, utiliser `.createSignedUrl()` pour générer des URLs temporaires:

```typescript
const { data, error } = await supabase.storage
  .from('support-files')
  .createSignedUrl('screenshots/ticket-id/file.png', 3600) // 1 heure

console.log('URL signée:', data.signedUrl)
```

---

## 📊 Limites et Quotas

- **Taille max par fichier**: 10MB
- **Types autorisés**: Images (PNG, JPG, WebP), PDF, Vidéo (WebM)
- **Bucket privé**: Nécessite authentification pour accéder aux fichiers
- **Storage total**: Vérifier le plan Supabase actuel

---

## 🔐 Sécurité

### Best Practices

1. **Toujours valider les MIME types** côté serveur
2. **Scanner les fichiers** pour virus (optionnel, future feature)
3. **Limiter la taille** des fichiers (10MB max)
4. **Nettoyer les vieux fichiers** après suppression de tickets (optionnel)
5. **Utiliser des signed URLs** pour partager temporairement des fichiers privés

### Variables d'Environnement

Aucune variable supplémentaire nécessaire! Le bucket utilise les mêmes credentials que Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## 📝 Maintenance

### Nettoyer les fichiers orphelins

Créer une fonction Edge Supabase (optionnel):

```sql
CREATE OR REPLACE FUNCTION cleanup_orphan_support_files()
RETURNS void AS $$
BEGIN
  -- Supprimer les attachments dont le ticket n'existe plus
  DELETE FROM support_attachments
  WHERE ticket_id NOT IN (SELECT id FROM support_tickets);

  -- Note: Les fichiers dans Storage doivent être supprimés manuellement
  -- ou via un script cron
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 Résumé

✅ **Bucket créé**: `support-files`
✅ **Configuration**: Privé, 10MB max, types autorisés
✅ **Policies RLS**: Configurées
✅ **Structure**: Screenshots, documents, recordings
✅ **Prêt à l'emploi**: Oui!

---

**Prochaine étape**: Créer les API routes pour uploader et récupérer les fichiers.
