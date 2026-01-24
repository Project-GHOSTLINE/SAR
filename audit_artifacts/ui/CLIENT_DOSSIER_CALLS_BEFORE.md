# CLIENT DOSSIER CALLS — BEFORE
**Date:** 2026-01-25 00:30 EST
**Component:** `src/components/admin/ClientsSARView.tsx`
**Trigger:** User clicks on a client row to open detail modal

---

## CURRENT IMPLEMENTATION (N+1 PATTERN)

### Call 1: Concordances
**File:** `src/components/admin/ClientsSARView.tsx`
**Line:** 186-200
**Function:** `loadConcordances(margillId: string)`

**Request:**
```typescript
GET /api/admin/clients-sar/concordances?margill_id=${margillId}
```

**Purpose:** Load client concordances (shared data with other clients)

**Triggered:** When modal opens (`handleSelectClient` line 224)

**Code:**
```typescript
const loadConcordances = async (margillId: string) => {
  try {
    setConcordancesLoading(true)
    const response = await fetch(`/api/admin/clients-sar/concordances?margill_id=${margillId}`)
    const data = await response.json()

    if (data.success) {
      setConcordances(data.concordances || [])
    }
  } catch (error) {
    console.error('Erreur chargement concordances:', error)
    setConcordances([])
  } finally {
    setConcordancesLoading(false)
  }
}
```

---

### Call 2: Autres Contrats
**File:** `src/components/admin/ClientsSARView.tsx`
**Line:** 203-218
**Function:** `loadAutresContrats(margillId: string)`

**Request:**
```typescript
GET /api/admin/clients-sar/autres-contrats?margill_id=${margillId}
```

**Purpose:** Load other contracts for the same client (linked via email/phone/name)

**Triggered:** When modal opens (`handleSelectClient` line 225)

**Code:**
```typescript
const loadAutresContrats = async (margillId: string) => {
  setAutresContratsLoading(true)
  try {
    const res = await fetch(`/api/admin/clients-sar/autres-contrats?margill_id=${margillId}`)
    const data = await res.json()

    if (data.success) {
      setAutresContrats(data.contrats || [])
    }
  } catch (error) {
    console.error('Erreur chargement autres contrats:', error)
    setAutresContrats([])
  } finally {
    setAutresContratsLoading(false)
  }
}
```

---

### Trigger: handleSelectClient
**File:** `src/components/admin/ClientsSARView.tsx`
**Line:** 220-226

**Code:**
```typescript
const handleSelectClient = (client: ClientSAR) => {
  setSelectedClient(client)
  setConcordances([])
  setAutresContrats([])
  loadConcordances(client.margill_id)  // ← Call 1
  loadAutresContrats(client.margill_id) // ← Call 2
}
```

---

## SUMMARY

**Total API calls when opening modal:** **2**

| Call | Endpoint | Purpose | Line |
|------|----------|---------|------|
| 1 | `/api/admin/clients-sar/concordances` | Load concordances | 189 |
| 2 | `/api/admin/clients-sar/autres-contrats` | Load other contracts | 206 |

**Pattern:** Sequential calls (waterfall)
- Call 1 starts immediately
- Call 2 starts immediately (parallel with Call 1)
- Both must complete before UI shows data

**Issue:** N+1 pattern - Multiple separate API calls for related data

---

**Next:** Replace with single unified endpoint
