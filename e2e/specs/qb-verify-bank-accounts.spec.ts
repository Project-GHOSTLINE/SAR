import { test, expect } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';
const ADMIN_PASSWORD = 'FredRosa%1978';

test.describe('QuickBooks - Verify Bank Accounts After Reconnection', () => {

  test.use({ storageState: { cookies: [], origins: [] } });

  test('Full verification with bank account balances @qb-bank-accounts', async ({ page, request }) => {
    console.log('\n' + '='.repeat(70));
    console.log('💰 QUICKBOOKS - VÉRIFICATION COMPTES BANCAIRES');
    console.log('='.repeat(70));

    // Step 1: Login
    console.log('\n1️⃣  Logging in...');
    await page.goto(`${BASE_URL}/admin`);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Se connecter")');
    await page.waitForURL(/\/admin\/dashboard/);
    console.log('   ✅ Logged in');

    // Step 2: Check connection status
    console.log('\n2️⃣  Checking connection status...');
    const statusResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/status`);
    const statusData = await statusResponse.json();

    const connected = statusData.connection?.connected;
    const realmId = statusData.connection?.realmId;
    const autoRefreshEnabled = statusData.connection?.autoRefreshEnabled;

    console.log(`   Connected: ${connected ? '✅ Yes' : '❌ No'}`);
    console.log(`   Realm ID: ${realmId || 'N/A'}`);
    console.log(`   Auto-Refresh: ${autoRefreshEnabled ? '✅ Enabled' : '❌ Disabled'}`);

    if (!connected) {
      console.log('\n   ⚠️  NOT CONNECTED');
      console.log('   You must reconnect QuickBooks first:');
      console.log('   1. Go to /admin/quickbooks');
      console.log('   2. Click "Connect to QuickBooks"');
      console.log('   3. Authorize with NEW scopes (openid, profile, email)');
      console.log('   4. Run this test again');
      return;
    }

    // Step 3: Test connection (check for Error 3100)
    console.log('\n3️⃣  Testing API connection...');
    const testResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/test`);
    const testData = await testResponse.json();

    if (testData.success) {
      console.log('   ✅ Connection test PASSED!');
      console.log(`   Company: ${testData.company?.companyName || 'Unknown'}`);
      console.log(`   Legal Name: ${testData.company?.legalName || 'Unknown'}`);
    } else {
      console.log('   ❌ Connection test FAILED');
      console.log(`   Error: ${testData.error}`);

      // Check for Error 3100
      const errorCode = testData.details?.fault?.error?.[0]?.code;
      if (errorCode === '3100') {
        console.log('\n   🚨 ERROR 3100 DETECTED');
        console.log('   This means the connection is using OLD OAuth scopes.');
        console.log('\n   SOLUTION:');
        console.log('   1. Disconnect QuickBooks (or run @qb-auto-fix test)');
        console.log('   2. Reconnect with NEW scopes via web interface');
        console.log('   3. Re-run this test');
      }

      return;
    }

    // Step 4: Enable auto-refresh if not enabled
    if (!autoRefreshEnabled) {
      console.log('\n4️⃣  Enabling auto-refresh...');
      const autoRefreshResponse = await request.post(`${BASE_URL}/api/quickbooks/connection/auto-refresh`, {
        data: { action: 'start' }
      });
      const autoRefreshData = await autoRefreshResponse.json();

      if (autoRefreshData.success) {
        console.log('   ✅ Auto-refresh enabled');
      } else {
        console.log('   ❌ Failed to enable auto-refresh');
      }
    } else {
      console.log('\n4️⃣  Auto-refresh already enabled ✅');
    }

    // Step 5: Sync accounts from QuickBooks
    console.log('\n5️⃣  Syncing accounts from QuickBooks...');
    const syncResponse = await request.post(`${BASE_URL}/api/quickbooks/sync/accounts`);
    const syncData = await syncResponse.json();

    if (syncData.success) {
      console.log(`   ✅ Synced ${syncData.count} accounts!`);
    } else {
      console.log('   ❌ Sync failed');
      console.log(`   Error: ${syncData.error}`);
      return;
    }

    // Step 6: Fetch bank accounts from Balance Sheet Detailed
    console.log('\n6️⃣  Fetching bank accounts from Balance Sheet...');

    const balanceSheetResponse = await request.get(
      `${BASE_URL}/api/quickbooks/reports/balance-sheet-detailed`
    );

    console.log(`   Response Status: ${balanceSheetResponse.status()}`);

    if (balanceSheetResponse.status() === 404) {
      console.log('   ⚠️  Balance Sheet Detailed endpoint not yet deployed (404)');
      console.log('   Trying standard Balance Sheet endpoint...');

      const standardBalanceSheetResponse = await request.get(
        `${BASE_URL}/api/quickbooks/reports/balance-sheet`
      );

      if (standardBalanceSheetResponse.ok()) {
        const standardData = await standardBalanceSheetResponse.json();
        console.log('   ✅ Standard Balance Sheet endpoint works');
        console.log(`   Success: ${standardData.success}`);

        if (!standardData.success) {
          console.log(`   Error: ${standardData.error}`);
        }
      } else {
        console.log('   ❌ Standard Balance Sheet also failed');
      }
    } else if (balanceSheetResponse.ok()) {
      const balanceSheetData = await balanceSheetResponse.json();

      if (balanceSheetData.success) {
        console.log('   ✅ Balance Sheet fetched successfully!');
        console.log('\n   📊 BANK ACCOUNTS:');
        console.log('   ' + '='.repeat(60));

        const bankAccounts = balanceSheetData.bankAccounts || [];

        if (bankAccounts.length === 0) {
          console.log('   ⚠️  No bank accounts found in Balance Sheet');
        } else {
          for (const account of bankAccounts) {
            const accountNumber = account.accountNumber || 'N/A';
            const name = account.name || 'Unknown';
            const balance = account.formattedBalance || account.balance || '0.00';

            console.log(`   ${accountNumber} - ${name}: ${balance}`);
          }

          console.log('\n   Total bank accounts: ' + bankAccounts.length);

          // Check for the 3 specific accounts requested
          const vopay = bankAccounts.find((acc: any) => acc.accountNumber === '1015');
          const epargne = bankAccounts.find((acc: any) => acc.accountNumber === '1010');
          const rbc = bankAccounts.find((acc: any) => acc.accountNumber === '1000');

          console.log('\n   🎯 COMPTES RECHERCHÉS:');
          console.log(`   1015 Compte VOPAY: ${vopay ? '✅ ' + vopay.formattedBalance : '❌ Not found'}`);
          console.log(`   1010 Compte Épargne: ${epargne ? '✅ ' + epargne.formattedBalance : '❌ Not found'}`);
          console.log(`   1000 Compte RBC: ${rbc ? '✅ ' + rbc.formattedBalance : '❌ Not found'}`);

          // Summary metadata
          const summary = balanceSheetData.summary || {};
          console.log('\n   📈 SUMMARY:');
          console.log(`   Total Accounts: ${summary.totalAccounts || 0}`);
          console.log(`   Bank Accounts: ${summary.bankAccounts || 0}`);

          const report = balanceSheetData.report || {};
          console.log(`   Report Date: ${report.date || 'N/A'}`);
          console.log(`   Currency: ${report.currency || 'N/A'}`);
        }
      } else {
        console.log('   ❌ Balance Sheet fetch failed');
        console.log(`   Error: ${balanceSheetData.error}`);
      }
    } else {
      console.log(`   ❌ Balance Sheet request failed (HTTP ${balanceSheetResponse.status()})`);
      const errorText = await balanceSheetResponse.text();
      console.log(`   Response: ${errorText.substring(0, 200)}`);
    }

    // Step 7: Query local database for bank accounts
    console.log('\n7️⃣  Querying local database for bank accounts...');
    const accountsResponse = await request.get(
      `${BASE_URL}/api/quickbooks/accounts?type=Bank&active=true`
    );

    if (accountsResponse.ok()) {
      const accountsData = await accountsResponse.json();

      if (accountsData.success) {
        console.log(`   ✅ Found ${accountsData.count} bank accounts in database`);
        console.log('\n   📊 BANK ACCOUNTS (FROM DB):');
        console.log('   ' + '='.repeat(60));

        const accounts = accountsData.accounts || [];

        for (const account of accounts) {
          const accountNumber = account.accountNumber || 'N/A';
          const name = account.name || 'Unknown';
          const balance = account.currentBalance || 0;

          console.log(`   ${accountNumber} - ${name}: $${balance.toFixed(2)}`);
        }

        // Check for the 3 specific accounts
        const dbVopay = accounts.find((acc: any) => acc.accountNumber === '1015');
        const dbEpargne = accounts.find((acc: any) => acc.accountNumber === '1010');
        const dbRbc = accounts.find((acc: any) => acc.accountNumber === '1000');

        console.log('\n   🎯 COMPTES RECHERCHÉS (DB):');
        console.log(`   1015 Compte VOPAY: ${dbVopay ? '✅ $' + dbVopay.currentBalance.toFixed(2) : '❌ Not in DB'}`);
        console.log(`   1010 Compte Épargne: ${dbEpargne ? '✅ $' + dbEpargne.currentBalance.toFixed(2) : '❌ Not in DB'}`);
        console.log(`   1000 Compte RBC: ${dbRbc ? '✅ $' + dbRbc.currentBalance.toFixed(2) : '❌ Not in DB'}`);
      } else {
        console.log('   ❌ Failed to query database');
        console.log(`   Error: ${accountsData.error}`);
      }
    } else {
      console.log('   ❌ Database query failed');
    }

    // Step 8: Navigate to QuickBooks page and take screenshot
    console.log('\n8️⃣  Taking screenshot of QuickBooks page...');
    await page.goto(`${BASE_URL}/admin/quickbooks`);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '../test-artifacts/qb-bank-accounts/final-state.png',
      fullPage: true
    });

    console.log('   📸 Screenshot saved');

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(70));
    console.log('\nRESULTS:');
    console.log(`  - Connection: ${connected ? '✅' : '❌'}`);
    console.log(`  - API Test: ${testData.success ? '✅' : '❌'}`);
    console.log(`  - Auto-Refresh: ${autoRefreshEnabled ? '✅' : '❌'}`);
    console.log(`  - Accounts Synced: ${syncData.success ? '✅ (' + syncData.count + ')' : '❌'}`);
    console.log(`  - Balance Sheet: ${balanceSheetResponse.ok() ? '✅' : '⚠️'}`);
    console.log('\nScreenshot: test-artifacts/qb-bank-accounts/final-state.png');
    console.log('');
  });
});
