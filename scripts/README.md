# Scripts VoPay Webhooks

## Configuration rapide

### 1. Tester les endpoints (en premier)

```bash
npm run webhook:test
```

Ce script vérifie que tous les endpoints webhook sont en ligne et accessibles.

**Ce qu'il fait:**
- Teste les 16 endpoints webhook avec une requête GET
- Vérifie que chaque endpoint répond avec `status: "online"`
- Affiche un rapport de santé complet

**Résultat attendu:**
```
🧪 Test des endpoints webhook VoPay

Testing Transaction Status... ✅ Online (45ms)
Testing eLinx Status... ✅ Online (38ms)
Testing Account Status... ✅ Online (42ms)
...

📊 Résumé des tests
✅ En ligne: 16/16
❌ Hors ligne: 0/16
📈 Taux de réussite: 100%

🎉 Tous les webhooks sont opérationnels!
```

### 2. Configurer automatiquement VoPay

```bash
npm run webhook:configure
```

Ce script configure automatiquement tous les webhooks dans le dashboard VoPay via leur API.

**Ce qu'il fait:**
- Se connecte à l'API VoPay avec vos credentials
- Configure automatiquement les 16 webhooks
- Affiche un rapport de configuration

**Variables d'environnement requises:**
- `VOPAY_API_KEY` - Clé API VoPay
- `VOPAY_SECRET_KEY` - Secret VoPay
- `VOPAY_ACCOUNT_ID` - ID de compte VoPay

**Résultat attendu:**
```
🚀 Configuration des webhooks VoPay...

⏳ Configuration: Transaction Status...
✅ Transaction Status configuré
   URL: https://api.solutionargentrapide.ca/api/webhooks/vopay

...

📊 Résumé de la configuration
✅ Réussis: 16/16
❌ Échoués: 0/16

🎉 Tous les webhooks ont été configurés avec succès!
```

## Ordre recommandé

1. **D'abord:** `npm run webhook:test` - Vérifier que vos endpoints sont accessibles
2. **Ensuite:** `npm run webhook:configure` - Configurer VoPay pour utiliser ces endpoints

## Dépannage

### Erreur: "Variables d'environnement manquantes"

Vérifiez que votre fichier `.env.local` contient:
```env
VOPAY_API_KEY=your_api_key
VOPAY_SECRET_KEY=your_secret
VOPAY_ACCOUNT_ID=your_account_id
```

### Erreur: "Failed to configure"

- Vérifiez que vos credentials VoPay sont valides
- Assurez-vous d'utiliser les bons credentials (sandbox vs production)
- Vérifiez que votre compte VoPay a les permissions nécessaires

### Certains endpoints ne répondent pas

- Assurez-vous que le serveur Next.js est démarré (`npm run dev`)
- Vérifiez que tous les fichiers de route ont été créés correctement
- Testez manuellement avec `curl` pour débugger

## Structure des webhooks

Tous les webhooks suivent la même structure:

```typescript
// Validation de signature HMAC SHA1
function validateSignature(id: string, key: string): boolean

// Handler POST principal
async function handlePOST(request: NextRequest)

// Endpoint GET de santé
export async function GET()
```

## Développement

### Ajouter un nouveau webhook

1. Créer le fichier dans `src/app/api/webhooks/vopay/[nom]/route.ts`
2. Implémenter la validation et le traitement
3. Ajouter l'endpoint aux deux scripts de configuration/test
4. Mettre à jour la documentation

### Tester localement

```bash
# Tester un webhook spécifique
curl http://localhost:3001/api/webhooks/vopay/elinx

# Envoyer un webhook de test
curl -X POST http://localhost:3001/api/webhooks/vopay/elinx \
  -H "Content-Type: application/json" \
  -d '{"TransactionID": "test", "Status": "connected", "ValidationKey": "..."}'
```

## Références

- [VoPay Events Documentation](https://docs.vopay.com/docs/events)
- [VoPay Webhooks API](https://docs.vopay.com/reference/accountwebhooksget)
- Documentation complète: `/docs/VOPAY_WEBHOOKS.md`
