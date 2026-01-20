#!/bin/bash
#
# ANALYZE PERFORMANCE LOGS - PHASE 2
#
# Analyzes logs/perf.ndjson and generates summary report
#
# Usage:
#   ./scripts/perf/analyze.sh
#   ./scripts/perf/analyze.sh --json  # Output JSON format
#

set -e

PERF_LOG="logs/perf.ndjson"
OUTPUT_FORMAT="${1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ ! -f "$PERF_LOG" ]; then
  echo -e "${RED}Error: No performance logs found at $PERF_LOG${NC}"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq not installed. Install with: brew install jq${NC}"
  echo ""
  echo "Showing raw logs:"
  cat "$PERF_LOG"
  exit 0
fi

echo ""
echo "========================================"
echo "  PERFORMANCE ANALYSIS"
echo "========================================"
echo ""

# Count total requests
TOTAL=$(wc -l < "$PERF_LOG" | tr -d ' ')
echo "Total requests: $TOTAL"
echo ""

# Group by route and calculate stats
echo "Per-Route Statistics:"
echo "---"

jq -r '
  .route as $route |
  .msTotal as $ms |
  .dbCalls as $db |
  .bytesOut as $bytes |
  "\($route)|\($ms)|\($db)|\($bytes)"
' "$PERF_LOG" | \
awk -F'|' '
{
  route = $1
  ms = $2
  db = $3
  bytes = $4

  count[route]++
  sum_ms[route] += ms
  sum_db[route] += db
  sum_bytes[route] += bytes

  # Track for percentiles
  times[route, count[route]] = ms
}
END {
  for (r in count) {
    n = count[r]
    avg_ms = sum_ms[r] / n
    avg_db = sum_db[r] / n
    avg_bytes = sum_bytes[r] / n

    # Calculate p50, p95, p99
    asort_times(times, r, n, sorted)
    p50 = sorted[int(n * 0.50)]
    p95 = sorted[int(n * 0.95)]
    p99 = sorted[int(n * 0.99)]

    # Status indicators
    p95_status = (p95 > 200) ? "❌" : (p95 > 100) ? "⚠️" : "✅"
    p99_status = (p99 > 400) ? "❌" : (p99 > 200) ? "⚠️" : "✅"

    printf "\n%s (%d requests)\n", r, n
    printf "  p50: %dms | p95: %dms %s | p99: %dms %s\n", p50, p95, p95_status, p99, p99_status
    printf "  DB calls: %.1f avg | Payload: %.1fKB avg\n", avg_db, avg_bytes / 1024
  }
}

function asort_times(arr, route, n, result,    i, j, temp) {
  for (i = 1; i <= n; i++) {
    result[i] = arr[route, i]
  }
  # Bubble sort (good enough for small datasets)
  for (i = 1; i <= n; i++) {
    for (j = i + 1; j <= n; j++) {
      if (result[i] > result[j]) {
        temp = result[i]
        result[i] = result[j]
        result[j] = temp
      }
    }
  }
}
'

echo ""
echo "========================================"
echo ""

# Show slowest requests
echo "Top 10 Slowest Requests:"
echo "---"
jq -r '[.route, .msTotal, .dbCalls, .requestId] | @tsv' "$PERF_LOG" | \
  sort -k2 -rn | \
  head -10 | \
  awk '{printf "%s | %sms | %s DB calls | %s\n", $1, $2, $3, $4}'

echo ""
