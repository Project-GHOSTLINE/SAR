#!/bin/bash
# Watch Telemetry Data in Real-Time

echo "📊 TELEMETRY LIVE DASHBOARD"
echo "==========================="
echo ""
echo "Rafraîchissement toutes les 3 secondes..."
echo "Appuie sur Ctrl+C pour arrêter"
echo ""

while true; do
  clear

  echo "╔════════════════════════════════════════════════════════════════════╗"
  echo "║                  📊 TELEMETRY LIVE DASHBOARD                       ║"
  echo "╚════════════════════════════════════════════════════════════════════╝"
  echo ""
  date "+🕐 %H:%M:%S"
  echo ""

  # Sessions Count
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 CLIENT SESSIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  node -e "
  const { createClient } = require('@supabase/supabase-js');
  require('dotenv').config({ path: '.env.local' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  (async () => {
    const { data: sessions, error } = await supabase
      .from('client_sessions')
      .select('session_id, client_id, linked_via, device_type, browser, os, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ Erreur:', error.message);
      return;
    }

    const total = sessions.length;
    const anonymous = sessions.filter(s => !s.client_id).length;
    const linked = sessions.filter(s => s.client_id).length;

    console.log('Total Sessions:', total);
    console.log('  ├─ Anonymes:', anonymous, '(client_id = NULL)');
    console.log('  └─ Liées:', linked, '(client_id NOT NULL)');
    console.log('');

    if (sessions.length === 0) {
      console.log('⚠️  Aucune session trouvée');
      console.log('   Visite http://localhost:3001 pour créer une session');
      return;
    }

    console.log('🔍 Dernières sessions:');
    console.log('');

    sessions.forEach((s, i) => {
      const sessionShort = s.session_id.substring(0, 16) + '...';
      const clientStatus = s.client_id
        ? '✅ Lié (' + s.linked_via + ')'
        : '⚪️ Anonyme';
      const device = s.device_type || 'N/A';
      const browser = s.browser || 'N/A';
      const time = new Date(s.created_at).toLocaleTimeString('fr-CA');

      console.log(\`  \${i + 1}. Session: \${sessionShort}\`);
      console.log(\`     Status: \${clientStatus}\`);
      console.log(\`     Device: \${device} | \${browser}\`);
      console.log(\`     Créé: \${time}\`);
      console.log('');
    });
  })().catch(console.error);
  " 2>&1 | grep -v "dotenv@"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 TELEMETRY EVENTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  node -e "
  const { createClient } = require('@supabase/supabase-js');
  require('dotenv').config({ path: '.env.local' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  (async () => {
    const { data: events, error } = await supabase
      .from('client_telemetry_events')
      .select('event_type, event_name, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ Erreur:', error.message);
      return;
    }

    console.log('Total Events:', events.length);
    console.log('');

    if (events.length === 0) {
      console.log('⚠️  Aucun event trouvé');
      console.log('   Navigue sur le site pour générer des events');
      return;
    }

    console.log('🔍 Derniers events:');
    console.log('');

    events.forEach((e, i) => {
      const time = new Date(e.created_at).toLocaleTimeString('fr-CA');
      const payload = JSON.stringify(e.payload);

      console.log(\`  \${i + 1}. \${e.event_type}: \${e.event_name}\`);
      console.log(\`     Payload: \${payload}\`);
      console.log(\`     Time: \${time}\`);
      console.log('');
    });
  })().catch(console.error);
  " 2>&1 | grep -v "dotenv@"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "💡 ACTIONS:"
  echo "   • Visite http://localhost:3001 pour créer une session"
  echo "   • Remplis le formulaire /applications pour tester le linkage"
  echo "   • Ctrl+C pour arrêter le monitoring"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  sleep 3
done
