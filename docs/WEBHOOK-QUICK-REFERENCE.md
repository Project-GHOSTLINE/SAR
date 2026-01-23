# ⚡ Webhook System - Quick Reference

Guide de référence rapide pour l'équipe SAR.

---

## 📱 Dashboard Access

**URL Production:** `https://solutionargentrapide.ca/admin/webhooks`

**Login:** Utiliser les credentials admin SAR

**Statut actuel:**
- 🟢 **979 webhooks production** actifs
- 🟢 **76.6% success rate**
- 🟢 **Monitoring temps réel** opérationnel

---

## 🔍 Quick Commands

### Vérifier le système
```bash
# Voir les stats complètes
npm run webhook:verify

# Voir les 20 derniers webhooks
npm run webhook:check

# Tester tous les 16 endpoints
npm run webhook:architect
```

### Développement local
```bash
# Démarrer le serveur dev
npm run dev

# Tester un webhook spécifique
curl -X POST http://localhost:3000/api/webhooks/vopay \
  -H "Content-Type: application/json" \
  -d '{"TransactionID":"test-123",...}'
```

---

## 📊 Dashboard Features

### Stats Cards (Top)
- **Total Webhooks:** Nombre total de webhooks
- **Success Rate:** % de webhooks completed vs failed
- **Completed:** Webhooks traités avec succès
- **Failed:** Webhooks en erreur
- **Avg Time:** Temps moyen de traitement

### Filters
- **Provider:** VoPay, Flinks, QuickBooks, Stripe
- **Status:** Received, Processing, Completed, Failed, Retrying
- **Environment:** Production (locked par défaut)
- **Search:** Chercher par External ID, Event Type, Provider

### Actions
- 👁️ **View:** Voir le payload complet JSON
- 🔄 **Retry:** Rejouer un webhook failed
- 📥 **Export CSV:** Exporter les données
- 🔄 **Refresh:** Actualiser les données

---

## 🔔 Status Meanings

| Status | Signification | Action |
|--------|---------------|--------|
| **received** | Webhook reçu, pas encore traité | Normal - attend traitement |
| **processing** | En cours de traitement | Normal - en cours |
| **completed** | ✅ Traité avec succès | Parfait - aucune action |
| **failed** | ❌ Échec du traitement | Vérifier error_message, retry si besoin |
| **retrying** | 🔄 En cours de retry | Attend résultat du retry |

---

## 🚨 Common Issues & Solutions

### Issue: Webhook failed avec "Invalid signature"

**Cause:** Signature HMAC ne correspond pas

**Solution:**
1. Vérifier que `VOPAY_SHARED_SECRET` est correct dans `.env.local`
2. Vérifier que le `TransactionID` est identique à celui utilisé pour générer la signature
3. Tester avec:
   ```bash
   npm run webhook:architect
   ```

### Issue: Webhook en "processing" depuis longtemps

**Cause:** Peut-être un timeout ou un hang

**Solution:**
1. Voir les logs Supabase
2. Vérifier la DB query performance
3. Si > 24h en processing, considérer retry manuel

### Issue: Stats ne se mettent pas à jour

**Cause:** Cache du dashboard

**Solution:**
1. Cliquer sur le bouton "Refresh" en haut à droite
2. Vider le cache navigateur (Cmd+Shift+R sur Mac)
3. Vérifier que l'API répond:
   ```bash
   curl https://api.solutionargentrapide.ca/api/admin/webhooks/list
   ```

### Issue: Export CSV ne fonctionne pas

**Cause:** Trop de données ou timeout

**Solution:**
1. Appliquer des filtres pour réduire le dataset
2. Utiliser pagination (limit + offset)
3. Contacter devops si le problème persiste

---

## 📈 Event Types Reference

| Event Type | Description | Count (Current) |
|-----------|-------------|-----------------|
| **EFT Funding** | Virement EFT sortant | 753 (76.9%) |
| **Reversal** | Annulation/retour de fonds | 164 (16.8%) |
| **VoPayInstant Withdraw** | Retrait instantané VoPay | 31 (3.2%) |
| **Inbound e-Transfer** | e-Transfer entrant | 13 (1.3%) |
| **eLinx** | Statut connexion eLinx | 3 (0.3%) |
| **Account Status** | Changement statut compte | 3 (0.3%) |
| **Batch Detail** | Détails batch transaction | 3 (0.3%) |
| **Account Balance** | Solde du compte | 3 (0.3%) |
| **Account Limit** | Limite du compte | 3 (0.3%) |
| **Interac Bulk Payout** | Paiement bulk Interac | 2 (0.2%) |

