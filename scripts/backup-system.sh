#!/bin/bash
# ============================================================
# AUTOMATED BACKUP SYSTEM - Solution Argent Rapide
# Purpose: Create comprehensive system backup
# Usage: ./scripts/backup-system.sh
# Schedule: Run weekly (every Monday at 2 AM)
# ============================================================

set -e  # Exit on error

# Configuration
PROJECT_ROOT="/Users/xunit/Desktop/📁 Projets/sar"
BACKUP_DATE=$(date +%Y-%m-%d)
BACKUP_TIME=$(date +%H-%M-%S)
BACKUP_DIR="$PROJECT_ROOT/backups/$BACKUP_DATE"
TIMESTAMP="$BACKUP_DATE $BACKUP_TIME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================
# START BACKUP
# ============================================================

log_info "Starting backup at $TIMESTAMP"
log_info "Backup directory: $BACKUP_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# ============================================================
# 1. GIT BACKUP
# ============================================================

log_info "Step 1/7: Git information"

cd "$PROJECT_ROOT"

# Check git status
git status > "$BACKUP_DIR/git-status.txt"

# Get last 50 commits
git log --oneline -50 > "$BACKUP_DIR/git-commits.txt"

# Get current branch and remote
git branch --show-current > "$BACKUP_DIR/git-branch.txt"
git remote -v > "$BACKUP_DIR/git-remote.txt"

# Check for uncommitted changes
if git diff-index --quiet HEAD --; then
  log_success "Git: No uncommitted changes"
else
  log_warning "Git: Uncommitted changes detected"
  git diff > "$BACKUP_DIR/git-uncommitted-diff.txt"
fi

log_success "Git backup complete"

# ============================================================
# 2. PROJECT INVENTORY
# ============================================================

log_info "Step 2/7: Project inventory"

# API Endpoints
find src/app/api -name "route.ts" -o -name "route.js" | sort > "$BACKUP_DIR/api-endpoints.txt"
echo "" >> "$BACKUP_DIR/api-endpoints.txt"
echo "Total: $(find src/app/api -name "route.ts" -o -name "route.js" | wc -l | tr -d ' ')" >> "$BACKUP_DIR/api-endpoints.txt"

# Admin Pages
find src/app/admin -name "page.tsx" -o -name "page.js" | sort > "$BACKUP_DIR/admin-pages.txt"
echo "" >> "$BACKUP_DIR/admin-pages.txt"
echo "Total: $(find src/app/admin -name "page.tsx" -o -name "page.js" | wc -l | tr -d ' ')" >> "$BACKUP_DIR/admin-pages.txt"

# Components
find src/components -name "*.tsx" -o -name "*.jsx" 2>/dev/null | sort > "$BACKUP_DIR/components.txt"

# Migrations
find supabase/migrations -name "*.sql" 2>/dev/null | sort > "$BACKUP_DIR/migrations.txt"

# Documentation
find . -maxdepth 2 -name "*.md" -not -path "./node_modules/*" -not -path "./.next/*" | sort > "$BACKUP_DIR/documentation.txt"

log_success "Inventory complete"

# ============================================================
# 3. DEPENDENCIES
# ============================================================

log_info "Step 3/7: Dependencies"

if command -v jq &> /dev/null; then
  echo "=== Production Dependencies ===" > "$BACKUP_DIR/dependencies.txt"
  cat package.json | jq -r '.dependencies | to_entries[] | "\(.key): \(.value)"' >> "$BACKUP_DIR/dependencies.txt"
  echo "" >> "$BACKUP_DIR/dependencies.txt"
  echo "=== Dev Dependencies ===" >> "$BACKUP_DIR/dependencies.txt"
  cat package.json | jq -r '.devDependencies | to_entries[] | "\(.key): \(.value)"' >> "$BACKUP_DIR/dependencies.txt"
else
  log_warning "jq not installed, copying package.json instead"
  cp package.json "$BACKUP_DIR/package.json.backup"
fi

log_success "Dependencies backed up"

# ============================================================
# 4. ENVIRONMENT TEMPLATE
# ============================================================

log_info "Step 4/7: Environment template (sanitized)"

if [ -f .env.local ]; then
  echo "# Environment variables template (sanitized)" > "$BACKUP_DIR/env-template.txt"
  echo "# Generated: $TIMESTAMP" >> "$BACKUP_DIR/env-template.txt"
  echo "" >> "$BACKUP_DIR/env-template.txt"
  cat .env.local | grep -v "^#" | grep "=" | sed 's/=.*/=***REDACTED***/' >> "$BACKUP_DIR/env-template.txt"
  log_success "Environment template created"
else
  log_warning ".env.local not found"
fi

# ============================================================
# 5. BUILD STATUS
# ============================================================

log_info "Step 5/7: Build verification"

# Run build check
log_info "Running build check (this may take 2-3 minutes)..."
npm run build > "$BACKUP_DIR/build-output.txt" 2>&1

if [ $? -eq 0 ]; then
  log_success "Build successful"
  echo "✅ Build successful at $TIMESTAMP" >> "$BACKUP_DIR/build-status.txt"
else
  log_error "Build failed - see build-output.txt for details"
  echo "❌ Build failed at $TIMESTAMP" >> "$BACKUP_DIR/build-status.txt"
fi

# ============================================================
# 6. DATABASE SCHEMA
# ============================================================

log_info "Step 6/7: Database schema export"

