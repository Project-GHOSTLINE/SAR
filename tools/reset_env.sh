#!/usr/bin/env bash
# Reset test artifacts and prepare clean environment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[reset_env] Cleaning test artifacts..."

# Create directories if they don't exist
mkdir -p "$PROJECT_ROOT/test-artifacts"/{logs,traces,screenshots,playwright-report}

# Clean old artifacts
rm -rf "$PROJECT_ROOT/test-artifacts/playwright-report"/* || true
rm -rf "$PROJECT_ROOT/test-artifacts/traces"/* || true
rm -rf "$PROJECT_ROOT/test-artifacts/screenshots"/* || true
rm -f "$PROJECT_ROOT/test-artifacts/logs"/*.log || true
rm -f "$PROJECT_ROOT/test-artifacts"/*.xml || true
rm -f "$PROJECT_ROOT/test-artifacts"/*.json || true

# Clean Playwright test results
rm -rf "$PROJECT_ROOT/e2e/test-results" || true

echo "[reset_env] ✅ Environment reset complete"
echo "[reset_env] Artifacts directory cleaned"
