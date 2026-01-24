# CLIENT DOSSIER CALLS — AFTER
**Date:** 2026-01-25 00:35 EST
**Component:** `src/components/admin/ClientsSARView.tsx`
**Trigger:** User clicks on a client row to open detail modal

---

## NEW IMPLEMENTATION (UNIFIED ENDPOINT)

### Single Call: Unified Dossier
**File:** `src/components/admin/ClientsSARView.tsx`
**Line:** 186-213
**Function:** `loadClientDossier(margillId: string)`

**Request:**
```typescript
GET /api/admin/client/${margillId}/dossier
```

**Purpose:** Load ALL client dossier data in one call:
- Client basic info (from `clients` table via RPC)
- Applications
- Analyses
- Events
- Concordances (Margill-specific)
- Autres contrats (Margill-specific)

**Triggered:** When modal opens (`handleSelectClient` line 219)

**Code:**
```typescript
const loadClientDossier = async (margillId: string) => {
  try {
    setConcordancesLoading(true)
    setAutresContratsLoading(true)

    // SINGLE CALL - Replaces 2 separate calls
    const response = await fetch(`/api/admin/client/${margillId}/dossier`)
    const data = await response.json()

    if (response.ok) {
      // Extract data from unified response
      setConcordances(data.concordances || [])
      setAutresContrats(data.autres_contrats || [])
    } else {
      console.error('Erreur chargement dossier:', data.error)
      setConcordances([])
      setAutresContrats([])
    }
  } catch (error) {
    console.error('Erreur chargement dossier:', error)
    setConcordances([])
    setAutresContrats([])
  } finally {
    setConcordancesLoading(false)
    setAutresContratsLoading(false)
  }
}
```

---

### Trigger: handleSelectClient
**File:** `src/components/admin/ClientsSARView.tsx`
**Line:** 215-220

**Code:**
```typescript
const handleSelectClient = (client: ClientSAR) => {
  setSelectedClient(client)
  setConcordances([])
  setAutresContrats([])
  loadClientDossier(client.margill_id) // SINGLE CALL - was 2 calls before
}
```

---

## API ROUTE IMPLEMENTATION

**File:** `src/app/api/admin/client/[id]/dossier/route.ts`

**Flow:**
1. Accept `margill_id` (string) or `client_id` (UUID)
2. If `margill_id` → Resolve to `client_id` via `client_external_ids` table
3. Call RPC `get_client_dossier_unified(client_id)` for base data
4. If `margill_id` provided → Also fetch concordances and autres_contrats (parallel)
5. Return unified JSON response

**Resolution via client_external_ids:**
```sql
SELECT client_id
FROM client_external_ids
WHERE provider = 'margill' AND external_id = 'MC9004'
```

**Backend calls (within API route):**
- 1 mapping resolution (if margill_id)
- 1 RPC call (get_client_dossier_unified)
- 2 internal fetches (concordances + autres_contrats, parallel)

**Total backend operations:** 4 (but 1 single API call from frontend perspective)

---

## SUMMARY

**Total API calls when opening modal:** **1**

| Call | Endpoint | Purpose | Line |
|------|----------|---------|------|
| 1 | `/api/admin/client/{margill_id}/dossier` | Load ALL dossier data | 193 |

**Pattern:** Single unified call
- 1 call fetches all data
- Backend handles data aggregation
- Frontend receives complete dossier

**Improvement:** Eliminated N+1 pattern
- Before: 2 separate API calls
- After: 1 unified API call
- Reduction: **50%** (2 → 1)

---

## BACKEND ARCHITECTURE

**client_external_ids table:**
```sql
CREATE TABLE client_external_ids (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES clients(id),
  provider text CHECK (provider IN ('margill', 'flinks', ...)),
  external_id text NOT NULL,
  UNIQUE(provider, external_id)
);
```

**Example mapping:**
```
provider: 'margill'
external_id: 'MC9004'
client_id: 'c53ace24-3ceb-4e37-a041-209b7cb2c932'
```

**Benefits:**
- ✅ Lifetime `client_id` (medical record model)
- ✅ External IDs map to internal ID
- ✅ No email-based joins
- ✅ Scalable for multiple external systems

---

**Result:** N+1 pattern eliminated via unified endpoint + margill_id resolution
