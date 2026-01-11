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
# Trouver le début du header (ligne "return (")
lines = content.split('\n')
new_lines = []
skip_header = False
header_start = False

for i, line in enumerate(lines):
    if '  return (' in line and not skip_header:
        # On est au return principal
        new_lines.append(line)
        new_lines.append('    <>')
        new_lines.append('      <AdminNav currentPage={"/admin/dashboard" + (selectedView !== "dashboard" ? "?tab=" + selectedView : "")} />')
        header_start = True
        continue

    # Skip le header custom (de <div className="min-h-screen jusqu'à </header>)
    if header_start and '<div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-emerald-50 flex flex-col">' in line:
        skip_header = True
        new_lines.append('      ' + line.strip())
        continue

    if skip_header and '</header>' in line:
        skip_header = False
        continue

    if skip_header:
        continue

    # Ajouter </> avant le dernier }
    if i == len(lines) - 1 and line == '}':
        new_lines.append('    </>')
        new_lines.append('  )')
        new_lines.append('}')
        continue

    new_lines.append(line)

# Reconstituer le fichier
content = '\n'.join(new_lines)

# Sauvegarder
with open('page.tsx', 'w') as f:
    f.write(content)

print("✅ Dashboard modifié avec succès!")
