#!/usr/bin/env bash
# Collect and package test artifacts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARTIFACT_BUNDLE="test-artifacts-${TIMESTAMP}.tar.gz"

echo "[collect_artifacts] Collecting test artifacts..."

cd "$PROJECT_ROOT"

# Create tarball with all artifacts
tar -czf "$ARTIFACT_BUNDLE" \
  test-artifacts/playwright-report/ \
  test-artifacts/traces/ \
  test-artifacts/screenshots/ \
  test-artifacts/logs/ \
  test-artifacts/*.xml \
  test-artifacts/*.json \
  2>/dev/null || true

if [ -f "$ARTIFACT_BUNDLE" ]; then
  BUNDLE_SIZE=$(du -h "$ARTIFACT_BUNDLE" | cut -f1)
  echo "[collect_artifacts] ✅ Artifacts collected: $ARTIFACT_BUNDLE ($BUNDLE_SIZE)"
  echo "[collect_artifacts] Location: $PROJECT_ROOT/$ARTIFACT_BUNDLE"
else
  echo "[collect_artifacts] ❌ Failed to create artifact bundle"
  exit 1
fi
