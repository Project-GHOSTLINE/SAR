# 🛡️ SENTINEL → WORKER - Instructions

**Date**: 2026-01-13
**Statut**: ✅ ACTIF
**Mode**: Coordination

---

## 📋 INSTRUCTIONS ACTUELLES

### 🎯 Tâche en cours:
**ATTENTE** - En attente d'instructions du Sentinel

### ⚠️ RÈGLES IMPORTANTES:

1. **TOUJOURS** lire ce fichier avant de commencer une tâche
2. **TOUJOURS** mettre à jour `WORKER-STATUS.md` après chaque action
3. **JAMAIS** commiter sans autorisation explicite
4. **TOUJOURS** documenter tes changements dans `WORKER-CHANGELOG.md`

---

## 📝 QUEUE DE TÂCHES

### Tâche #1: TESTER LE SYSTÈME DE MÉMOIRE
- **Statut**: ⏳ À FAIRE
- **Priorité**: 🔴 HAUTE
- **Description**: Tester le système de mémoire avant de commiter
- **Actions requises**:
  1. Créer les tables dans Supabase (exécuter database/claude-memory-system.sql)
  2. Vérifier que les 5 tables sont bien créées
  3. Exécuter le script d'initialisation (node scripts/init-claude-memory.mjs)
  4. Tester les 5 APIs REST (/api/memory/*)
  5. Vérifier que les données sont bien stockées dans Supabase
  6. Documenter les résultats dans un fichier TEST-MEMORY-SYSTEM.md
- **Fichiers concernés**:
  - database/claude-memory-system.sql (à exécuter dans Supabase)
  - scripts/init-claude-memory.mjs (à exécuter)
  - src/app/api/memory/* (à tester)
- **Conditions de succès**:
  - ✅ Tables créées sans erreur
  - ✅ Script d'init s'exécute avec succès
  - ✅ Au moins 10 documents stockés
  - ✅ Au moins 7 mémoires essentielles créées
  - ✅ APIs répondent correctement
  - ✅ Rapport de test complet généré

---

## 🔄 PROTOCOLE DE COMMUNICATION

### Quand tu commences une tâche:
1. Lire `SENTINEL-INSTRUCTIONS.md` (ce fichier)
2. Mettre à jour `WORKER-STATUS.md` avec statut "IN_PROGRESS"
3. Exécuter la tâche
4. Logger dans `WORKER-CHANGELOG.md`
5. Mettre à jour `WORKER-STATUS.md` avec statut "COMPLETED" ou "BLOCKED"

### Si tu es bloqué:
1. Mettre `WORKER-STATUS.md` à "BLOCKED"
2. Décrire le problème dans la section "Issues"
3. Attendre nouvelles instructions

### Si tu as terminé:
1. Mettre `WORKER-STATUS.md` à "COMPLETED"
2. Résumer le travail dans `WORKER-CHANGELOG.md`
3. Attendre validation Sentinel avant commit

---

## 🚨 COMMANDES RAPIDES

### `STOP`
Arrête immédiatement toute activité et attends instructions

### `CONTINUE`
Continue la tâche en cours

### `PAUSE`
Met en pause, sauvegarde l'état, attends

### `COMMIT`
Commit les changements (seulement après validation Sentinel)

### `ROLLBACK`
Annule les derniers changements

---

## 📊 CONTEXTE ACTUEL DU PROJET

**Projet**: SAR (Solution Argent Rapide)
**Tech Stack**: Next.js, TypeScript, Supabase, VoPay
**Environnement**: Development

**Derniers changements détectés**:
- ✅ Système de mémoire Claude créé
- ✅ 5 APIs REST créées (`/api/memory/*`)
- ✅ Table SQL complète dans `database/claude-memory-system.sql`

---

## 🎯 PROCHAINES ÉTAPES SUGGÉRÉES

_(Sera rempli par le Sentinel selon les besoins)_

1. En attente d'instructions...

---

**Dernière mise à jour**: 2026-01-13 18:15:00
**Par**: Sentinel SAR
**Version**: 1.0.0
