#!/bin/bash

echo "🧪 VALIDATION COMPLÈTE - Solution Argent Rapide"
echo "=================================================="
echo ""

FAILED=0
PASSED=0

# Test 1: Site principal
echo "✓ Test 1: Site principal..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://solutionargentrapide.ca)
if [ "$STATUS" = "200" ]; then
  echo "  ✅ PASS: Site principal (200)"
  ((PASSED++))
else
  echo "  ❌ FAIL: Site principal ($STATUS)"
  ((FAILED++))
fi

# Test 2: Sous-domaine partners
echo "✓ Test 2: Sous-domaine partners..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://partners.solutionargentrapide.ca/invite)
if [ "$STATUS" = "200" ]; then
  echo "  ✅ PASS: Sous-domaine partners (200)"
  ((PASSED++))
else
  echo "  ❌ FAIL: Sous-domaine partners ($STATUS)"
  ((FAILED++))
fi

# Test 3: Telemetry
echo "✓ Test 3: Telemetry endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://solutionargentrapide.ca/api/telemetry/track-event \
  -H "Content-Type: application/json" \
  -H "x-sar-visit-id: test-123" \
  -d '{"event_name":"test","page_path":"/test"}')
if [ "$STATUS" != "405" ] && [ "$STATUS" != "404" ]; then
  echo "  ✅ PASS: Telemetry fonctionne ($STATUS)"
  ((PASSED++))
else
  echo "  ❌ FAIL: Telemetry ($STATUS)"
  ((FAILED++))
fi

# Test 4: Redirect main -> partners
echo "✓ Test 4: Redirect /partners/* vers subdomain..."
LOCATION=$(curl -s -o /dev/null -w "%{redirect_url}" https://solutionargentrapide.ca/partners/invite)
if echo "$LOCATION" | grep -q "partners.solutionargentrapide.ca"; then
  echo "  ✅ PASS: Redirect fonctionne"
  ((PASSED++))
else
  echo "  ❌ FAIL: Redirect ne fonctionne pas"
  ((FAILED++))
fi

# Test 5: Admin dashboard accessible
echo "✓ Test 5: Dashboard admin..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://admin.solutionargentrapide.ca/admin/dashboard)
if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ]; then
  echo "  ✅ PASS: Dashboard admin accessible ($STATUS)"
  ((PASSED++))
else
  echo "  ❌ FAIL: Dashboard admin ($STATUS)"
  ((FAILED++))
fi

# Test 6: DevOps stats (should work after SQL fix)
echo "✓ Test 6: DevOps stats API..."
RESPONSE=$(curl -s https://dllyzfuqjzuhvshrlmuq.supabase.co/rest/v1/rpc/get_devops_stats \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTU5ODEsImV4cCI6MjA4MTU3MTk4MX0.xskVblRlKdbTST1Mdgz76oR7N2rDq8ZOUgaN-f_TTM4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo")

if echo "$RESPONSE" | grep -q "nested"; then
  echo "  ⚠️  ATTENTION: Correction SQL requise"
  echo "  → Voir DEVOPS-FIX-REQUIRED.md"
  echo "  → SQL disponible dans: /tmp/DEVOPS-FIX.sql"
  ((FAILED++))
elif echo "$RESPONSE" | grep -q "total_tasks"; then
  echo "  ✅ PASS: DevOps stats fonctionne!"
  ((PASSED++))
else
  echo "  ❌ Response: $RESPONSE"
  ((FAILED++))
fi

echo ""
echo "=================================================="
echo "RÉSULTATS: $PASSED réussis, $FAILED échoués"
echo "=================================================="
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 TOUT FONCTIONNE À 100%"
  exit 0
elif [ $FAILED -eq 1 ] && echo "$RESPONSE" | grep -q "nested"; then
  echo "⚠️  PRESQUE PARFAIT - 1 action manuelle requise:"
  echo ""
  echo "📋 Appliquer le fix SQL (1 minute):"
  echo "   1. Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql"
  echo "   2. Copier le contenu de: /tmp/DEVOPS-FIX.sql"
  echo "   3. Coller dans l'éditeur SQL et cliquer 'Run'"
  echo "   4. Relancer ce script pour confirmer"
  echo ""
  echo "Ensuite tout sera 100% fonctionnel ✅"
  exit 1
else
  echo "❌ $FAILED problèmes détectés"
  exit 1
fi
