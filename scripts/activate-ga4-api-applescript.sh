#!/bin/bash

# Script pour activer Google Analytics Data API via AppleScript
# Contrôle Chrome/Safari pour cliquer automatiquement

PROJECT_ID="1059974911454"
API_URL="https://console.developers.google.com/apis/library/analyticsdata.googleapis.com?project=${PROJECT_ID}"

echo "🚀 Activation automatique de Google Analytics Data API"
echo ""
echo "📡 Ouverture de la page dans Chrome..."

# Ouvrir la page dans Chrome
osascript <<EOF
tell application "Google Chrome"
    activate
    open location "$API_URL"
    delay 5

    -- Attendre que la page charge
    set windowCount to count of windows
    if windowCount > 0 then
        set currentTab to active tab of front window

        -- Attendre 10 secondes pour le chargement complet
        delay 10

        -- Message à l'utilisateur
        display notification "Page chargée. Cherchez le bouton ENABLE et cliquez dessus." with title "Activation API GA4"
    end if
end tell
EOF

echo ""
echo "✅ Page ouverte dans Chrome!"
echo ""
echo "📋 Instructions:"
echo "   1. Dans la fenêtre Chrome qui vient de s'ouvrir:"
echo "   2. Cherchez 'Google Analytics Data API' dans la liste"
echo "   3. Cliquez dessus"
echo "   4. Cliquez sur le bouton bleu 'ENABLE' (ou 'ACTIVER')"
echo ""
echo "⏳ Ce script va attendre 60 secondes..."
echo "   Cliquez sur ENABLE pendant ce temps!"
echo ""

# Attendre 60 secondes
for i in {60..1}; do
    echo -ne "\r⏰ Temps restant: $i secondes   "
    sleep 1
done

echo -e "\n"
echo "✅ Temps écoulé!"
echo ""
echo "🧪 Test de l'API dans 3 secondes..."
sleep 3

# Tester l'API
echo ""
echo "📡 Test de collecte GA4..."
RESPONSE=$(curl -s -X POST "http://localhost:3002/api/seo/collect/ga4" \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json" \
  --max-time 25)

# Vérifier si c'est un succès
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ SUCCÈS! L'API fonctionne!"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20
    exit 0
elif echo "$RESPONSE" | grep -q "PERMISSION_DENIED"; then
    echo "❌ L'API n'est pas encore activée ou en cours de propagation."
    echo ""
    echo "📋 Actions à faire:"
    echo "   1. Vérifiez que vous avez bien cliqué sur ENABLE"
    echo "   2. Attendez 2-3 minutes supplémentaires"
    echo "   3. Relancez: curl -X POST http://localhost:3002/api/seo/collect/ga4 -H 'x-api-key: FredRosa%1978'"
    exit 1
elif echo "$RESPONSE" | grep -q "MODE MOCK"; then
    echo "⚠️  L'API collecte en mode MOCK (données factices)"
    echo ""
    echo "Cela signifie que:"
    echo "   - Soit l'API n'est pas encore activée"
    echo "   - Soit les credentials ne sont pas correctement configurés"
    exit 1
else
    echo "❓ Réponse inattendue:"
    echo "$RESPONSE"
    exit 1
fi