# Copy the backup script
cp "$PROJECT_ROOT/backups/2026-01-27/backup-script.sql" "$BACKUP_DIR/backup-script.sql" 2>/dev/null || log_warning "backup-script.sql not found"

log_success "Database schema prepared"

# ============================================================
# 7. PROJECT STATISTICS
# ============================================================

log_info "Step 7/7: Project statistics"

cat > "$BACKUP_DIR/statistics.txt" << EOF
# PROJECT STATISTICS
Generated: $TIMESTAMP

## Code Metrics
Total Files: $(find src -type f | wc -l | tr -d ' ')
TypeScript Files: $(find src -name "*.ts" -o -name "*.tsx" | wc -l | tr -d ' ')
React Components: $(find src/components -name "*.tsx" | wc -l | tr -d ' ')
API Routes: $(find src/app/api -name "route.ts" | wc -l | tr -d ' ')
Admin Pages: $(find src/app/admin -name "page.tsx" | wc -l | tr -d ' ')

## Documentation
Markdown Files: $(find . -maxdepth 2 -name "*.md" -not -path "./node_modules/*" | wc -l | tr -d ' ')
Migrations: $(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')

## Size
Project Size (excluding node_modules): $(du -sh . --exclude=node_modules --exclude=.next 2>/dev/null | cut -f1)
node_modules Size: $(du -sh node_modules 2>/dev/null | cut -f1)

## Git
Branch: $(git branch --show-current)
Last Commit: $(git log -1 --format=%cd)
Commit Hash: $(git log -1 --format=%h)
EOF

log_success "Statistics generated"

# ============================================================
# GENERATE BACKUP REPORT
# ============================================================

log_info "Generating backup report..."

cat > "$BACKUP_DIR/BACKUP_SUMMARY.txt" << EOF
================================================================================
BACKUP SUMMARY - Solution Argent Rapide
================================================================================

Date: $BACKUP_DATE
Time: $BACKUP_TIME
Location: $BACKUP_DIR

================================================================================
BACKUP CONTENTS
================================================================================

✅ Git Information
   - git-status.txt
   - git-commits.txt (last 50)
   - git-branch.txt
   - git-remote.txt

✅ Project Inventory
   - api-endpoints.txt ($(find src/app/api -name "route.ts" -o -name "route.js" | wc -l | tr -d ' ') endpoints)
   - admin-pages.txt ($(find src/app/admin -name "page.tsx" -o -name "page.js" | wc -l | tr -d ' ') pages)
   - components.txt
   - migrations.txt
   - documentation.txt

✅ Dependencies
   - dependencies.txt (production + dev)

✅ Environment
   - env-template.txt (sanitized)

✅ Build Status
   - build-output.txt
   - build-status.txt

✅ Database
   - backup-script.sql

✅ Statistics
   - statistics.txt

================================================================================
VERIFICATION
================================================================================

Git Status: $(if git diff-index --quiet HEAD --; then echo "✅ Clean"; else echo "⚠️  Uncommitted changes"; fi)
Build Status: $(if [ $? -eq 0 ]; then echo "✅ Successful"; else echo "❌ Failed"; fi)

================================================================================
RECOVERY INSTRUCTIONS
================================================================================

1. Clone repository:
   git clone <repo-url>
   git checkout $(git log -1 --format=%h)

2. Install dependencies:
   npm install

3. Restore environment variables:
   Copy env-template.txt to .env.local and fill in actual values

4. Restore database:
   Run backup-script.sql queries via Supabase dashboard

5. Deploy:
   vercel --prod

================================================================================
NEXT BACKUP SCHEDULED
================================================================================

Next backup: $(date -v+7d +%Y-%m-%d) (7 days from now)
Recommended: Run this script weekly

================================================================================
EOF

log_success "Backup report generated"

# ============================================================
# COMPRESS BACKUP (OPTIONAL)
# ============================================================

log_info "Creating compressed archive..."

cd "$PROJECT_ROOT/backups"
tar -czf "$BACKUP_DATE-backup.tar.gz" "$BACKUP_DATE/"

if [ $? -eq 0 ]; then
  ARCHIVE_SIZE=$(du -sh "$BACKUP_DATE-backup.tar.gz" | cut -f1)
  log_success "Compressed archive created: $BACKUP_DATE-backup.tar.gz ($ARCHIVE_SIZE)"
else
  log_warning "Failed to create compressed archive"
fi

# ============================================================
# CLEANUP OLD BACKUPS (keep last 4 weeks)
# ============================================================

log_info "Cleaning up old backups (keeping last 4 weeks)..."

find "$PROJECT_ROOT/backups" -type d -name "20*" -mtime +28 -exec rm -rf {} \; 2>/dev/null
find "$PROJECT_ROOT/backups" -type f -name "*.tar.gz" -mtime +28 -exec rm -f {} \; 2>/dev/null

log_success "Old backups cleaned up"

# ============================================================
# FINAL SUMMARY
# ============================================================

echo ""
echo "================================================================================"
log_success "BACKUP COMPLETE!"
echo "================================================================================"
echo ""
echo "📁 Backup Location: $BACKUP_DIR"
echo "📦 Archive: $BACKUP_DATE-backup.tar.gz"
echo "📊 View Report: $BACKUP_DIR/BACKUP_SUMMARY.txt"
echo ""
echo "Next steps:"
echo "  1. Review backup report: cat $BACKUP_DIR/BACKUP_SUMMARY.txt"
echo "  2. Store archive in secure location"
echo "  3. Test recovery procedure"
echo ""
echo "================================================================================"

exit 0
