/**
 * 🔧 QuickBooks Debug & Diagnostic Script
 * Copie et colle ce script dans la console Chrome/Firefox
 * Sur la page: https://admin.solutionargentrapide.ca/admin/quickbooks
 */

(async function debugQuickBooks() {
  console.clear();
  console.log('%c🔧 QUICKBOOKS DEBUG SUITE', 'background: #10B981; color: white; font-size: 20px; padding: 10px; font-weight: bold;');
  console.log('');

  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    errors: [],
    data: {}
  };

  // ═══════════════════════════════════════════════════════
  // 1. URL PARAMS
  // ═══════════════════════════════════════════════════════
  console.log('%c📍 1. URL Parameters', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  const params = new URLSearchParams(window.location.search);
  const urlParams = {
    success: params.get('success'),
    error: params.get('error'),
    code: params.get('code'),
    realmId: params.get('realmId'),
    state: params.get('state')
  };

  console.table(urlParams);
  report.data.urlParams = urlParams;

  // ═══════════════════════════════════════════════════════
  // 2. COOKIES
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c🍪 2. Cookies', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const relevantCookies = {
    'qb_oauth_state': cookies['qb_oauth_state'] || 'NOT SET',
    'admin-session': cookies['admin-session'] ? 'SET (hidden)' : 'NOT SET'
  };

  console.table(relevantCookies);
  report.data.cookies = relevantCookies;

  // ═══════════════════════════════════════════════════════
  // 3. LOCAL STORAGE
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c💾 3. Local Storage', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  const localStorage_data = {};
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key) && key.includes('quickbooks')) {
      localStorage_data[key] = localStorage[key];
    }
  }

  if (Object.keys(localStorage_data).length === 0) {
    console.log('No QuickBooks data in localStorage');
  } else {
    console.table(localStorage_data);
  }
  report.data.localStorage = localStorage_data;

  // ═══════════════════════════════════════════════════════
  // 4. QUICKBOOKS STATUS API
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c📊 4. QuickBooks Status API', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');

  try {
    const statusResponse = await fetch('/api/quickbooks/status', {
      credentials: 'include'
    });

    const statusData = await statusResponse.json();

    console.log('Status Response:', statusResponse.status);
    console.log('Connected:', statusData.connection?.connected);
    console.log('Company Name:', statusData.connection?.companyName);
    console.log('Realm ID:', statusData.connection?.realmId);
    console.log('Full Response:', statusData);

    report.data.status = {
      httpStatus: statusResponse.status,
      data: statusData
    };
  } catch (error) {
    console.error('❌ Error fetching status:', error);
    report.errors.push({
      type: 'status_api_error',
      message: error.message
    });
  }

  // ═══════════════════════════════════════════════════════
  // 5. NETWORK ERRORS (Last 10 requests)
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c🌐 5. Recent Network Errors', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');

  const performanceEntries = performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('quickbooks') || entry.name.includes('api'))
    .slice(-10);

  if (performanceEntries.length > 0) {
    console.table(performanceEntries.map(e => ({
      url: e.name.split('/').slice(-3).join('/'),
      duration: `${Math.round(e.duration)}ms`,
      transferSize: `${Math.round(e.transferSize / 1024)}KB`
    })));
  } else {
    console.log('No recent API requests found');
  }

  report.data.networkRequests = performanceEntries.length;

  // ═══════════════════════════════════════════════════════
  // 6. CONSOLE ERRORS
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c⚠️  6. Console Errors', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');

  // Intercept console.error
  const originalError = console.error;
  const recentErrors = [];

  console.error = function(...args) {
    recentErrors.push({
      timestamp: new Date().toISOString(),
      message: args.join(' ')
    });
    originalError.apply(console, args);
  };

  console.log('Monitoring console.error... (check back after actions)');
  report.data.consoleErrors = recentErrors;

  // ═══════════════════════════════════════════════════════
  // 7. TEST CALLBACK ENDPOINT
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c🔄 7. Test Callback Endpoint', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');

  // Try to fetch callback with test params (will fail but show error)
  try {
    const callbackUrl = '/api/quickbooks/auth/callback?code=test&realmId=test&state=test';
    const callbackResponse = await fetch(callbackUrl, {
      credentials: 'include',
      redirect: 'manual'
    });

    console.log('Callback Response Status:', callbackResponse.status);
    console.log('Callback Response Type:', callbackResponse.type);

    report.data.callbackTest = {
      status: callbackResponse.status,
      type: callbackResponse.type
    };
  } catch (error) {
    console.error('❌ Error testing callback:', error);
    report.errors.push({
      type: 'callback_test_error',
      message: error.message
    });
  }

  // ═══════════════════════════════════════════════════════
  // 8. ENVIRONMENT CHECK
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c🔧 8. Environment Check', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');

  const env = {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled
  };

  console.table(env);
  report.data.environment = env;

  // ═══════════════════════════════════════════════════════
  // 9. SUPABASE DIRECT CHECK
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c💾 9. Check Supabase Tables', 'background: #3B82F6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');

  // This needs to be done server-side, so we'll just note it
  console.log('⚠️  Cannot check Supabase directly from browser');
  console.log('   You need to check this in Supabase Dashboard:');
  console.log('   → https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq');
  console.log('   → Table: quickbooks_tokens');
  console.log('   → Check if any rows exist');

  // ═══════════════════════════════════════════════════════
  // 10. ACTION PLAN
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c📋 10. Diagnostic Summary', 'background: #EF4444; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  // Analyze the data
  const issues = [];

  if (urlParams.error === 'db_error') {
    issues.push({
      severity: 'HIGH',
      issue: 'Database Error in Callback',
      description: 'The OAuth callback succeeded but failed to save tokens to database',
      possibleCauses: [
        '1. Supabase connection issue',
        '2. Missing SUPABASE_SERVICE_ROLE_KEY env var',
        '3. Table schema mismatch',
        '4. Invalid token data from QuickBooks'
      ],
      nextSteps: [
        'Check Vercel function logs for /api/quickbooks/auth/callback',
        'Verify SUPABASE_SERVICE_ROLE_KEY is set on Vercel',
        'Check Supabase table quickbooks_tokens exists and has correct schema',
        'Look for detailed error in callback console.log'
      ]
    });
  }

  if (!cookies['admin-session']) {
    issues.push({
      severity: 'MEDIUM',
      issue: 'No Admin Session',
      description: 'Admin session cookie is missing',
      possibleCauses: ['Not logged in to admin', 'Session expired'],
      nextSteps: ['Login to admin again']
    });
  }

  if (urlParams.state && !cookies['qb_oauth_state']) {
    issues.push({
      severity: 'MEDIUM',
      issue: 'OAuth State Mismatch',
      description: 'State parameter exists but cookie is missing',
      possibleCauses: [
        'Cookie was not set properly',
        'Cookie expired (10 min timeout)',
        'Third-party cookies blocked'
      ],
      nextSteps: [
        'Check browser cookie settings',
        'Try connecting again immediately',
        'Check if third-party cookies are enabled'
      ]
    });
  }

  // Display issues
  if (issues.length > 0) {
    console.log('%c❌ Issues Found:', 'color: red; font-weight: bold; font-size: 14px;');
    console.log('');

    issues.forEach((issue, index) => {
      console.log(`%c${index + 1}. [${issue.severity}] ${issue.issue}`, 'color: red; font-weight: bold;');
      console.log(`   Description: ${issue.description}`);
      console.log('   Possible Causes:');
      issue.possibleCauses.forEach(cause => console.log(`     ${cause}`));
      console.log('   Next Steps:');
      issue.nextSteps.forEach(step => console.log(`     ✓ ${step}`));
      console.log('');
    });
  } else {
    console.log('%c✅ No obvious issues detected', 'color: green; font-weight: bold; font-size: 14px;');
  }

  report.data.issues = issues;

  // ═══════════════════════════════════════════════════════
  // EXPORT REPORT
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c📤 Full Report', 'background: #8B5CF6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');
  console.log('Copy this report to share with support:');
  console.log('');
  console.log(JSON.stringify(report, null, 2));

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    console.log('%c✅ Report copied to clipboard!', 'background: green; color: white; padding: 5px;');
  } catch (err) {
    console.log('⚠️  Could not copy to clipboard automatically');
  }

  console.log('');
  console.log('%c═══════════════════════════════════════════════════════', 'color: gray;');
  console.log('');

  return report;
})();
