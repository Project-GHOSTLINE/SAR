out# 🚀 Intégration Margill - Guide Rapide

## ✅ Ce qui est configuré

L'endpoint webhook Margill est **déjà déployé et fonctionnel**!

```
URL: https://progression.solutionargentrapide.ca/api/webhook/margill
Méthode: POST
Header: x-api-key: FredRosa%1978
```

---

## 📝 Ce que Margill doit envoyer

### Format du webhook:

```json
{
  "dossier_id": "12345",
  "statut_margill": "nouveau_dossier",
  "nom_client": "Jean Tremblay",
  "email_client": "jean@example.com",
  "telephone_client": "+15141234567",
  "montant": 7500.00,
  "date_premier_paiement": "2026-02-15"
}
```

### Champs requis:
- ✅ `dossier_id` - ID unique du dossier dans Margill
- ✅ `statut_margill` - Statut actuel (voir tableau ci-dessous)

### Champs optionnels (pour création):
- `nom_client` - Nom complet
- `email_client` - Email
- `telephone_client` - Format: +1XXXXXXXXXX
- `montant` - Montant en dollars (sera converti en cents)
- `date_premier_paiement` - Format: YYYY-MM-DD

---

## 🗺️ Mapping des statuts

| Statut Margill | → | Portail (étape visible) |
|----------------|---|------------------------|
| `nouveau_dossier` | → | Étape 1: Demande reçue |
| `ibv_completee` | → | Étape 2: IBV reçu |
| `analyse_en_cours` | → | Étape 3: Analyse du dossier |
| `offre_envoyee` | → | Étape 4: Offre envoyée |
| `offre_acceptee` | → | Étape 5: Offre approuvée |
| `en_attente_signature` | → | Étape 6: Signature requise |
| `contrat_signe` | → | Étape 7: Contrat signé |
| `pret_actif` | → | Étape 8: Prêt actif |

**Statuts internes** (masqués au client):
- `en_attente_ibv`, `offre_en_preparation`, `contrat_en_preparation`, `contrat_envoye`, `transfert_de_fonds`

**Statuts de fin** (masqués):
- `refuse`, `sans_reponse`

---

## 🧪 Test rapide

```bash
# Test 1: Créer un dossier
curl -X POST https://progression.solutionargentrapide.ca/api/webhook/margill \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "dossier_id": "TEST-123",
    "statut_margill": "nouveau_dossier",
    "nom_client": "Test Client",
    "email_client": "test@test.com",
    "telephone_client": "+15141234567",
    "montant": 5000.00
  }'

# Test 2: Mettre à jour le statut
curl -X POST https://progression.solutionargentrapide.ca/api/webhook/margill \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "dossier_id": "TEST-123",
    "statut_margill": "offre_envoyee"
  }'

# Test 3: Générer magic link pour le client
curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "application_id": "MARGILL-TEST-123",
    "phone": "+15141234567"
  }'
```

---

## 🔄 Workflow automatique recommandé

### Option A: Webhook automatique (idéal)

1. **Dans Margill**, configure un webhook pour chaque changement de statut
2. **URL**: `https://progression.solutionargentrapide.ca/api/webhook/margill`
3. **Headers**: `x-api-key: FredRosa%1978`
4. Le portail se met à jour **automatiquement**
5. Envoie SMS au client avec magic link quand nécessaire

### Option B: API manuelle

Si pas de webhooks, appelle l'API manuellement:
- Quand tu crées un dossier
- Quand tu changes le statut
- Quand tu veux notifier le client

---

## 📞 Informations nécessaires

Pour finaliser l'intégration, dis-moi:

1. **Margill supporte-t-il les webhooks?**
   - Oui → Je configure l'URL et les headers
   - Non → On utilise l'API manuelle ou polling

2. **Quels sont les statuts exacts dans Margill?**
   - Donne-moi la liste complète
   - Je vais ajuster le mapping si nécessaire

3. **Format de l'ID dossier:**
   - Numérique? Alphanumerique?
   - Exemple: "12345" ou "DOS-2026-001"?

4. **Quand envoyer le magic link au client?**
   - Dès la création du dossier?
   - Uniquement quand l'offre est prête?
   - À chaque changement de statut?

---

## 📁 Fichiers utiles

- `INTEGRATION-MARGILL.md` - Documentation complète
- `test-margill-webhook.sh` - Script de test complet
- `app/api/webhook/margill/route.ts` - Code du webhook

---

## ✅ Prochaine étape

**Dis-moi simplement:**

> "Margill [a / n'a pas] de webhooks, les statuts sont: [liste], et on veut envoyer le lien [quand]"

Et je finalise la configuration exacte pour ton cas! 🚀
