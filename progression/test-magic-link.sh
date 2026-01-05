#!/bin/bash

# Script pour générer un magic link de test
# Usage: ./test-magic-link.sh

echo "🔗 Génération d'un magic link pour TEST-2026-001..."

curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: 44fc1f27922cc5e1e9c544eb8e0bbfeadf0d8c10c64c44fedcf3bd18f51e3202" \
  -d '{"application_id":"TEST-2026-001","phone":"+15141234567"}' | jq .

echo ""
echo "✅ Copie le magic_link_url et ouvre-le dans ton navigateur!"
