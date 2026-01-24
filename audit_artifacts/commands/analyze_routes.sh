#!/bin/bash
# Analyse chaque route pour détecter les méthodes HTTP

echo '['
first=true
while IFS= read -r file; do
  if [ "$first" = true ]; then
    first=false
  else
    echo ","
  fi
  
  # Extraire le path API depuis le chemin fichier
  api_path=$(echo "$file" | sed 's|src/app||' | sed 's|/route\.(ts|js)||')
  
  # Détecter les méthodes HTTP exportées
  methods=$(grep -E "^export (async )?function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)" "$file" 2>/dev/null | sed -E 's/^export (async )?function ([A-Z]+).*/\2/' | tr '\n' ',' | sed 's/,$//')
  
  # Catégoriser
  category="misc"
  if echo "$api_path" | grep -q "admin"; then category="admin"; fi
  if echo "$api_path" | grep -q "webhook"; then category="webhook"; fi
  if echo "$api_path" | grep -q "quickbooks"; then category="quickbooks"; fi
  if echo "$api_path" | grep -q "seo"; then category="seo"; fi
  if echo "$api_path" | grep -q "vopay"; then category="vopay"; fi
  if echo "$api_path" | grep -q "telemetry"; then category="telemetry"; fi
  if echo "$api_path" | grep -q "cron"; then category="cron"; fi
  if echo "$api_path" | grep -q "worker"; then category="worker"; fi
  if echo "$api_path" | grep -q "auth\|login\|logout"; then category="auth"; fi
  
  echo -n "  {\"path\":\"$api_path\",\"methods\":\"$methods\",\"file\":\"$file\",\"category\":\"$category\"}"
done < audit_artifacts/commands/find_api_routes.txt
echo ''
echo ']'
