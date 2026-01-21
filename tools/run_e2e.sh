#!/usr/bin/env bash
# Run full E2E test suite

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

echo "[run_e2e] Starting E2E test suite..."
echo "[run_e2e] Base URL: $BASE_URL"
echo "[run_e2e] ========================================"

# Navigate to e2e directory
cd "$PROJECT_ROOT/e2e"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "[run_e2e] Installing dependencies..."
  npm ci
fi

# Install Playwright browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "[run_e2e] Installing Playwright browsers..."
  npx playwright install chromium
fi

# Run tests and capture output
echo "[run_e2e] Running tests..."
npx playwright test 2>&1 | tee "$PROJECT_ROOT/test-artifacts/logs/e2e.log"

TEST_EXIT_CODE=${PIPESTATUS[0]}

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "[run_e2e] ✅ All tests passed!"
else
  echo "[run_e2e] ❌ Tests failed with exit code: $TEST_EXIT_CODE"
  echo "[run_e2e] Check report: test-artifacts/playwright-report/index.html"
fi

exit $TEST_EXIT_CODE
