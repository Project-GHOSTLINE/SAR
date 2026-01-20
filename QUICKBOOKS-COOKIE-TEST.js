/**
 * 🔍 TEST COOKIES & SESSION ADMIN
 * Copie ce script dans la console pour tester les cookies
 */

(async function testCookies() {
  console.clear();
  console.log('%c🍪 COOKIE & SESSION TEST', 'background: #10B981; color: white; font-size: 20px; padding: 10px; font-weight: bold;');
  console.log('');

  // ═══════════════════════════════════════════════════════
  // 1. CHECK ALL COOKIES (including httpOnly via fetch)
  // ═══════════════════════════════════════════════════════
  console.log('%c1️⃣ Vérification des cookies', 'background: #3B82F6; color: white; padding: 5px; font-weight: bold;');
  console.log('');

  // JavaScript accessible cookies
  const jsCookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) acc[key] = value || '';
    return acc;
  }, {});

  console.log('Cookies JavaScript (non-httpOnly):');
  console.table(jsCookies);

  // Test if admin-session exists via a test request
  console.log('');
  console.log('Test si admin-session existe (via API)...');

  try {
    const testResponse = await fetch('/api/admin/messages?limit=1', {
      credentials: 'include'
    });

    console.log('Status:', testResponse.status);

    if (testResponse.status === 401) {
      console.log('%c❌ PAS DE SESSION ADMIN', 'background: red; color: white; padding: 5px; font-weight: bold;');
      console.log('   Le cookie admin-session n\'existe pas ou est invalide');
    } else if (testResponse.ok) {
      console.log('%c✅ SESSION ADMIN VALIDE', 'background: green; color: white; padding: 5px; font-weight: bold;');
      console.log('   Le cookie admin-session existe et est valide');
    } else {
      console.log(`⚠️  Status inattendu: ${testResponse.status}`);
    }
  } catch (error) {
    console.error('Erreur test session:', error);
  }

  // ═══════════════════════════════════════════════════════
  // 2. TEST LOGIN
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c2️⃣ Test de login', 'background: #3B82F6; color: white; padding: 5px; font-weight: bold;');
  console.log('');

  const password = prompt('Entre le mot de passe admin (ou Cancel pour skip):');

  if (password) {
    console.log('Login en cours...');

    try {
      const loginResponse = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok && loginData.success) {
        console.log('%c✅ LOGIN RÉUSSI!', 'background: green; color: white; padding: 5px; font-weight: bold;');
        console.log('Cookie admin-session devrait maintenant être défini');

        // Re-test after login
        console.log('');
        console.log('Re-vérification de la session...');

        const retestResponse = await fetch('/api/admin/messages?limit=1', {
          credentials: 'include'
        });

        if (retestResponse.status === 401) {
          console.log('%c❌ COOKIE NON DÉFINI APRÈS LOGIN!', 'background: red; color: white; padding: 5px; font-weight: bold;');
          console.log('   PROBLÈME: Le cookie n\'a pas été envoyé au navigateur');
          console.log('   CAUSES POSSIBLES:');
          console.log('   1. Problème de domaine (localhost vs production)');
          console.log('   2. Secure flag en production sans HTTPS');
          console.log('   3. SameSite configuration incorrecte');
        } else if (retestResponse.ok) {
          console.log('%c✅ COOKIE DÉFINI ET VALIDE', 'background: green; color: white; padding: 5px; font-weight: bold;');
        }

      } else {
        console.log('%c❌ LOGIN ÉCHOUÉ', 'background: red; color: white; padding: 5px; font-weight: bold;');
        console.log('Réponse:', loginData);
      }

    } catch (error) {
      console.error('Erreur login:', error);
    }
  } else {
    console.log('Login skippé');
  }

  // ═══════════════════════════════════════════════════════
  // 3. TEST QUICKBOOKS CONNECT
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c3️⃣ Test QuickBooks Connect', 'background: #3B82F6; color: white; padding: 5px; font-weight: bold;');
  console.log('');

  const doQbTest = confirm('Tester la connexion QuickBooks maintenant?');

  if (doQbTest) {
    console.log('Test de /api/quickbooks/auth/connect...');

    try {
      const qbResponse = await fetch('/api/quickbooks/auth/connect', {
        credentials: 'include'
      });

      const qbData = await qbResponse.json();

      console.log('Status:', qbResponse.status);
      console.log('Response:', qbData);

      if (qbData.authUrl) {
        console.log('%c✅ AUTH URL REÇUE', 'background: green; color: white; padding: 5px; font-weight: bold;');
        console.log('URL:', qbData.authUrl);

        const goToQb = confirm('Rediriger vers QuickBooks maintenant?');
        if (goToQb) {
          window.location.href = qbData.authUrl;
        }
      } else {
        console.log('%c❌ PAS D\'AUTH URL', 'background: red; color: white; padding: 5px; font-weight: bold;');
      }

    } catch (error) {
      console.error('Erreur QB connect:', error);
    }
  }

  // ═══════════════════════════════════════════════════════
  // 4. DIAGNOSTIC FINAL
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c📋 DIAGNOSTIC FINAL', 'background: #8B5CF6; color: white; padding: 5px; font-weight: bold;');
  console.log('');

  const finalTest = await fetch('/api/admin/messages?limit=1', { credentials: 'include' });

  const diagnostic = {
    cookiesEnabled: navigator.cookieEnabled,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    isHTTPS: window.location.protocol === 'https:',
    adminSessionExists: finalTest.status !== 401,
    jsCookieCount: Object.keys(jsCookies).length
  };

  console.table(diagnostic);

  if (!diagnostic.adminSessionExists) {
    console.log('');
    console.log('%c⚠️  ACTIONS REQUISES:', 'background: orange; color: white; padding: 5px; font-weight: bold;');
    console.log('');
    console.log('1. Vérifie que tu es bien sur admin.solutionargentrapide.ca (pas localhost)');
    console.log('2. Essaie de te déconnecter et reconnecter via l\'interface');
    console.log('3. Vérifie les cookies dans DevTools → Application → Cookies');
    console.log('4. Check si un bloqueur de cookies est actif');
    console.log('');
    console.log('Si le problème persiste, partage cette sortie avec le dev.');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');

  return diagnostic;
})();
