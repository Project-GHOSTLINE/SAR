# 🚀 Système de Widgets VoPay - Guide Rapide

## ⚡ UTILISATION ULTRA-SIMPLE

### Shortcode 1 ligne - Balance
```tsx
import { VoPayBalance } from '@/components/widgets'
<VoPayBalance />
```

### Shortcode 1 ligne - Transactions
```tsx
import { VoPayTransactions } from '@/components/widgets'
<VoPayTransactions limit={5} />
```

### Shortcode 1 ligne - Volume du Jour
```tsx
import { VoPayTodayVolume } from '@/components/widgets'
<VoPayTodayVolume />
```

### Shortcode 1 ligne - Statistiques
```tsx
import { VoPayStats } from '@/components/widgets'
<VoPayStats />
```

### Shortcode 1 ligne - Balance Mini
```tsx
import { VoPayBalanceMini } from '@/components/widgets'
<VoPayBalanceMini />
```

---

## 📦 CE QUI A ÉTÉ CRÉÉ

### 1. Hook Personnalisé
**Fichier:** `src/hooks/useVoPayData.ts`
- ✅ Auto-refresh automatique (30s)
- ✅ Gestion du loading/error
- ✅ Refresh manuel disponible
- ✅ Configuration flexible

### 2. Composants Widgets
**Fichier:** `src/components/widgets/VoPayWidgets.tsx`
- ✅ VoPayBalance - Balance complète
- ✅ VoPayTransactions - Liste transactions
- ✅ VoPayTodayVolume - Volume du jour
- ✅ VoPayStats - Statistiques générales
- ✅ VoPayBalanceMini - Balance compacte

### 3. Export Barrel
**Fichier:** `src/components/widgets/index.ts`
- ✅ Import simplifié en une ligne

### 4. Page Exemple
**URL:** http://localhost:3001/admin/exemple-widgets
- ✅ Démo de tous les widgets
- ✅ Exemples de code
- ✅ Layouts variés

### 5. Documentation
**Fichier:** `VOPAY-WIDGETS-GUIDE.md`
- ✅ Guide complet
- ✅ Tous les exemples
- ✅ Options avancées

---

## 🎯 EXEMPLE COMPLET - Dashboard

```tsx
'use client'

import {
  VoPayBalance,
  VoPayTransactions,
  VoPayTodayVolume,
  VoPayStats
} from '@/components/widgets'

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard VoPay</h1>

      {/* Grid 3 colonnes */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <VoPayBalance />
        <VoPayTodayVolume />
        <VoPayStats />
      </div>

      {/* Transactions pleine largeur */}
      <VoPayTransactions limit={10} />
    </div>
  )
}
```

---

## ✨ FONCTIONNALITÉS

### Auto-Refresh
- ⏱️ Toutes les 30 secondes automatiquement
- 🔄 Bouton refresh manuel sur chaque widget
- 📊 Données toujours à jour

### Responsive
- 📱 Mobile friendly
- 💻 Desktop optimisé
- 🎨 Layout adaptatif

### Performance
- 🚀 Un seul fetch partagé
- 💾 Pas de cache (données fraîches)
- ⚡ Chargement optimisé

---

## 🔧 CONFIGURATION

### Changer l'intervalle de refresh
```tsx
import { useVoPayData } from '@/hooks/useVoPayData'

const { data } = useVoPayData({
  refreshInterval: 10000 // 10 secondes
})
```

### Désactiver l'auto-refresh
```tsx
const { data, refresh } = useVoPayData({
  autoRefresh: false
})

// Refresh manuel uniquement
<button onClick={refresh}>Rafraîchir</button>
```

---

## 🎨 LAYOUTS DISPONIBLES

### Layout 1 - Grid 3 Colonnes
```tsx
<div className="grid grid-cols-3 gap-6">
  <VoPayBalance />
  <VoPayTodayVolume />
  <VoPayStats />
</div>
```

### Layout 2 - Sidebar + Main
```tsx
<div className="flex gap-6">
  <aside className="w-64">
    <VoPayBalanceMini />
  </aside>
  <main className="flex-1">
    <VoPayTransactions limit={10} />
  </main>
</div>
```

### Layout 3 - Full Width
```tsx
<div className="space-y-6">
  <VoPayStats />
  <VoPayTransactions limit={20} />
</div>
```

---

## 📍 OÙ UTILISER CES WIDGETS?

### ✅ Page d'Accueil Admin
Afficher balance + volume du jour

### ✅ Dashboard Principal
Grid complet avec toutes les stats

### ✅ Page Transactions
Liste détaillée avec filtres

### ✅ Sidebar Navigation
Balance mini toujours visible

### ✅ Page Rapports
Statistiques et graphiques

---

## 🔗 LIENS UTILES

- **Page Exemple:** http://localhost:3001/admin/exemple-widgets
- **Documentation Complète:** `VOPAY-WIDGETS-GUIDE.md`
- **Hook Source:** `src/hooks/useVoPayData.ts`
- **Widgets Source:** `src/components/widgets/VoPayWidgets.tsx`

---

## 💡 RAPPEL IMPORTANT

Les widgets nécessitent:
- ✅ Session admin active
- ✅ Cookie `admin-session`
- ✅ API VoPay configurée

---

**Dernière mise à jour:** 2026-01-14
**Créé par:** Claude Assistant
**Version:** 1.0.0
