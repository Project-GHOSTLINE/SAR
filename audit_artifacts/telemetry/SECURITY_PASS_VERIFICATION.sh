#!/bin/bash
# SECURITY PASS VERIFICATION SCRIPT
# Tests all 5 security fixes implemented

set -e

echo "🔐 SECURITY PASS VERIFICATION"
echo "=============================="
echo ""

# Test 1: TELEMETRY_HASH_SALT Mandatory
echo "✅ Test 1: TELEMETRY_HASH_SALT Mandatory"
echo "----------------------------------------"
echo "MANUAL: Unset TELEMETRY_HASH_SALT in .env.local and submit form"
echo "EXPECTED: Console error: '[SECURITY] TELEMETRY_HASH_SALT not set - skipping hash'"
echo "EXPECTED: Session upsert skipped (check DB: client_id should be NULL)"
echo ""
read -p "Press Enter after manual test..."
echo ""

# Test 2: Device/Browser/OS from Server-Parsed UA (NOT body)
echo "✅ Test 2: Server-Side UA Parsing"
echo "-----------------------------------"
echo "MANUAL: Submit form with fake client_device='FakeDevice' in body"
echo "EXPECTED: DB shows device_type from server-parsed UA, NOT 'FakeDevice'"
echo ""
echo "SQL to verify:"
echo "SELECT device_type, browser, os FROM client_sessions ORDER BY created_at DESC LIMIT 1;"
echo ""
read -p "Press Enter after manual test..."
echo ""

# Test 3: Referrer from HTTP Header (NOT body)
echo "✅ Test 3: Referrer from HTTP Header"
echo "--------------------------------------"
echo "MANUAL: Submit form with referrer='https://fake.com' in body"
echo "MANUAL: Set HTTP Referer header to 'https://google.com' (real browser does this)"
echo "EXPECTED: DB shows first_referrer='https://google.com' (from header, NOT body)"
echo ""
echo "SQL to verify:"
echo "SELECT first_referrer FROM client_sessions ORDER BY created_at DESC LIMIT 1;"
echo ""
read -p "Press Enter after manual test..."
echo ""

# Test 4: UTM from Query Params (NOT body)
echo "✅ Test 4: UTM from Query Params"
echo "----------------------------------"
echo "MANUAL: Submit form via URL: http://localhost:3001/applications?utm_source=google&utm_campaign=test"
echo "MANUAL: Body contains utm_source='fake_source'"
echo "EXPECTED: DB shows first_utm_source='google' (from URL, NOT body)"
echo ""
echo "SQL to verify:"
echo "SELECT first_utm_source, first_utm_campaign FROM client_sessions ORDER BY created_at DESC LIMIT 1;"
echo ""
read -p "Press Enter after manual test..."
echo ""

# Test 5: Rate Limiting Active
echo "✅ Test 5: Rate Limiting on /api/telemetry/track-event"
echo "--------------------------------------------------------"
echo "AUTOMATED: Sending 25 rapid requests..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=$(openssl rand -hex 32)" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "page_view",
    "event_name": "/test",
    "payload": {"step": 1}
  }')

echo "First request: $RESPONSE"
echo ""

# Send 20 more rapid requests
for i in {1..20}; do
  curl -s -X POST http://localhost:3001/api/telemetry/track-event \
    -H "Cookie: sar_session_id=$(openssl rand -hex 32)" \
    -H "Content-Type: application/json" \
    -d '{
      "event_type": "page_view",
      "event_name": "/test",
      "payload": {"step": 1}
    }' > /dev/null
done

# 21st request should be rate limited
RATE_LIMITED=$(curl -s -w "%{http_code}" -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=$(openssl rand -hex 32)" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "page_view",
    "event_name": "/test",
    "payload": {"step": 1}
  }')

if [[ $RATE_LIMITED == *"429"* ]]; then
  echo "✅ PASS: Rate limiting active (HTTP 429 returned)"
else
  echo "❌ FAIL: Rate limiting NOT active (expected 429, got $RATE_LIMITED)"
fi
echo ""

# Test 6: No PII in Payload
echo "✅ Test 6: PII Sanitization in Payload"
echo "---------------------------------------"
echo "MANUAL: Send event with payload containing email:"
curl -s -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=$(openssl rand -hex 32)" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "form_interaction",
    "event_name": "/test",
    "payload": {
      "step": 1,
      "email": "test@example.com",
      "secret_token": "abc123"
    }
  }' | jq .

echo ""
echo "EXPECTED: Event created successfully (200 OK)"
echo ""
echo "SQL to verify (should NOT contain email or secret_token):"
echo "SELECT payload FROM client_telemetry_events ORDER BY created_at DESC LIMIT 1;"
echo "-- Expected payload: {\"step\":1} (email and secret_token stripped)"
echo ""
read -p "Press Enter after manual test..."
echo ""

# Test 7: clientId Validation
echo "✅ Test 7: clientId Validation Before Upsert"
echo "----------------------------------------------"
echo "MANUAL: Check logs when client creation fails"
echo "EXPECTED: Console error: '[Telemetry] clientId undefined, skipping session linkage'"
echo "EXPECTED: No session upsert attempted (safe failure)"
echo ""
echo "To simulate: Temporarily break clients table constraint (e.g., duplicate email)"
echo ""
read -p "Press Enter after manual test..."
echo ""

echo "=============================="
echo "🎉 SECURITY PASS VERIFICATION COMPLETE"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. Review all SQL queries above to confirm expected behavior"
echo "2. Check console logs for security warnings"
echo "3. Save evidence to audit_artifacts/telemetry/EVIDENCE/"
echo ""
