# Relevés Bancaires - Migration vers Supabase Storage

## ✅ Migration Terminée

Le fichier `Releves_Bancaires_2025.html` (10.48 MB) a été migré avec succès vers Supabase Storage.

---

## 🔗 URL Publique

```
https://dllyzfuqjzuhvshrlmuq.supabase.co/storage/v1/object/public/documents/Releves_Bancaires_2025.html
```

### Caractéristiques

- **Taille**: 10.48 MB
- **Type**: text/html
- **Cache**: 1 heure (3600s)
- **CDN**: Cloudflare
- **CORS**: Activé (Access-Control-Allow-Origin: *)
- **Statut**: ✅ HTTP 200 (accessible)

---

## 📦 Bucket Supabase

- **Nom**: `documents`
- **Type**: Public
- **Limite**: 50 MB par fichier
- **Localisation**: Supabase Project `dllyzfuqjzuhvshrlmuq`

---

## 🔧 Utilisation dans le Code

### Option 1: Iframe Direct

```tsx
<iframe
  src="https://dllyzfuqjzuhvshrlmuq.supabase.co/storage/v1/object/public/documents/Releves_Bancaires_2025.html"
  width="100%"
  height="800px"
  style={{ border: 'none' }}
  title="Relevés Bancaires 2025"
/>
```

### Option 2: Lien de Téléchargement

```tsx
<a
  href="https://dllyzfuqjzuhvshrlmuq.supabase.co/storage/v1/object/public/documents/Releves_Bancaires_2025.html"
  target="_blank"
  rel="noopener noreferrer"
  className="btn btn-primary"
>
  📄 Voir les Relevés Bancaires 2025
</a>
```

### Option 3: Fenêtre Popup

```tsx
const openReleves = () => {
  window.open(
    'https://dllyzfuqjzuhvshrlmuq.supabase.co/storage/v1/object/public/documents/Releves_Bancaires_2025.html',
    'releves',
    'width=1200,height=800,resizable=yes,scrollbars=yes'
  );
};
```

---

## 🚀 Avantages de Supabase Storage

1. **Pas de limite Vercel**: Le fichier de 10MB ne bloque plus le build
2. **CDN Cloudflare**: Distribution rapide mondiale
3. **Cache intégré**: Performance optimale
4. **CORS activé**: Pas de problème d'iframe
5. **URL stable**: Ne change pas entre les déploiements
6. **Backup automatique**: Supabase gère la redondance

---

## 🔄 Re-upload du Fichier

Si vous devez mettre à jour le fichier:

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
node scripts/upload-releves-to-supabase.mjs
```

Le script utilise `upsert: true`, donc il remplace automatiquement l'ancien fichier.

---

## 📊 Comparaison Avant/Après

| Aspect | Avant (Vercel) | Après (Supabase) |
|--------|----------------|------------------|
| **Statut** | ❌ 404 | ✅ 200 |
| **Taille** | Problématique | ✅ OK |
| **Cache** | Limité | ✅ 1h CDN |
| **CORS** | Bloqué | ✅ Ouvert |
| **Performance** | Lent | ✅ Rapide (CDN) |
| **Stabilité** | Redirection | ✅ Stable |

---

## 🗑️ Nettoyage (Optionnel)

Une fois que tout fonctionne avec l'URL Supabase, vous pouvez supprimer le fichier de `public/`:

```bash
# ⚠️ ATTENTION: Ne faites ceci qu'après avoir vérifié que tout fonctionne
rm public/Releves_Bancaires_2025.html
git add public/Releves_Bancaires_2025.html
git commit -m "chore: Remove Releves_Bancaires from public (migrated to Supabase Storage)"
```

Cela réduira la taille du repo et du build Vercel.

---

## 🔐 Sécurité

Le fichier est actuellement **PUBLIC**. Si vous voulez le restreindre:

1. Changez le bucket en `private` dans Supabase Dashboard
2. Générez des URLs signées dans votre API:

```javascript
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl('Releves_Bancaires_2025.html', 3600); // 1 heure

return data.signedUrl;
```

---

## 📝 Logs

- **Upload**: 22 janvier 2026, 16h35
- **Script**: `scripts/upload-releves-to-supabase.mjs`
- **Bucket créé**: `documents` (public)
- **Status**: ✅ Opérationnel

---

## ✅ Checklist Post-Migration

- [x] Fichier uploadé vers Supabase Storage
- [x] Bucket public créé
- [x] URL publique générée
- [x] URL testée et accessible (HTTP 200)
- [x] Contenu HTML vérifié
- [ ] Code mis à jour pour utiliser la nouvelle URL
- [ ] Tests effectués en production
- [ ] Ancien fichier supprimé de `public/` (optionnel)

---

**Date de migration**: 22 janvier 2026
**Statut**: ✅ Migration réussie
