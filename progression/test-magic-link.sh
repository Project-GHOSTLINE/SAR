#!/bin/bash

# Script pour générer un magic link de test
# Usage: ./test-magic-link.sh

echo "🔗 Génération d'un magic link pour TEST-2026-001..."

curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{"application_id":"TEST-2026-001","phone":"+15141234567"}' | jq .

echo ""
echo "✅ Copie le magic_link_url et ouvre-le dans ton navigateur!"
