# 🎛️ Guide des Widgets VoPay

Documentation complète pour utiliser les widgets VoPay en temps réel sur n'importe quelle page.

---

## 🚀 Utilisation Rapide (Shortcodes)

### 1. Balance VoPay
```tsx
import { VoPayBalance } from '@/components/widgets/VoPayWidgets'

<VoPayBalance />
```

### 2. Transactions Récentes
```tsx
import { VoPayTransactions } from '@/components/widgets/VoPayWidgets'

// Afficher 5 transactions (défaut)
<VoPayTransactions />

// Afficher 10 transactions
<VoPayTransactions limit={10} />

// Avec filtres
<VoPayTransactions limit={5} showFilters={true} />
```

### 3. Volume du Jour
```tsx
import { VoPayTodayVolume } from '@/components/widgets/VoPayWidgets'

<VoPayTodayVolume />
```

### 4. Statistiques Générales
```tsx
import { VoPayStats } from '@/components/widgets/VoPayWidgets'

<VoPayStats />
```

### 5. Balance Mini (Compact)
```tsx
import { VoPayBalanceMini } from '@/components/widgets/VoPayWidgets'

<VoPayBalanceMini />
```

---

## 📖 Exemple Complet - Page d'Accueil Admin

```tsx
// src/app/admin/page.tsx
'use client'

import {
  VoPayBalance,
  VoPayTransactions,
  VoPayTodayVolume,
  VoPayStats
} from '@/components/widgets/VoPayWidgets'

export default function AdminHomePage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard Admin</h1>

      {/* Grid de widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <VoPayBalance />
        <VoPayTodayVolume />
        <VoPayStats />
      </div>

      {/* Transactions récentes - Pleine largeur */}
      <VoPayTransactions limit={10} />
    </div>
  )
}
```

---

## 🔧 Hook Personnalisé (Utilisation Avancée)

Si vous voulez créer vos propres composants:

```tsx
import { useVoPayData } from '@/hooks/useVoPayData'

function MonComposantPersonnalise() {
  const { data, loading, error, refresh } = useVoPayData({
    autoRefresh: true,      // Auto-refresh activé
    refreshInterval: 30000, // 30 secondes
    enabled: true           // Hook activé
  })

  if (loading) return <div>Chargement...</div>
  if (error) return <div>Erreur: {error}</div>

  return (
    <div>
      <h2>Balance: {data.balance}</h2>
      <p>Transactions: {data.recentTransactions.length}</p>
      <button onClick={refresh}>Rafraîchir</button>
    </div>
  )
}
```

---

## ⚙️ Options du Hook `useVoPayData`

```typescript
interface UseVoPayDataOptions {
  autoRefresh?: boolean     // Auto-refresh automatique (défaut: true)
  refreshInterval?: number  // Intervalle en ms (défaut: 30000)
  enabled?: boolean         // Activer/désactiver le hook (défaut: true)
}
```

### Exemples:

```tsx
// Sans auto-refresh (refresh manuel uniquement)
const { data, refresh } = useVoPayData({ autoRefresh: false })

// Refresh toutes les 10 secondes
const { data } = useVoPayData({ refreshInterval: 10000 })

// Hook désactivé (ne charge rien)
const { data } = useVoPayData({ enabled: false })
```

---

## 📊 Données Disponibles

```typescript
interface VoPayData {
  balance: number              // Balance totale
  available: number            // Montant disponible
  frozen: number              // Montant gelé
  pendingInterac: number      // Nombre d'Interac en attente
  todayInterac: number        // Volume Interac aujourd'hui
  weeklyVolume: number        // Volume hebdomadaire
  successRate: number         // Taux de succès (%)
  recentTransactions: Array<{
    TransactionID: string
    TransactionDateTime: string
    TransactionType: string
    TransactionStatus: string
    DebitAmount: string
    CreditAmount: string
    FullName: string
    ClientReferenceNumber: string
    Notes: string
    Currency: string
  }>
}
```

---

## 🎨 Layout Examples

### Dashboard 3 Colonnes
```tsx
<div className="grid grid-cols-3 gap-6">
  <VoPayBalance />
  <VoPayTodayVolume />
  <VoPayStats />
</div>
```

### Sidebar avec Mini Balance
```tsx
<aside className="w-64 space-y-4">
  <VoPayBalanceMini />
  {/* Autres widgets sidebar */}
</aside>
```

### Full Width Transactions
```tsx
<div className="w-full">
  <VoPayTransactions limit={20} />
</div>
```

---

## ⚡ Auto-Refresh

Tous les widgets se rafraîchissent **automatiquement toutes les 30 secondes** par défaut.

Chaque widget a aussi un **bouton de refresh manuel** pour forcer la mise à jour.

---

## 🔒 Sécurité

Les widgets nécessitent une **session admin active**. L'API `/api/admin/vopay` vérifie:
- Cookie `admin-session`
- Authentification admin valide

Sans authentification, les widgets afficheront une erreur.

---

## 🐛 Dépannage

### Les données ne se rafraîchissent pas?
✅ Vérifiez que `autoRefresh: true` (défaut)
✅ Vérifiez la console pour les erreurs
✅ Testez l'API manuellement: `curl http://localhost:3001/api/admin/vopay`

### Erreur "Non autorisé"?
✅ Assurez-vous d'être connecté en tant qu'admin
✅ Vérifiez que le cookie `admin-session` existe

### Les transactions affichent des dates anciennes?
✅ Cliquez sur "Rafraîchir" manuellement
✅ Vérifiez que l'API VoPay externe répond correctement
✅ Regardez les logs du serveur: `tail /tmp/claude/-Users-xunit-Desktop/tasks/[ID].output`

---

## 📝 Notes

- **Temps réel**: Les données sont mises à jour toutes les 30 secondes
- **Performance**: Le hook utilise un seul fetch partagé par tous les widgets
- **Cache**: Désactivé (`cache: 'no-store'`) pour garantir les données fraîches
- **Mobile**: Tous les widgets sont responsive

---

## 🎯 Cas d'Usage

### 1. Dashboard Principal
Afficher balance + transactions + stats

### 2. Page d'Accueil
Widget mini balance dans le header

### 3. Page Rapports
Statistiques détaillées + historique transactions

### 4. Sidebar Admin
Balance compacte toujours visible

---

**Dernière mise à jour:** 2026-01-14
**Version:** 1.0.0
