#!/usr/bin/env bash
source .env.local

# Créer un fichier avec le secret
printf "%s" "$VOPAY_SHARED_SECRET" > /tmp/.vopay_secret

# Utiliser expect pour automatiser vercel env add
expect <<EOF
spawn vercel env add VOPAY_SHARED_SECRET production
expect "Mark as sensitive?"
send "y\r"
expect "value of VOPAY_SHARED_SECRET?"
send "$VOPAY_SHARED_SECRET\r"
expect eof
EOF

rm -f /tmp/.vopay_secret
