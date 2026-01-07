#!/bin/bash

source .env.local

echo "🔧 Ajout de SUPABASE_SERVICE_KEY en Production..."
echo ""

# Créer un fichier temporaire avec la clé
TEMP_FILE=$(mktemp)
echo -n "$SUPABASE_SERVICE_KEY" > "$TEMP_FILE"

# Ajouter via Vercel CLI
cat "$TEMP_FILE" | vercel env add SUPABASE_SERVICE_KEY production <<< "y"

# Nettoyer
rm "$TEMP_FILE"

echo ""
echo "✅ Variable ajoutée!"
echo ""
echo "⏳ Maintenant, redéploie avec:"
echo "   git commit --allow-empty -m 'redeploy' && git push"
