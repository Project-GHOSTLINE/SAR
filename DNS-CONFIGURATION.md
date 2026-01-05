# Configuration DNS pour api.solutionargentrapide.ca

## ✅ Statut: Sous-domaine créé dans Vercel

Le sous-domaine `api.solutionargentrapide.ca` a été ajouté à Vercel avec succès!

---

## 🌐 Configuration DNS Requise

Pour que le sous-domaine fonctionne, vous devez ajouter un enregistrement DNS:

### Configuration chez votre fournisseur DNS (GoDaddy)

1. **Connectez-vous à votre compte GoDaddy**
   - URL: https://dcc.godaddy.com/manage/solutionargentrapide.ca/dns

2. **Ajoutez un enregistrement A**
   ```
   Type: A
   Nom: api
   Valeur: 76.76.21.21
   TTL: 600 (ou default)
   ```

3. **Sauvegardez les modifications**

---

## ⏱️ Propagation DNS

- **Temps estimé**: 1-2 heures (peut aller jusqu'à 48h)
- **Vérification**: Utilisez `nslookup` ou `dig`

```bash
# Vérifier la propagation DNS
nslookup api.solutionargentrapide.ca

# Ou avec dig
dig api.solutionargentrapide.ca
```

Attendu:
```
api.solutionargentrapide.ca has address 76.76.21.21
```

---

## 🧪 Tester l'endpoint webhook

Une fois le DNS propagé, testez l'endpoint:

```bash
# Test GET (vérifier que l'endpoint est accessible)
curl https://api.solutionargentrapide.ca/api/webhooks/vopay
```

Réponse attendue:
```json
{
  "status": "online",
  "endpoint": "VoPay Webhook Receiver",
  "methods": ["POST"],
  "timestamp": "2025-01-05T..."
}
```

---

## 🔗 Prochaines étapes

Une fois le DNS configuré et propagé:

1. ✅ **Créer la table dans Supabase**
   - Aller sur: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new
   - Copier le contenu de `supabase-vopay-webhooks.sql`
   - Exécuter le SQL

2. ✅ **Configurer le webhook dans VoPay**
   - URL: `https://api.solutionargentrapide.ca/api/webhooks/vopay`
   - Méthode: POST
   - Via dashboard VoPay ou API

3. ✅ **Tester le webhook**
   - Déclencher une transaction test dans VoPay
   - Vérifier les logs dans Supabase

---

## 📊 Dashboard Vercel

Vous pouvez suivre la configuration DNS dans le dashboard:
https://vercel.com/project-ghostline/sar/settings/domains

---

## ⚠️ Troubleshooting

### Le DNS ne se propage pas

- Vérifiez que l'enregistrement A est bien créé
- Attendez au moins 1-2 heures
- Vider le cache DNS local: `sudo dscacheutil -flushcache` (macOS)

### Erreur "Not Found" sur l'URL

- Vérifiez que le déploiement Vercel est Ready
- Vérifiez que le DNS pointe vers 76.76.21.21
- Testez l'URL directe Vercel d'abord

### Le webhook ne reçoit rien

1. Vérifier que le DNS fonctionne
2. Vérifier que l'URL est configurée dans VoPay
3. Vérifier les logs Vercel: `vercel logs`
4. Vérifier que la table Supabase existe

---

**Dernière mise à jour**: 2025-01-05
**DNS Target**: 76.76.21.21
**Status**: ⏳ En attente de propagation DNS
