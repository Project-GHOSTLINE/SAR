#!/bin/bash

cd "$(dirname "$0")"

echo "🎯 Démarrage du serveur unifié..."
echo ""

# Activer l'environnement virtuel
source venv/bin/activate

# Lancer le serveur
python app.py
