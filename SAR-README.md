# SAR - Solution Argent Rapide INC

## ENVIRONNEMENT DE TRAVAIL

### PRODUCTION UNIQUEMENT (Vercel)
**IMPORTANT:** Ce projet roule **TOUJOURS sur Vercel en production**.
- ❌ Jamais travailler en local (`npm run dev`)
- ✅ Toujours tester/déployer sur Vercel
- ✅ Push git automatique après chaque changement

Exception: local seulement si demandé explicitement par l'utilisateur.

### URLs
- **Production:** https://solutionargentrapide.ca
- **Admin:** https://admin.solutionargentrapide.ca
- **Client:** https://client.solutionargentrapide.ca
- **Vercel Preview:** https://sar-nu.vercel.app

### Workflow
```
1. Faire les changements dans le code
2. git add . && git commit
3. git push
4. Vercel déploie automatiquement
5. Tester sur l'URL de production
```

## STACK TECHNIQUE

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

### Backend/Services
- Supabase (DB + Auth)
- VoPay (Paiements EFT/PAD)
- Resend (Email)
- Vercel (Hosting)

### APIs
- `/api/admin/login` - Authentification admin
- `/api/admin/vopay` - Intégration VoPay
- `/api/contact` - Formulaire de contact

## CREDENTIALS

Tous les credentials sont dans:
- `/Users/xunit/Desktop/outils/.env.master`
- `/Users/xunit/Desktop/outils/CREDENTIALS-MASTER.md`

Variables Vercel configurées via dashboard ou CLI.

## SECURITE ADMIN

- Password: `FredRosa%1978` (variable `ADMIN_PASSWORD`)
- JWT secret: configuré dans Vercel
- Session: 7 jours

## COMMANDS UTILES

```bash
# Push vers production
git add . && git commit -m "message" && git push

# Voir les logs Vercel
vercel logs

# Variables d'environnement Vercel
vercel env pull
vercel env add VARIABLE_NAME
```

## DOCUMENTATION

- **URLS.md** - Liste complète des URLs, sous-domaines et API endpoints
- **CLAUDE.md** - Workflow et configuration du projet

## NOTES

- Toujours vérifier que `.env.local` est dans `.gitignore`
- Ne jamais commiter de credentials
- Tester sur Vercel après chaque push majeur
- Production = solutionargentrapide.ca (pas Vercel URL)
