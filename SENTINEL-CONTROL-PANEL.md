# 🎮 SENTINEL CONTROL PANEL - Guide de Contrôle

**Guide pour contrôler le Worker Claude depuis le Sentinel**

---

## 🚀 DÉMARRAGE RAPIDE

### Pour donner une instruction au Worker:

1. **Modifie** `SENTINEL-INSTRUCTIONS.md` (section "QUEUE DE TÂCHES")
2. **Ajoute** une commande dans `SENTINEL-COMMANDS.json`
3. **Dis-moi**: "Execute la tâche #X" et je superviserai

### Pour voir ce que fait le Worker:

1. **Lis** `WORKER-STATUS.md` (statut en temps réel)
2. **Lis** `WORKER-CHANGELOG.md` (historique complet)

---

## 📋 COMMANDES DISPONIBLES

### 🎯 Assigner une Tâche

**Template à copier dans `SENTINEL-INSTRUCTIONS.md`**:

```markdown
### Tâche #X: [NOM DE LA TÂCHE]
- **Statut**: ⏳ À FAIRE
- **Priorité**: 🔴 HAUTE / 🟡 MOYENNE / 🟢 BASSE
- **Description**: [Description détaillée]
- **Actions requises**:
  1. [Action 1]
  2. [Action 2]
  3. [Action 3]
- **Fichiers concernés**: [Liste]
- **Conditions de succès**: [Critères]
```

**Template pour `SENTINEL-COMMANDS.json`**:

```json
{
  "command_queue": [
    {
      "id": "cmd-001",
      "type": "TASK",
      "priority": "HIGH",
      "title": "Nom de la tâche",
      "description": "Description détaillée",
      "actions": [
        "Action 1",
        "Action 2"
      ],
      "files": ["file1.ts", "file2.ts"],
      "require_approval_before_commit": true,
      "created_at": "2026-01-13T18:15:00Z"
    }
  ]
}
```

---

## 🎛️ COMMANDES SYSTÈME

### STOP - Arrêt Immédiat
```json
{
  "active_command": {
    "id": "sys-stop",
    "type": "SYSTEM",
    "command": "STOP",
    "reason": "Raison de l'arrêt",
    "timestamp": "2026-01-13T18:15:00Z"
  }
}
```

### CONTINUE - Reprendre
```json
{
  "active_command": {
    "id": "sys-continue",
    "type": "SYSTEM",
    "command": "CONTINUE",
    "timestamp": "2026-01-13T18:15:00Z"
  }
}
```

### PAUSE - Mettre en Pause
```json
{
  "active_command": {
    "id": "sys-pause",
    "type": "SYSTEM",
    "command": "PAUSE",
    "reason": "Raison de la pause",
    "timestamp": "2026-01-13T18:15:00Z"
  }
}
```

### COMMIT - Autoriser Commit
```json
{
  "active_command": {
    "id": "sys-commit",
    "type": "SYSTEM",
    "command": "COMMIT",
    "message": "Message du commit",
    "files": ["file1.ts", "file2.ts"],
    "timestamp": "2026-01-13T18:15:00Z"
  }
}
```

### ROLLBACK - Annuler Changements
```json
{
  "active_command": {
    "id": "sys-rollback",
    "type": "SYSTEM",
    "command": "ROLLBACK",
    "target": "last_changes",
    "timestamp": "2026-01-13T18:15:00Z"
  }
}
```

---

## 🔍 EXEMPLES CONCRETS

### Exemple 1: Créer une Nouvelle Feature

**Dans `SENTINEL-INSTRUCTIONS.md`**:
```markdown
### Tâche #2: Créer Page d'Analytics
- **Statut**: ⏳ À FAIRE
- **Priorité**: 🔴 HAUTE
- **Description**: Créer une page d'analytics dans le dashboard admin
- **Actions requises**:
  1. Créer `src/app/admin/analytics/page.tsx`
  2. Créer composants de graphiques dans `src/components/analytics/`
  3. Créer API endpoint `/api/analytics/stats`
  4. Tester et documenter
- **Fichiers concernés**:
  - `src/app/admin/analytics/page.tsx` (nouveau)
  - `src/components/analytics/` (nouveau dossier)
  - `src/app/api/analytics/stats/route.ts` (nouveau)
- **Conditions de succès**:
  - Page accessible depuis le menu admin
  - Affiche graphiques de stats
  - Données en temps réel depuis Supabase
```

