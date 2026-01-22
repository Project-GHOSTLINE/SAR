# IBV Crawler V2 - Chrome Extension

Extension Chrome pour l'extraction automatique des données Inverite et upload vers Solution Argent Rapide.

## Fonctionnalités

- ✅ Auto-détection des pages Inverite complétées
- ✅ Extraction automatique des données client
- ✅ Upload automatique vers l'API SAR
- ✅ Notifications de succès/erreur
- ✅ Configuration via popup
- ✅ Manifest V3 (dernière version)

## Installation

### 1. Mode Développement (Local)

1. Ouvrir Chrome et aller à `chrome://extensions/`
2. Activer le "Mode développeur" (en haut à droite)
3. Cliquer sur "Charger l'extension non empaquetée"
4. Sélectionner le dossier `extensions/ibv-crawler-v2`

### 2. Mode Production (Chrome Web Store)

_À venir après publication_

## Utilisation

### Extraction Automatique

1. Aller sur Inverite (https://app.inverite.com)
2. Compléter une vérification client
3. L'extension détecte automatiquement la complétion
4. Les données sont extraites et uploadées vers SAR
5. Une notification de succès/erreur s'affiche

### Configuration

1. Cliquer sur l'icône de l'extension dans la toolbar
2. Options disponibles:
   - **Ouvrir Admin Panel**: Accès direct à l'admin SAR
   - **Toggle Auto-Upload**: Activer/désactiver l'upload automatique

## Structure des Fichiers

```
ibv-crawler-v2/
├── manifest.json       # Configuration de l'extension (Manifest V3)
├── background.js       # Service worker (gestion des événements)
├── content-script.js   # Script injecté sur Inverite (extraction)
├── popup.html          # Interface utilisateur du popup
├── popup.js            # Logique du popup
├── icons/              # Icônes de l'extension
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md           # Documentation
```

## API Endpoint

L'extension upload les données vers:
```
POST https://admin.solutionargentrapide.ca/api/admin/client-analysis
```

## Permissions

- `storage`: Sauvegarder la configuration localement
- `activeTab`: Accéder à l'onglet actif pour extraction
- `host_permissions`: Accès aux domaines Inverite et SAR

## Sécurité

- Les données sont transmises via HTTPS uniquement
- Authentification via origine de confiance (trusted origin)
- Pas de stockage de données sensibles dans l'extension
- Logs uniquement en console (pas de tracking externe)

## Développement

### Logs de Debug

Ouvrir la console Chrome:
- Content Script: Inspecter la page Inverite > Console
- Background Worker: `chrome://extensions/` > Détails > Inspecter les vues
- Popup: Clic droit sur popup > Inspecter

### Préfixe des Logs

Tous les logs utilisent le préfixe `[IBV-Crawler-V2]` pour faciliter le filtrage.

## Changelog

### Version 2.0.0 (2026-01-22)

- ✅ Migration vers Manifest V3
- ✅ Extraction automatique des données Inverite
- ✅ Upload automatique vers API SAR
- ✅ Interface popup améliorée
- ✅ Support du risk score et microloans
- ✅ Notifications visuelles (badge)

## Support

Pour toute question ou problème:
- Email: support@solutionargentrapide.ca
- Admin Panel: https://admin.solutionargentrapide.ca

## Licence

© 2026 Solution Argent Rapide Inc. Tous droits réservés.
