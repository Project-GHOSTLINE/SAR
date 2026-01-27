#!/bin/bash
# ============================================================
# PROJECT INVENTORY SCRIPT
# Date: 2026-01-27
# Purpose: Generate complete project inventory
# ============================================================

OUTPUT_DIR="backups/2026-01-27"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "🔍 Generating project inventory..."

# API Endpoints
echo "📡 API Endpoints" > "$OUTPUT_DIR/api-endpoints.txt"
find src/app/api -name "route.ts" -o -name "route.js" | sort >> "$OUTPUT_DIR/api-endpoints.txt"
echo "" >> "$OUTPUT_DIR/api-endpoints.txt"
echo "Total API endpoints: $(find src/app/api -name "route.ts" -o -name "route.js" | wc -l)" >> "$OUTPUT_DIR/api-endpoints.txt"

# Admin Pages
echo "🔐 Admin Pages" > "$OUTPUT_DIR/admin-pages.txt"
find src/app/admin -name "page.tsx" -o -name "page.js" | sort >> "$OUTPUT_DIR/admin-pages.txt"
echo "" >> "$OUTPUT_DIR/admin-pages.txt"
echo "Total admin pages: $(find src/app/admin -name "page.tsx" -o -name "page.js" | wc -l)" >> "$OUTPUT_DIR/admin-pages.txt"

# Public Pages
echo "🌐 Public Pages" > "$OUTPUT_DIR/public-pages.txt"
find src/app -maxdepth 2 -name "page.tsx" -o -name "page.js" | grep -v "/api/" | grep -v "/admin/" | sort >> "$OUTPUT_DIR/public-pages.txt"

# Components
echo "🧩 Components" > "$OUTPUT_DIR/components.txt"
find src/components -name "*.tsx" -o -name "*.jsx" | sort >> "$OUTPUT_DIR/components.txt"
echo "" >> "$OUTPUT_DIR/components.txt"
echo "Total components: $(find src/components -name "*.tsx" -o -name "*.jsx" | wc -l)" >> "$OUTPUT_DIR/components.txt"

# Migrations
echo "🗄️ Database Migrations" > "$OUTPUT_DIR/migrations.txt"
find supabase/migrations -name "*.sql" | sort >> "$OUTPUT_DIR/migrations.txt"
echo "" >> "$OUTPUT_DIR/migrations.txt"
echo "Total migrations: $(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l)" >> "$OUTPUT_DIR/migrations.txt"

# Documentation
echo "📚 Documentation" > "$OUTPUT_DIR/documentation.txt"
find . -maxdepth 2 -name "*.md" -not -path "./node_modules/*" -not -path "./.next/*" | sort >> "$OUTPUT_DIR/documentation.txt"
echo "" >> "$OUTPUT_DIR/documentation.txt"
echo "Total doc files: $(find . -maxdepth 2 -name "*.md" -not -path "./node_modules/*" -not -path "./.next/*" | wc -l)" >> "$OUTPUT_DIR/documentation.txt"

# Audit Artifacts
echo "🔍 Audit Artifacts" > "$OUTPUT_DIR/audit-artifacts.txt"
find audit_artifacts -type f 2>/dev/null | sort >> "$OUTPUT_DIR/audit-artifacts.txt"
echo "" >> "$OUTPUT_DIR/audit-artifacts.txt"
echo "Total audit files: $(find audit_artifacts -type f 2>/dev/null | wc -l)" >> "$OUTPUT_DIR/audit-artifacts.txt"

# Project Structure
echo "📁 Project Structure" > "$OUTPUT_DIR/structure.txt"
tree -L 3 -I 'node_modules|.next|.git' >> "$OUTPUT_DIR/structure.txt" 2>/dev/null || ls -R | grep ":$" | sed -e 's/:$//' -e 's/[^-][^\/]*\//--/g' -e 's/^/   /' -e 's/-/|/' >> "$OUTPUT_DIR/structure.txt"

# Package Info
echo "📦 Dependencies" > "$OUTPUT_DIR/dependencies.txt"
echo "=== Production Dependencies ===" >> "$OUTPUT_DIR/dependencies.txt"
cat package.json | jq -r '.dependencies | to_entries[] | "\(.key): \(.value)"' >> "$OUTPUT_DIR/dependencies.txt"
echo "" >> "$OUTPUT_DIR/dependencies.txt"
echo "=== Dev Dependencies ===" >> "$OUTPUT_DIR/dependencies.txt"
cat package.json | jq -r '.devDependencies | to_entries[] | "\(.key): \(.value)"' >> "$OUTPUT_DIR/dependencies.txt"

# Git Info
echo "🔖 Git Information" > "$OUTPUT_DIR/git-info.txt"
git log --oneline -20 >> "$OUTPUT_DIR/git-info.txt"
echo "" >> "$OUTPUT_DIR/git-info.txt"
echo "Current branch: $(git branch --show-current)" >> "$OUTPUT_DIR/git-info.txt"
echo "Last commit: $(git log -1 --format=%cd)" >> "$OUTPUT_DIR/git-info.txt"

# Environment Variables (sanitized)
echo "🔐 Environment Variables" > "$OUTPUT_DIR/env-template.txt"
echo "# Sanitized environment variables template" >> "$OUTPUT_DIR/env-template.txt"
cat .env.local 2>/dev/null | grep -v "^#" | grep "=" | sed 's/=.*/=***REDACTED***/' >> "$OUTPUT_DIR/env-template.txt" || echo "No .env.local found" >> "$OUTPUT_DIR/env-template.txt"

echo "✅ Inventory complete! Files saved to $OUTPUT_DIR"
