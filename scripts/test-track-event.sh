#!/bin/bash
# Test /api/telemetry/track-event endpoint

echo "🧪 Testing /api/telemetry/track-event endpoint..."
echo ""

curl -X POST http://localhost:3001/api/telemetry/track-event \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sar_session_id=test123456789012345678901234567890123456789012345678901234567890' \
  -d '{"event_type":"page_view","event_name":"/test","utm_source":"google","utm_medium":"cpc","utm_campaign":"test"}' \
  --silent --show-error

echo ""
echo ""
echo "✅ Test complete. Check server logs for [TrackEvent] messages."
