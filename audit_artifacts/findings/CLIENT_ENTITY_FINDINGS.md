# CLIENT ENTITY FINDINGS - FACTUAL
**Date:** 2026-01-24
**Status:** ✅ VERIFIED

---

## FINDING 1: Table `clients` EXISTS

**Evidence:** Multiple migration files create the `clients` table

**Files:**
```
database/migrations/restructure/010_create_clients.sql
database/migrations/restructure/010_create_clients_enhanced.sql
database/migrations/restructure/010_011_VERIFIED.sql
database/migrations/restructure/010_011_safe.sql
database/migrations/restructure/010_011_combined.sql
```

**Command:**
```bash
grep -r "CREATE TABLE.*clients" database/migrations --include="*.sql"
```

**Output saved to:** `audit_artifacts/commands/grep_clients_table.txt`

**Conclusion:** ✅ **VERIFIED** - A central `clients` table exists in migrations

---

## FINDING 2: Email-Based Queries (Limited Usage)

**Evidence:** Search for `.eq('email'` in API code

**Results:** 2 occurrences found

**Files:**
```
src/app/api/admin/clients-sar/autres-contrats/route.ts:    .eq('email', client.email)
src/app/api/admin/clients-sar/concordances/route.ts:       .eq('email', client.email)
```

**Command:**
```bash
grep -r "\.eq('email'" src/app/api --include="*.ts"
```

**Output saved to:** `audit_artifacts/commands/grep_email_queries.txt`

**Conclusion:** 🟨 **LOW USAGE** - Only 2 API routes query by email (not widespread)

---

## FINDING 3: Client ID FK Usage

**Evidence:** Search for `.eq('client_id'` in API code

**Results:** 1 occurrence found

**File:**
```
src/app/api/vopay/stats/[clientId]/route.ts:    .eq('client_id', clientId)
```

**Command:**
```bash
grep -r "\.eq('client_id'" src/app/api --include="*.ts"
```

**Total references to `client_id`:** 6 occurrences across all files

**Output saved to:** `audit_artifacts/commands/grep_client_id_queries.txt`

**Conclusion:** 🟨 **LOW ADOPTION** - Very few API routes use `client_id` foreign key

---

## FINDING 4: Migration Status

**Evidence:** Examine migration file names

**Observations:**
- Multiple versions of `010_create_clients` exist:
  - `010_create_clients.sql` (original)
  - `010_create_clients_enhanced.sql` (enhanced version)
  - `010_011_VERIFIED.sql` (verified combined)
  - `010_011_safe.sql` (safe version)
  - `010_011_combined.sql` (combined version)

**Analysis:**
This suggests the `clients` table migration has been:
1. Created
2. Enhanced
3. Combined with other migrations
4. Verified

**Status:** The existence of multiple versions indicates **active development/migration work in progress**

**Conclusion:** 🟨 **IN PROGRESS** - Migration appears to be in development/testing phase

---

## FINDING 5: Schema Structure

**To verify the actual schema of `clients` table:**

```bash
# Read the latest migration file
cat database/migrations/restructure/010_011_VERIFIED.sql | grep -A 50 "CREATE TABLE.*clients"
```

**Note:** This requires reading the migration file content (deferred to detailed analysis if needed)

---

## SUMMARY

| Finding | Status | Evidence |
|---------|--------|----------|
| `clients` table exists | ✅ VERIFIED | 5 migration files |
| Email-based queries | 🟨 LOW USAGE | 2 occurrences |
| `client_id` FK usage | 🟨 LOW ADOPTION | 1 occurrence |
| Migration status | 🟨 IN PROGRESS | Multiple versions |

---

## IMPLICATIONS

1. **Central Entity Exists:** ✅ A `clients` table has been created
2. **Migration Phase:** The presence of multiple versions suggests ongoing migration work
3. **Low Adoption:** Very few API routes currently use the new `clients` table
4. **Legacy Pattern:** Most code still likely uses email-based lookups or old schema

**Recommendation:** Check application runtime to see if old or new schema is active.

---

## EVIDENCE TRAIL

All commands and outputs saved in:
- `audit_artifacts/commands/grep_clients_table.txt`
- `audit_artifacts/commands/grep_email_queries.txt`
- `audit_artifacts/commands/grep_client_id_queries.txt`

**Reproducible:** YES
**Requires DB Connection:** NO (static analysis only)