---

## 🔐 Security Notes

### Signature Validation

Tous les webhooks VoPay sont validés avec HMAC SHA1:

```typescript
// Génération de signature (pour tests)
const crypto = require('crypto')
const signature = crypto
  .createHmac('sha1', process.env.VOPAY_SHARED_SECRET)
  .update(transactionId)
  .digest('hex')
```

### Environment Filtering

- ✅ **Production:** Données réelles, traitées normalement
- ⚠️ **Sandbox:** Ignorées automatiquement
- ⚠️ **Test:** Loggées mais pas traitées

**Par défaut:** Dashboard montre SEULEMENT les webhooks production.

---

## 📞 Support & Escalation

### Debug Steps
1. Vérifier le dashboard: `/admin/webhooks`
2. Voir les logs récents: `npm run webhook:check`
3. Tester les endpoints: `npm run webhook:architect`
4. Vérifier les stats: `npm run webhook:verify`

### Si problème persiste
1. Vérifier les logs Supabase Edge Functions
2. Vérifier les logs Vercel (production)
3. Tester en local avec `npm run dev`
4. Contacter l'équipe DevOps

### Emergency Rollback
```bash
# Si système complètement cassé (TRÈS RARE)
node scripts/restore-backup.js 2026-01-23-rpc-migration
```

**⚠️ Ne faire qu'en dernier recours!**

---

## 🎯 KPIs to Monitor

### Daily Checks
- ✅ Success rate > 70%
- ✅ No webhooks stuck in "processing" > 24h
- ✅ Failed count < 10% of total

### Weekly Reviews
- 📊 Trend analysis des event types
- 📊 Performance metrics (processing time)
- 📊 Error patterns (failed webhooks)

### Monthly Reports
- 📈 Growth: Total webhooks per month
- 📈 Reliability: Average success rate
- 📈 Provider distribution

---

## 📚 Additional Resources

### Documentation
- **Architecture complète:** `/docs/WEBHOOK-DATA-FLOW.md`
- **Statut système:** `/docs/WEBHOOK-SYSTEM-STATUS.md`
- **Résumé migration:** `/docs/WEBHOOK-MIGRATION-SUMMARY.md`
- **Tests cURL:** `/docs/WEBHOOK-CURL-TESTS.sh`

### Postman Collection
- **Location:** `/postman/collections/VoPay-Webhooks-Complete.postman_collection.json`
- **Usage:** Import dans Postman pour tester manuellement

### Code References
- **Dashboard UI:** `/src/app/admin/webhooks/page.tsx`
- **API Endpoint:** `/src/app/api/admin/webhooks/list/route.ts`
- **Webhook Handler:** `/src/app/api/webhooks/vopay/route.ts`
- **RPC Function:** `/supabase/migrations/20260123000000_update_vopay_webhook_rpc.sql`

---

## ✅ Quick Health Check

Faire ce check chaque matin:

```bash
# 1. Vérifier les stats
npm run webhook:verify

# 2. Voir les derniers webhooks
npm run webhook:check

# 3. Accéder au dashboard
open https://solutionargentrapide.ca/admin/webhooks
```

**Résultat attendu:**
- ✅ Total > 979 webhooks (croissant)
- ✅ Success rate > 70%
- ✅ Dashboard charge en < 3 secondes
- ✅ Aucun webhook stuck > 24h

---

## 🎉 Success Criteria

Le système est **sain** si:

- 🟢 Dashboard accessible et réactif
- 🟢 Stats affichent des données réelles
- 🟢 Success rate > 70%
- 🟢 Failed webhooks < 10%
- 🟢 Aucun webhook bloqué en processing > 24h
- 🟢 Export CSV fonctionne
- 🟢 Filtres et search opérationnels

---

**Dernière mise à jour:** 2026-01-23
**Contact:** Équipe SAR DevOps
