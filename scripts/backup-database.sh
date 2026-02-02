#!/bin/bash

# Backup Manuel de la Base de Données Supabase
# Crée un dump des tables critiques

BACKUP_DIR="backups/$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "🗄️  BACKUP BASE DE DONNÉES SUPABASE"
echo "======================================"
echo "Destination: $BACKUP_DIR"
echo ""

# Service role key
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo"
API_URL="https://dllyzfuqjzuhvshrlmuq.supabase.co/rest/v1"

# Tables critiques à sauvegarder
TABLES=(
  "clients"
  "client_sessions"
  "devops_tasks"
  "devops_task_comments"
  "audit_log"
  "admin_users"
)

for table in "${TABLES[@]}"; do
  echo "📥 Backup: $table..."

  curl -s "$API_URL/$table?select=*" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    > "$BACKUP_DIR/$table.json"

  if [ $? -eq 0 ]; then
    SIZE=$(wc -c < "$BACKUP_DIR/$table.json")
    echo "   ✅ $table.json ($SIZE bytes)"
  else
    echo "   ❌ Erreur backup $table"
  fi
done

echo ""
echo "======================================"
echo "✅ Backup terminé: $BACKUP_DIR"
echo ""
echo "Pour restaurer:"
echo "  1. Voir les fichiers JSON dans $BACKUP_DIR"
echo "  2. Utiliser Supabase Dashboard > Table Editor"
echo "  3. Ou scripts/restore-database.sh"
