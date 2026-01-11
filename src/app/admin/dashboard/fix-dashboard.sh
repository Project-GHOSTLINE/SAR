#!/bin/bash

# Backup
cp page.tsx page.backup-temp.tsx

# 1. Ajouter imports
sed -i '' "s/import { useRouter } from 'next\/navigation'/import { useRouter, useSearchParams } from 'next\/navigation'/" page.tsx
sed -i '' "/import SupportView from/a\\
import AdminNav from '@/components/admin/AdminNav'
" page.tsx

# 2. Remplacer selectedView useState
sed -i '' "/const \[selectedView, setSelectedView\] =/c\\
  const searchParams = useSearchParams()\\
  const selectedView = (searchParams.get('tab') || 'dashboard') as 'dashboard' | 'messages' | 'vopay' | 'margill' | 'support'
" page.tsx

# 3. Remplacer setSelectedView
sed -i '' "s/router.push('\/admin\/dashboard?tab=' + item.id as typeof selectedView)/router.push('\/admin\/dashboard?tab=' + item.id)/g" page.tsx
sed -i '' "s/onClick={() => router.push('\/admin\/dashboard?tab=' + item.id)}/onClick={() => router.push('\/admin\/dashboard?tab=' + (item.id as string))}/g" page.tsx

# 4. Trouver ligne du return et insérer AdminNav + <>
LINE_NUM=$(grep -n "^  return (" page.tsx | tail -1 | cut -d: -f1)
sed -i '' "${LINE_NUM}a\\
    <>\\
      <AdminNav currentPage={\"/admin/dashboard\" + (selectedView !== \"dashboard\" ? \"?tab=\" + selectedView : \"\")} />
" page.tsx

# 5. Supprimer header (lignes 502-581 environ, mais recalculer après insertions)
# Trouver ligne de début du header
START_LINE=$(awk '/^      \{\/\* Header \*\/\}$/{ print NR; exit }' page.tsx)
# Trouver ligne de fin (</header>)
END_LINE=$(awk "NR > $START_LINE && /^      <\/header>$/{ print NR; exit }" page.tsx)

# Supprimer ces lignes
sed -i '' "${START_LINE},${END_LINE}d" page.tsx

# 6. Ajouter </> avant le dernier }
# Trouver avant-dernière ligne
TOTAL_LINES=$(wc -l < page.tsx | tr -d ' ')
BEFORE_LAST=$((TOTAL_LINES - 1))

# Insérer </> et ) avant le }
sed -i '' "${BEFORE_LAST}a\\
    </>\\
  )
" page.tsx
sed -i '' "${TOTAL_LINES}d" page.tsx

echo "✅ Dashboard fixed!"
