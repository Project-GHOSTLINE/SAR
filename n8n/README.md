# n8n Workflows - SAR E2E Testing

Ce dossier contient les workflows n8n pour automatiser les tests E2E.

## 🚀 Démarrer n8n

```bash
make stack-up
```

Puis accéder à: http://localhost:5678

## 📋 Workflows Disponibles

### 1. `run-e2e-on-webhook.json`
Déclenche les tests E2E via webhook HTTP.

**Endpoint**: `http://localhost:5678/webhook/run-e2e`

**Utilisation**:
```bash
curl -X POST http://localhost:5678/webhook/run-e2e
```

**Flow**:
1. Webhook reçoit la requête
2. Exécute `make e2e` dans le playwright-runner
3. Lit les résultats
4. Retourne le statut (success/failure)

---

### 2. `notify-on-test-failure.json`
Envoie une notification si les tests échouent.

**Configuration requise**:
- Discord webhook URL (optionnel)
- Slack webhook URL (optionnel)
- Email SMTP (optionnel)

**Flow**:
1. Reçoit le résultat d'un test
2. Si échec détecté
3. Envoie notification avec logs + lien rapport

---

### 3. `scheduled-smoke-tests.json`
Lance les smoke tests à intervalles réguliers.

**Configuration**:
- Schedule: Toutes les heures (modifiable)
- Exécute: `make smoke`

**Flow**:
1. Trigger CRON (toutes les heures)
2. Exécute smoke tests
3. Log les résultats
4. Notifie si échec

---

## 🔧 Configuration

### Première utilisation:

1. Démarrer n8n:
   ```bash
   make stack-up
   ```

2. Ouvrir http://localhost:5678

3. Créer un compte/se connecter

4. Importer un workflow:
   - Cliquer "Import from File"
   - Sélectionner un `.json` de ce dossier
   - Activer le workflow

---

## 🛠️ Créer un Nouveau Workflow

### Template basique:

```
[Trigger] → [Execute Command] → [Parse Results] → [Notify]
```

**Nodes utiles**:
- **Webhook**: Déclencher via HTTP
- **Cron**: Déclencher à intervalles
- **Execute Command**: Lancer `make` commands
- **HTTP Request**: Appeler des APIs
- **IF**: Conditions (success/failure)
- **Discord/Slack/Email**: Notifications

---

## 📊 Exemples de Commandes

### Exécuter dans le runner Playwright:

```bash
# Via docker exec
docker exec sar-playwright-runner bash -c "cd /workspace && make smoke"

# Ou via n8n "Execute Command" node
make smoke
make e2e
make test-quickbooks
```

---

## 🔗 Intégrations Possibles

### GitHub
- Webhook sur push → run tests
- Webhook sur PR → run smoke tests

### Vercel
- Webhook après deploy → run e2e
- Validation avant merge

### Discord/Slack
- Notifications en temps réel
- Liens vers rapports

### Email
- Rapport quotidien
- Alerte sur échec critique

---

## 🐛 Troubleshooting

### "Cannot execute command"
→ Vérifier que le container `sar-playwright-runner` est actif:
```bash
docker ps | grep playwright-runner
```

### "Webhook not responding"
→ Vérifier que n8n est accessible:
```bash
curl http://localhost:5678
```

### "Tests fail in n8n but work locally"
→ Vérifier les variables d'environnement dans le runner

---

## 📚 Ressources

- **n8n Docs**: https://docs.n8n.io
- **n8n Community**: https://community.n8n.io
- **Workflow Templates**: https://n8n.io/workflows

---

## 🔐 Sécurité

**IMPORTANT**:
- Ne jamais commit de credentials dans les workflows JSON
- Utiliser n8n Credentials pour les secrets
- Les workflows exportés ne contiennent PAS les credentials
- Configurer les credentials après import

---

## 💾 Backup

### Exporter un workflow:
1. Ouvrir le workflow dans n8n
2. Menu → "Download"
3. Sauvegarder dans ce dossier

### Importer un workflow:
1. n8n → "Import from File"
2. Sélectionner le `.json`
3. Configurer les credentials
4. Activer

---

## 🎯 Workflow Prioritaire: Test après Deploy

**Use Case**: Valider chaque deploy Vercel automatiquement.

1. Vercel webhook → n8n
2. n8n exécute `make smoke`
3. Si OK: ✅ Message Discord "Deploy validated"
4. Si FAIL: ❌ Message Discord avec logs + rollback

**À implémenter**: Voir `run-e2e-on-webhook.json` comme base
