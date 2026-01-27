#!/bin/bash
# ============================================================
# BACKUP VERIFICATION SCRIPT
# Purpose: Verify integrity of backup
# Usage: ./scripts/verify-backup.sh backups/YYYY-MM-DD
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Check arguments
if [ $# -eq 0 ]; then
  log_error "Usage: $0 <backup-directory>"
  log_info "Example: $0 backups/2026-01-27"
  exit 1
fi

BACKUP_DIR="$1"

# Check if directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  log_error "Directory not found: $BACKUP_DIR"
  exit 1
fi

log_info "Verifying backup: $BACKUP_DIR"
echo "================================================================="

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check file exists
check_file() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -f "$BACKUP_DIR/$1" ]; then
    log_success "$1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_error "$1 - MISSING"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
}

# Function to check file not empty
check_file_not_empty() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -s "$BACKUP_DIR/$1" ]; then
    log_success "$1 ($(wc -l < $BACKUP_DIR/$1 | tr -d ' ') lines)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_warning "$1 - EMPTY"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
}

echo ""
log_info "Checking critical files..."
echo "----------------------------------------------------------------"

# Critical files
check_file "BACKUP_SUMMARY.txt"
check_file "backup-script.sql"
check_file "git-status.txt"
check_file "api-endpoints.txt"
check_file "admin-pages.txt"
check_file "dependencies.txt"
check_file "env-template.txt"

echo ""
log_info "Checking file content..."
echo "----------------------------------------------------------------"

# Check files are not empty
check_file_not_empty "api-endpoints.txt"
check_file_not_empty "admin-pages.txt"
check_file_not_empty "git-status.txt"
check_file_not_empty "dependencies.txt"

echo ""
log_info "Checking API endpoints count..."
echo "----------------------------------------------------------------"

if [ -f "$BACKUP_DIR/api-endpoints.txt" ]; then
  API_COUNT=$(grep -c "route.ts" "$BACKUP_DIR/api-endpoints.txt" || echo "0")
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ "$API_COUNT" -gt 100 ]; then
    log_success "API endpoints: $API_COUNT (expected > 100)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_warning "API endpoints: $API_COUNT (expected > 100)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
fi

echo ""
log_info "Checking admin pages count..."
echo "----------------------------------------------------------------"

if [ -f "$BACKUP_DIR/admin-pages.txt" ]; then
  ADMIN_COUNT=$(grep -c "page.tsx" "$BACKUP_DIR/admin-pages.txt" || echo "0")
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ "$ADMIN_COUNT" -gt 20 ]; then
    log_success "Admin pages: $ADMIN_COUNT (expected > 20)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_warning "Admin pages: $ADMIN_COUNT (expected > 20)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
fi

echo ""
log_info "Checking git information..."
echo "----------------------------------------------------------------"

if [ -f "$BACKUP_DIR/git-status.txt" ]; then
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if grep -q "On branch" "$BACKUP_DIR/git-status.txt"; then
    BRANCH=$(grep "On branch" "$BACKUP_DIR/git-status.txt" | cut -d' ' -f3)
    log_success "Git branch: $BRANCH"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_error "Git status file malformed"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
fi

echo ""
log_info "Checking database schema..."
echo "----------------------------------------------------------------"

if [ -f "$BACKUP_DIR/backup-script.sql" ]; then
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  SQL_LINES=$(wc -l < "$BACKUP_DIR/backup-script.sql" | tr -d ' ')
  if [ "$SQL_LINES" -gt 50 ]; then
    log_success "SQL schema: $SQL_LINES lines"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_warning "SQL schema: $SQL_LINES lines (seems short)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
fi

echo ""
log_info "Checking environment template..."
echo "----------------------------------------------------------------"

if [ -f "$BACKUP_DIR/env-template.txt" ]; then
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  REDACTED_COUNT=$(grep -c "REDACTED" "$BACKUP_DIR/env-template.txt" || echo "0")
  if [ "$REDACTED_COUNT" -gt 10 ]; then
    log_success "Environment vars: $REDACTED_COUNT redacted (properly sanitized)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_warning "Environment vars: only $REDACTED_COUNT redacted"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi

  # Check no actual secrets leaked
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if grep -E "(sk_live_|pk_live_|[A-Za-z0-9]{32}=)" "$BACKUP_DIR/env-template.txt" > /dev/null; then
    log_error "SECURITY WARNING: Possible secrets found in env-template.txt!"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  else
    log_success "No secrets leaked in environment template"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  fi
fi

echo ""
log_info "Checking compressed archive..."
echo "----------------------------------------------------------------"

ARCHIVE_PATH="$(dirname $BACKUP_DIR)/$(basename $BACKUP_DIR)-backup.tar.gz"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f "$ARCHIVE_PATH" ]; then
  ARCHIVE_SIZE=$(du -sh "$ARCHIVE_PATH" | cut -f1)
  log_success "Archive exists: $ARCHIVE_SIZE"
  PASSED_CHECKS=$((PASSED_CHECKS + 1))

  # Test archive integrity
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if tar -tzf "$ARCHIVE_PATH" > /dev/null 2>&1; then
    log_success "Archive integrity OK"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    log_error "Archive corrupted!"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
else
  log_warning "Compressed archive not found: $ARCHIVE_PATH"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ============================================================
# FINAL SUMMARY
# ============================================================

echo ""
echo "================================================================="
echo "VERIFICATION SUMMARY"
echo "================================================================="
echo ""
echo "Total Checks:  $TOTAL_CHECKS"
echo "Passed:        $PASSED_CHECKS"
echo "Failed:        $FAILED_CHECKS"
echo ""

# Calculate percentage
PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

if [ $FAILED_CHECKS -eq 0 ]; then
  log_success "Backup verification: PASSED (100%)"
  echo ""
  log_info "Backup is complete and ready for use"
  exit 0
elif [ $PERCENTAGE -ge 80 ]; then
  log_warning "Backup verification: PARTIAL ($PERCENTAGE%)"
  echo ""
  log_warning "Some checks failed but backup is usable"
  exit 0
else
  log_error "Backup verification: FAILED ($PERCENTAGE%)"
  echo ""
  log_error "Backup is incomplete or corrupted"
  exit 1
fi
