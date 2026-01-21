#!/usr/bin/env bash
# Run smoke tests only (quick validation)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load test environment from .env.test if it exists
if [ -f "$PROJECT_ROOT/.env.test" ]; then
  set -a
  source "$PROJECT_ROOT/.env.test"
  set +a
fi

# Fallback to default if not set
export BASE_URL="${BASE_URL:-http://localhost:4000}"

echo "[run_smoke] Starting smoke tests..."
echo "[run_smoke] Base URL: $BASE_URL"
echo "[run_smoke] ========================================"

# Navigate to e2e directory
cd "$PROJECT_ROOT/e2e"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "[run_smoke] Installing dependencies..."
  npm ci
fi

# Run smoke tests only (tagged with @smoke)
echo "[run_smoke] Running smoke tests..."
npx playwright test --grep "@smoke" 2>&1 | tee "$PROJECT_ROOT/test-artifacts/logs/smoke.log"

TEST_EXIT_CODE=${PIPESTATUS[0]}

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "[run_smoke] ✅ Smoke tests passed!"
else
  echo "[run_smoke] ❌ Smoke tests failed with exit code: $TEST_EXIT_CODE"
  echo "[run_smoke] Check report: test-artifacts/playwright-report/index.html"
fi

exit $TEST_EXIT_CODE
