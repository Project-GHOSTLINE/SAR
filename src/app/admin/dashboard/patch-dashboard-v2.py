#!/usr/bin/env python3
import re

# Lire le fichier
with open('page.tsx', 'r') as f:
    content = f.read()

# 1. Ajouter useSearchParams aux imports
content = content.replace(
    "import { useRouter } from 'next/navigation'",
    "import { useRouter, useSearchParams } from 'next/navigation'"
)

# 2. Ajouter import AdminNav après SupportView
content = content.replace(
    "import SupportView from '@/components/admin/SupportView'",
    "import SupportView from '@/components/admin/SupportView'\nimport AdminNav from '@/components/admin/AdminNav'"
)

# 3. Remplacer selectedView useState par lecture du query param
old_selected_view = "  const [selectedView, setSelectedView] = useState<'dashboard' | 'messages' | 'vopay' | 'margill' | 'support'>('dashboard')"
new_selected_view = """  const searchParams = useSearchParams()
  const selectedView = (searchParams.get('tab') || 'dashboard') as 'dashboard' | 'messages' | 'vopay' | 'margill' | 'support'"""

content = content.replace(old_selected_view, new_selected_view)

# 4. Remplacer tous les setSelectedView par router.push
content = re.sub(
    r"setSelectedView\('([^']+)'\)",
    r"router.push('/admin/dashboard?tab=\1')",
    content
)
content = re.sub(
    r"setSelectedView\((item\.id as typeof selectedView)\)",
    r"router.push('/admin/dashboard?tab=' + item.id)",
    content
)

# 5. Supprimer le header custom et ajouter AdminNav
# Trouver et remplacer le return (
pattern_return = r'(  return \(\s*\n)'
content = re.sub(pattern_return, r'\1    <>\n      <AdminNav currentPage={"/admin/dashboard" + (selectedView !== "dashboard" ? "?tab=" + selectedView : "")} />\n', content, count=1)

# Supprimer le header (de <header jusqu'à </header>)
pattern_header = r'      {/\* Header \*/}\s*\n\s*<header className="[^"]*">[^]*?</header>\s*\n\s*'
content = re.sub(pattern_header, '', content)

# Ajouter </> avant le dernier }
content = re.sub(r'(\s*</div>\s*\n\s*\))\s*\n}$', r'\1\n    </>\n  )\n}', content)

# Sauvegarder
with open('page.tsx', 'w') as f:
    f.write(content)

print("✅ Dashboard modifié avec succès!")