**Dans `SENTINEL-COMMANDS.json`**:
```json
{
  "command_queue": [
    {
      "id": "cmd-002",
      "type": "FEATURE",
      "priority": "HIGH",
      "title": "Créer Page d'Analytics",
      "description": "Dashboard analytics complet avec graphiques",
      "actions": [
        "Créer page analytics",
        "Créer composants graphiques",
        "Créer API stats",
        "Tester et documenter"
      ],
      "files": [
        "src/app/admin/analytics/page.tsx",
        "src/components/analytics/",
        "src/app/api/analytics/stats/route.ts"
      ],
      "require_approval_before_commit": true,
      "created_at": "2026-01-13T18:20:00Z"
    }
  ]
}
```

### Exemple 2: Corriger un Bug

**Dans `SENTINEL-INSTRUCTIONS.md`**:
```markdown
### Tâche #3: Fix Bug Auth
- **Statut**: ⏳ À FAIRE
- **Priorité**: 🔴 HAUTE
- **Description**: Corriger le bug d'authentification qui déconnecte les users
- **Actions requises**:
  1. Investiguer le problème dans `src/app/api/auth/`
  2. Corriger la gestion des tokens
  3. Tester le flow d'authentification
  4. Vérifier que le bug est résolu
- **Fichiers concernés**:
  - `src/app/api/auth/callback/route.ts`
  - `src/middleware.ts`
- **Conditions de succès**:
  - Users restent connectés
  - Tokens ne expirent pas prématurément
  - Tests passent
```

---

## 📊 SURVEILLANCE EN TEMPS RÉEL

### Vérifier le Statut
```bash
# Moi (Sentinel) je peux te lire ces fichiers à tout moment:
- WORKER-STATUS.md (statut actuel)
- WORKER-CHANGELOG.md (historique)
- Git status (changements en cours)
```

### Demandes de Monitoring
Tu peux me demander:
- "Quel est le statut du Worker?"
- "Qu'est-ce que le Worker a fait?"
- "Montre-moi les changements en cours"
- "Le Worker est-il bloqué?"

---

## ⚙️ CONFIGURATION AVANCÉE

### Modifier le Protocole

**Dans `SENTINEL-COMMANDS.json`**, section `protocol`:

```json
{
  "protocol": {
    "worker_must_read": [
      "SENTINEL-INSTRUCTIONS.md",
      "SENTINEL-COMMANDS.json"
    ],
    "worker_must_update": [
      "WORKER-STATUS.md",
      "WORKER-CHANGELOG.md"
    ],
    "commit_requires_approval": true,
    "auto_report_frequency": "on_action",
    "max_file_changes_before_report": 5,
    "require_tests_before_commit": true
  }
}
```

---

## 🔥 COMMANDES RAPIDES POUR TOI

### Assigner une tâche simple:
```
"Sentinel, dis au Worker de: [description de la tâche]"
```

### Vérifier le statut:
```
"Sentinel, status du Worker?"
```

### Approuver un commit:
```
"Sentinel, autorise le commit avec message: [message]"
```

### Arrêter le Worker:
```
"Sentinel, STOP Worker"
```

### Faire un rollback:
```
"Sentinel, rollback les changements"
```

---

## 📞 SUPPORT

**Sentinel**: Toujours actif et en surveillance
**Worker**: Attend instructions dans SAR

**Communication**: Via fichiers markdown et JSON dans `/Users/xunit/desktop/📁 Projets/sar/`

---

**Version**: 1.0.0
**Dernière mise à jour**: 2026-01-13
**Créé par**: Sentinel SAR 🛡️
