#!/bin/bash

source .env.local

echo "🔧 Ajout de SUPABASE_SERVICE_KEY en Production (méthode propre)..."
echo ""

# Utiliser expect pour automatiser proprement
expect <<EOF
spawn vercel env add SUPABASE_SERVICE_KEY production
expect "Mark as sensitive?"
send "y\r"
expect "value of SUPABASE_SERVICE_KEY?"
send "$SUPABASE_SERVICE_KEY\r"
expect eof
EOF

echo ""
echo "✅ Fait!"
