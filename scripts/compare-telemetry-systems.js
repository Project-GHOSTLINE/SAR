/**
 * Compare Telemetry Systems
 *
 * System 1: /api/telemetry/write (technical tracing)
 * System 2: /api/telemetry/track-event (user tracking)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function compareSystemes() {
  console.log('📊 COMPARAISON DES 2 SYSTÈMES DE TÉLÉMÉTRIE');
  console.log('='.repeat(80));
  console.log('');

  // ============================================================================
  // SYSTÈME 1: Technical Tracing (/api/telemetry/write)
  // ============================================================================
  console.log('🔧 SYSTÈME 1: Technical Tracing (existant)');
  console.log('-'.repeat(80));

  const system1Tables = [
    'telemetry_requests',
    'telemetry_spans',
    'telemetry_security'
  ];

  for (const table of system1Tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table "${table}" - N'EXISTE PAS ou pas accessible`);
      } else {
        console.log(`✅ Table "${table}" - EXISTE`);
        if (data && data.length > 0) {
          console.log(`   Colonnes: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ Table "${table}" - ERREUR: ${err.message}`);
    }
  }

  console.log('');

  // ============================================================================
  // SYSTÈME 2: User Tracking (/api/telemetry/track-event)
  // ============================================================================
  console.log('👤 SYSTÈME 2: User Tracking (nouveau - Phase 2)');
  console.log('-'.repeat(80));

  const system2Tables = [
    'client_sessions',
    'client_telemetry_events',
    'security_events',
    'client_pattern_hits'
  ];

  for (const table of system2Tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table "${table}" - N'EXISTE PAS ou pas accessible`);
      } else {
        console.log(`✅ Table "${table}" - EXISTE`);
        if (data && data.length > 0) {
          console.log(`   Colonnes: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ Table "${table}" - ERREUR: ${err.message}`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('');

  // ============================================================================
  // ANALYSE DES DIFFÉRENCES
  // ============================================================================
  console.log('🔍 ANALYSE: Différences entre les systèmes');
  console.log('='.repeat(80));
  console.log('');

  console.log('📋 SYSTÈME 1 (Technical Tracing):');
  console.log('   Objectif: Tracer les requêtes HTTP, performances serveur, erreurs');
  console.log('   Tables:');
  console.log('     • telemetry_requests  → Requêtes HTTP (URL, method, status, duration)');
  console.log('     • telemetry_spans     → Traces distribuées (OpenTelemetry-like)');
  console.log('     • telemetry_security  → Événements sécurité techniques');
  console.log('   Données typiques:');
  console.log('     - trace_id, span_id');
  console.log('     - HTTP method, path, status_code');
  console.log('     - Duration, timestamps');
  console.log('     - Error messages, stack traces');
  console.log('');

  console.log('📋 SYSTÈME 2 (User Tracking):');
  console.log('   Objectif: Tracking utilisateur, attribution marketing, fraude');
  console.log('   Tables:');
  console.log('     • client_sessions         → Sessions utilisateur (anonymes → liées)');
  console.log('     • client_telemetry_events → Événements utilisateur (page views, clics)');
  console.log('     • security_events         → Détection fraude (VPN, bots, anomalies)');
  console.log('     • client_pattern_hits     → Patterns de fraude détectés');
  console.log('   Données typiques:');
  console.log('     - session_id (pseudonyme)');
  console.log('     - client_id (UUID, linkage volontaire)');
  console.log('     - Referrer, UTM params');
  console.log('     - Device, Browser, OS');
  console.log('     - ASN, Country, IP hash');
  console.log('     - Fraud scores, risk levels');
  console.log('');

  console.log('='.repeat(80));
  console.log('');

  // ============================================================================
  // OVERLAP / DUPLICATIONS?
  // ============================================================================
  console.log('⚠️  OVERLAP / DUPLICATIONS?');
  console.log('='.repeat(80));
  console.log('');

  console.log('🔍 Métriques communes potentielles:');
  console.log('');

  console.log('1️⃣  IP Address / IP Hash:');
  console.log('   Système 1 (telemetry_security): Peut stocker IP pour sécurité technique');
  console.log('   Système 2 (client_sessions):    Stocke IP hash (SHA256) pour fraude');
  console.log('   ❓ OVERLAP? Potentiel, mais objectifs différents');
  console.log('');

  console.log('2️⃣  User Agent:');
  console.log('   Système 1 (telemetry_requests): Peut stocker UA pour debugging');
  console.log('   Système 2 (client_sessions):    Stocke UA hash + parsing (device/browser/os)');
  console.log('   ❓ OVERLAP? Potentiel, mais traitement différent');
  console.log('');

  console.log('3️⃣  Timestamps / Durées:');
  console.log('   Système 1 (telemetry_requests): Performance serveur (ms, traces)');
  console.log('   Système 2 (client_telemetry_events): Durée client-side (scroll, form)');
  console.log('   ✅ PAS D\'OVERLAP - Contextes différents');
  console.log('');

  console.log('4️⃣  Événements de sécurité:');
  console.log('   Système 1 (telemetry_security): Erreurs techniques (rate limit, auth fail)');
  console.log('   Système 2 (security_events):    Détection fraude (VPN, country change, bots)');
  console.log('   ❓ OVERLAP? Léger, mais focus différent');
  console.log('');

  console.log('='.repeat(80));
  console.log('');

  // ============================================================================
  // RECOMMANDATION
  // ============================================================================
  console.log('💡 RECOMMANDATION');
  console.log('='.repeat(80));
  console.log('');

  console.log('✅ GARDER LES 2 SYSTÈMES SÉPARÉS');
  console.log('');
  console.log('Raisons:');
  console.log('  1. Objectifs différents:');
  console.log('     • Système 1 = Monitoring technique / debugging / performance');
  console.log('     • Système 2 = Analytics utilisateur / marketing / fraude');
  console.log('');
  console.log('  2. Audiences différentes:');
  console.log('     • Système 1 = Développeurs, DevOps, SRE');
  console.log('     • Système 2 = Marketing, Police, Fraud Team');
  console.log('');
  console.log('  3. Rétention différente:');
  console.log('     • Système 1 = Court terme (7-30j debug)');
  console.log('     • Système 2 = Long terme (30-90j analytics, permanent fraud patterns)');
  console.log('');
  console.log('  4. Privacy niveau différent:');
  console.log('     • Système 1 = Données techniques (moins sensible)');
  console.log('     • Système 2 = Données utilisateur (GDPR strict, hashing obligatoire)');
  console.log('');

  console.log('🔧 Actions recommandées:');
  console.log('  [ ] Documenter clairement les 2 systèmes (éviter confusion)');
  console.log('  [ ] Ajouter correlation ID entre les 2 (trace_id ↔ session_id)');
  console.log('  [ ] Intégrer Système 2 sans toucher Système 1');
  console.log('  [ ] Créer dashboards séparés pour chaque système');
  console.log('');

  console.log('='.repeat(80));
}

compareSystemes().catch(console.error);
