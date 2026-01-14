# 🔧 TITAN Migration - Troubleshooting

**Date:** 2026-01-13
**Status:** ❌ No tables found in database

---

## 🔍 Diagnostic Results

**Test Results:**
- ✅ Environment variables: 4/4 configured
- ❌ Database tables: 0/15 found
- ❌ Schema cache: Empty

**Conclusion:** The SQL migration was not executed successfully.

---

## 📋 What Went Wrong

The Supabase schema cache shows **no tables**, which means one of these happened:

1. **SQL Not Executed** - The SQL wasn't actually run in the SQL Editor
2. **Execution Errors** - The SQL had errors and didn't complete
3. **Wrong Project** - SQL was executed in a different Supabase project
4. **Partial Execution** - Only some statements executed before an error

---

## ✅ Solution: Re-Execute Migration

### Step 1: Verify You're in the Right Project

**Expected Project ID:** `dllyzfuqjzuhvshrlmuq`

Check the URL in your browser:
```
https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor
```

If the ID is different, you're in the wrong project!

### Step 2: Open SQL Editor

I've already opened it for you, but if needed:
```
https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor
```

Click **"New query"** button (top right)

### Step 3: Paste and Execute SQL

**The SQL is already copied to your clipboard** (805 lines)

1. In the SQL Editor, **paste** (Cmd+V or Ctrl+V)
2. You should see ~805 lines of SQL
3. Click **"Run"** button or press **Cmd/Ctrl + Enter**
4. **Wait** for execution (~10-30 seconds)

### Step 4: Check for Errors

**Look for these indicators:**

✅ **Success:**
- Green "Success" message
- "Rows affected" or "Query completed"
- No red error messages

❌ **Failure:**
- Red error messages
- "Error at line X"
- Execution stopped early

### Common Errors and Fixes

#### Error: "relation already exists"

**Cause:** Tables were partially created before

**Fix:** Drop existing tables first:

```sql
-- Copy and run this BEFORE the main migration
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS ml_models CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS ab_test_assignments CASCADE;
DROP TABLE IF EXISTS ab_tests CASCADE;
DROP MATERIALIZED VIEW IF EXISTS metrics_daily_summary CASCADE;
DROP TABLE IF EXISTS metrics_log CASCADE;
DROP TABLE IF EXISTS cortex_execution_logs CASCADE;
DROP TABLE IF EXISTS cortex_rules CASCADE;
DROP TABLE IF EXISTS loan_objectives CASCADE;
DROP TABLE IF EXISTS loan_applications CASCADE;
DROP FUNCTION IF EXISTS generate_loan_reference() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

Then run the full migration SQL again.

#### Error: "permission denied"

**Cause:** Not using service role key

**Fix:** Make sure you're logged into Supabase Dashboard with the correct account that owns project `dllyzfuqjzuhvshrlmuq`

#### Error: "syntax error at or near..."

**Cause:** SQL was not pasted completely or got corrupted

**Fix:**
1. Clear the editor
2. Re-copy SQL: `cat database/titan-system.sql | pbcopy`
3. Paste again and verify it's 805 lines
4. Run again

---

## 🧪 After Successful Execution

### Verify in Supabase Dashboard

1. Go to **Table Editor** (left sidebar)
2. You should see 15 tables:
   - loan_applications
   - loan_objectives
   - cortex_rules
   - cortex_execution_logs
   - metrics_log
   - ab_tests
   - ab_test_assignments
   - workflows
   - workflow_executions
   - notification_templates
   - notification_logs
   - ml_models
   - ml_predictions
   - api_keys
   - audit_logs

3. Click on any table to see its structure

### Run Test Suite

Once you confirm tables exist in the dashboard:

```bash
node scripts/test-titan-system.mjs
```

**Expected results:**
- ✅ 26/26 tests passing (100%)
- ✅ All 15 tables accessible
- ✅ Reference generation working
- ✅ Seed data loaded (5 rules, 3 objectives, 5 templates)

---

## 🎯 Quick Checklist

Before running tests again:

- [ ] Confirmed project ID: `dllyzfuqjzuhvshrlmuq`
- [ ] SQL Editor opened
- [ ] SQL pasted (805 lines visible)
- [ ] Clicked "Run" button
- [ ] Saw "Success" message (no errors)
- [ ] Verified tables exist in Table Editor
- [ ] Ready to run tests

---

## 📞 Still Having Issues?

### Check Supabase Logs

1. Go to **Logs** → **Database** in Supabase Dashboard
2. Look for recent errors
3. Check the time of your SQL execution attempt

### Verify Connection

```bash
node scripts/check-database.mjs
```

This will test:
- Environment variables
- Supabase connection
- Table existence

### Nuclear Option: Fresh Start

If nothing works, we can:
1. Create a new SQL migration with `DROP IF EXISTS` statements
2. Execute clean install
3. Verify step-by-step

---

## 💡 Current Status

**What I did:**
1. ✅ Opened SQL Editor in browser
2. ✅ Copied SQL to clipboard (805 lines)
3. ✅ Ran diagnostic scripts
4. ✅ Created troubleshooting guide

**What you need to do:**
1. ⏳ Paste SQL in editor (it's in your clipboard)
2. ⏳ Click "Run"
3. ⏳ Verify success message
4. ⏳ Check tables in Table Editor
5. ⏳ Tell me when it's done

**Then I will:**
1. Run full test suite
2. Verify all 26 tests pass
3. Test the API endpoint
4. Test the form end-to-end

---

**Let me know when you've executed the SQL and I'll run the tests again! 🚀**
