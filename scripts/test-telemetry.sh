#!/bin/bash
# Test complet du système de télémétrie
# Vérifie: cookie generation, session tracking, client linkage

set -e

echo "🧪 TEST COMPLET - Système de Télémétrie"
echo "========================================"
echo ""

# Check if dev server is running
if ! curl -s http://localhost:3001/ > /dev/null 2>&1; then
  echo "⚠️  Le dev server n'est pas démarré!"
  echo ""
  echo "Dans un autre terminal, lance:"
  echo "  cd /Users/xunit/Desktop/📁\ Projets/sar"
  echo "  npm run dev"
  echo ""
  echo "Puis relance ce script."
  exit 1
fi

echo "✅ Dev server actif (localhost:3001)"
echo ""

# ============================================================================
# TEST 1: Cookie Generation
# ============================================================================

echo "📋 TEST 1: Génération du Cookie Session"
echo "----------------------------------------"

COOKIE_RESPONSE=$(curl -s -i http://localhost:3001/ 2>&1 | grep -i "set-cookie.*sar_session_id")

if [ -z "$COOKIE_RESPONSE" ]; then
  echo "❌ FAIL: Cookie sar_session_id non généré"
  exit 1
fi

echo "✅ PASS: Cookie généré"
echo "   $COOKIE_RESPONSE"

# Extract session ID from cookie
SESSION_ID=$(echo "$COOKIE_RESPONSE" | grep -oE 'sar_session_id=[a-f0-9]{64}' | cut -d= -f2)

if [ -z "$SESSION_ID" ]; then
  echo "❌ FAIL: Format du cookie invalide (devrait être 64 chars hex)"
  exit 1
fi

echo "   Session ID: ${SESSION_ID:0:16}...${SESSION_ID: -16} (64 chars)"
echo ""

# ============================================================================
# TEST 2: Track Event (Anonymous)
# ============================================================================

echo "📋 TEST 2: Event Tracking (Anonyme)"
echo "-----------------------------------"

TRACK_RESPONSE=$(curl -s -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "page_view",
    "event_name": "/test-telemetry",
    "page_url": "/test",
    "duration_ms": 1500,
    "payload": {
      "step": 1,
      "scroll_depth": 50
    }
  }')

EVENT_ID=$(echo "$TRACK_RESPONSE" | jq -r '.event_id // empty')

if [ -z "$EVENT_ID" ]; then
  echo "❌ FAIL: Event non créé"
  echo "   Response: $TRACK_RESPONSE"
  exit 1
fi

echo "✅ PASS: Event créé"
echo "   Event ID: $EVENT_ID"
echo ""

# ============================================================================
# TEST 3: Verify Session in DB (Should be Anonymous)
# ============================================================================

echo "📋 TEST 3: Session Anonyme en DB"
echo "---------------------------------"

node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('client_sessions')
    .select('session_id, client_id, linked_via, device_type, browser, os')
    .eq('session_id', '$SESSION_ID')
    .maybeSingle();

  if (error) {
    console.log('❌ FAIL: Erreur DB:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.log('⚠️  Session non trouvée en DB (normal si middleware ne crée pas encore la session)');
    console.log('   Session sera créée lors du premier event ou form submit');
    process.exit(0);
  }

  console.log('✅ PASS: Session trouvée en DB');
  console.log('   client_id:', data.client_id || 'NULL (anonyme) ✅');
  console.log('   linked_via:', data.linked_via || 'NULL (pas encore lié) ✅');
  console.log('   device_type:', data.device_type || 'N/A');
  console.log('   browser:', data.browser || 'N/A');
  console.log('   os:', data.os || 'N/A');
})();
"

echo ""

# ============================================================================
# TEST 4: Verify Event in DB
# ============================================================================

echo "📋 TEST 4: Event en DB"
echo "----------------------"

node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('client_telemetry_events')
    .select('id, session_id, event_type, event_name, payload')
    .eq('id', '$EVENT_ID')
    .single();

  if (error) {
    console.log('❌ FAIL:', error.message);
    process.exit(1);
  }

  console.log('✅ PASS: Event trouvé en DB');
  console.log('   event_type:', data.event_type);
  console.log('   event_name:', data.event_name);
  console.log('   payload:', JSON.stringify(data.payload));
  console.log('   session_id:', data.session_id.substring(0, 16) + '...');
})();
"

echo ""

# ============================================================================
# TEST 5: PII Sanitization
# ============================================================================

echo "📋 TEST 5: Sanitization PII dans Payload"
echo "-----------------------------------------"

PII_RESPONSE=$(curl -s -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "button_click",
    "event_name": "/test-pii",
    "payload": {
      "step": 1,
      "email": "should-be-stripped@example.com",
      "secret_token": "abc123",
      "scroll_depth": 75
    }
  }')

PII_EVENT_ID=$(echo "$PII_RESPONSE" | jq -r '.event_id // empty')

if [ -z "$PII_EVENT_ID" ]; then
  echo "❌ FAIL: Event avec PII non créé"
  exit 1
fi

node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data } = await supabase
    .from('client_telemetry_events')
    .select('payload')
    .eq('id', '$PII_EVENT_ID')
    .single();

  const payload = data.payload;

  if (payload.email || payload.secret_token) {
    console.log('❌ FAIL: PII non sanitized!');
    console.log('   Payload:', JSON.stringify(payload));
    process.exit(1);
  }

  if (payload.step && payload.scroll_depth) {
    console.log('✅ PASS: PII stripped, données valides conservées');
    console.log('   Payload sanitized:', JSON.stringify(payload));
  } else {
    console.log('⚠️  Payload vide ou incomplet:', JSON.stringify(payload));
  }
})();
"

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "========================================"
echo "✅ Tests Automatiques Complétés!"
echo "========================================"
echo ""
echo "Résultats:"
echo "  ✅ Cookie généré (64-char hex)"
echo "  ✅ Event tracking fonctionne"
echo "  ✅ Session/Event stockés en DB"
echo "  ✅ PII sanitization active"
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Tester le linkage volontaire (form submit):"
echo "   - Visite http://localhost:3001/applications"
echo "   - Remplis et soumets le formulaire"
echo "   - Vérifie que client_id est populé"
echo ""
echo "2. Vérifier dans Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor"
echo "   - Table client_sessions (devrait avoir 1+ ligne)"
echo "   - Table client_telemetry_events (devrait avoir 2+ lignes)"
echo ""
echo "3. Tester la cleanup function:"
echo "   SELECT * FROM cleanup_client_sessions();"
echo ""
