#!/bin/bash

# Script pour tester l'intégration Margill
# Simule des webhooks envoyés par Margill

API_URL="https://progression.solutionargentrapide.ca/api/webhook/margill"
API_KEY="FredRosa%1978"

echo "🔗 Test de l'intégration Margill"
echo "================================"
echo ""

# Test 1: Création d'un nouveau dossier
echo "📝 Test 1: Nouveau dossier (statut: nouveau_dossier)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "dossier_id": "12345",
    "statut_margill": "nouveau_dossier",
    "nom_client": "Jean Tremblay",
    "email_client": "jean.tremblay@example.com",
    "telephone_client": "+15145551234",
    "montant": 7500.00,
    "date_premier_paiement": "2026-02-15"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 2: Mise à jour - IBV complétée
echo "📝 Test 2: IBV complétée (statut: ibv_completee)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "dossier_id": "12345",
    "statut_margill": "ibv_completee"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 3: Offre envoyée
echo "📝 Test 3: Offre envoyée (statut: offre_envoyee)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "dossier_id": "12345",
    "statut_margill": "offre_envoyee"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 4: Contrat signé
echo "📝 Test 4: Contrat signé (statut: contrat_signe)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "dossier_id": "12345",
    "statut_margill": "contrat_signe"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 5: Prêt actif
echo "📝 Test 5: Prêt actif (statut: pret_actif)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "dossier_id": "12345",
    "statut_margill": "pret_actif"
  }' | jq .

echo ""
echo "================================"
echo "✅ Tests terminés!"
echo ""
echo "🔗 Pour voir le dossier, génère un magic link:"
echo "   Application ID: MARGILL-12345"
echo ""
echo "curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'x-api-key: $API_KEY' \\"
echo "  -d '{\"application_id\":\"MARGILL-12345\",\"phone\":\"+15145551234\"}' | jq ."
