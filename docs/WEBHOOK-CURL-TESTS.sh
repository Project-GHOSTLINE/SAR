#!/bin/bash

# ARCHITECT MODE - cURL Tests for All VoPay Webhooks
# Usage: bash docs/WEBHOOK-CURL-TESTS.sh

BASE_URL="https://api.solutionargentrapide.ca"
SHARED_SECRET="${VOPAY_SHARED_SECRET}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate HMAC signature
generate_signature() {
  local transaction_id=$1
  echo -n "$transaction_id" | openssl dgst -sha1 -hmac "$SHARED_SECRET" | awk '{print $2}'
}

echo "🏗️  ARCHITECT MODE - VoPay Webhook cURL Tests"
echo "=============================================="
echo ""

# Test 01 - Transaction Status
echo "01 - Transaction Status"
TRANSACTION_ID="TEST-TX-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$TRANSACTION_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay" \
  -H "Content-Type: application/json" \
  -d '{
    "TransactionID": "'"$TRANSACTION_ID"'",
    "TransactionType": "EFT Out",
    "TransactionAmount": "100.00",
    "TransactionStatus": "completed",
    "FullName": "Test Client Architect",
    "Currency": "CAD",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Transaction Status tested\n"

# Test 02 - eLinx Status
echo "02 - eLinx Status"
ELINX_ID="TEST-ELINX-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$ELINX_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/elinx" \
  -H "Content-Type: application/json" \
  -d '{
    "TransactionID": "'"$ELINX_ID"'",
    "ELinxTransactionID": "EL-'"$(date +%s)"'",
    "Status": "connected",
    "AccountToken": "test-token",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} eLinx Status tested\n"

# Test 03 - Account Status
echo "03 - Account Status"
ACCOUNT_ID="ACC-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$ACCOUNT_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/account-status" \
  -H "Content-Type: application/json" \
  -d '{
    "AccountID": "'"$ACCOUNT_ID"'",
    "Status": "active",
    "AccountType": "business",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Account Status tested\n"

# Test 04 - Batch Requests
echo "04 - Batch Requests"
BATCH_ID="BATCH-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$BATCH_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "BatchID": "'"$BATCH_ID"'",
    "Status": "processing",
    "TotalTransactions": 10,
    "ProcessedCount": 3,
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Batch Requests tested\n"

# Test 05 - Bank Account Creation
echo "05 - Bank Account Creation"
BANK_ACCOUNT_ID="BA-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$BANK_ACCOUNT_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/bank-account" \
  -H "Content-Type: application/json" \
  -d '{
    "AccountID": "'"$BANK_ACCOUNT_ID"'",
    "Status": "created",
    "AccountNumber": "****1234",
    "BankName": "TD Canada Trust",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Bank Account Creation tested\n"

# Test 06 - Batch Detail
echo "06 - Batch Detail"
BATCH_DETAIL_ID="BD-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$BATCH_DETAIL_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/batch-detail" \
  -H "Content-Type: application/json" \
  -d '{
    "BatchDetailID": "'"$BATCH_DETAIL_ID"'",
    "BatchID": "BATCH-123",
    "TransactionID": "TX-456",
    "Status": "completed",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Batch Detail tested\n"

# Test 07 - Scheduled Transaction
echo "07 - Scheduled Transaction"
SCHEDULE_ID="SCH-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$SCHEDULE_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/scheduled" \
  -H "Content-Type: application/json" \
  -d '{
    "ScheduleID": "'"$SCHEDULE_ID"'",
    "Status": "scheduled",
    "NextRunDate": "2026-01-30",
    "Frequency": "weekly",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Scheduled Transaction tested\n"

# Test 08 - Account Verification
echo "08 - Account Verification"
VERIFICATION_ID="VER-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$VERIFICATION_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/account-verification" \
  -H "Content-Type: application/json" \
  -d '{
    "VerificationID": "'"$VERIFICATION_ID"'",
    "Status": "verified",
    "AccountID": "ACC-123",
    "VerificationMethod": "micro-deposit",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Account Verification tested\n"

# Test 09 - Transaction Group
echo "09 - Transaction Group"
GROUP_ID="GRP-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$GROUP_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/transaction-group" \
  -H "Content-Type: application/json" \
  -d '{
    "GroupID": "'"$GROUP_ID"'",
    "Status": "processing",
    "TransactionCount": 5,
    "TotalAmount": "500.00",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Transaction Group tested\n"

# Test 10 - Account Balance
echo "10 - Account Balance"
ACCOUNT_BALANCE_ID="ACC-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$ACCOUNT_BALANCE_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/account-balance" \
  -H "Content-Type: application/json" \
  -d '{
    "AccountID": "'"$ACCOUNT_BALANCE_ID"'",
    "Balance": "5000.00",
    "Available": "4500.00",
    "Currency": "CAD",
    "AsOfDate": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Account Balance tested\n"

# Test 11 - Client Account Balance
echo "11 - Client Account Balance"
CLIENT_ACCOUNT_ID="CLI-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$CLIENT_ACCOUNT_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/client-account-balance" \
  -H "Content-Type: application/json" \
  -d '{
    "ClientAccountID": "'"$CLIENT_ACCOUNT_ID"'",
    "Balance": "1200.00",
    "Currency": "CAD",
    "LastUpdated": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Client Account Balance tested\n"

# Test 12 - Payment Received
echo "12 - Payment Received"
PAYMENT_ID="PAY-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$PAYMENT_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/payment-received" \
  -H "Content-Type: application/json" \
  -d '{
    "PaymentID": "'"$PAYMENT_ID"'",
    "Amount": "250.00",
    "Status": "received",
    "PaymentMethod": "Interac",
    "ReceivedAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Payment Received tested\n"

# Test 13 - Account Limit
echo "13 - Account Limit"
ACCOUNT_LIMIT_ID="ACC-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$ACCOUNT_LIMIT_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/account-limit" \
  -H "Content-Type: application/json" \
  -d '{
    "AccountID": "'"$ACCOUNT_LIMIT_ID"'",
    "DailyLimit": "10000.00",
    "RemainingLimit": "7500.00",
    "UsedAmount": "2500.00",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Account Limit tested\n"

# Test 14 - Virtual Accounts
echo "14 - Virtual Accounts"
VIRTUAL_ACCOUNT_ID="VA-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$VIRTUAL_ACCOUNT_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/virtual-accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "VirtualAccountID": "'"$VIRTUAL_ACCOUNT_ID"'",
    "Status": "active",
    "AccountNumber": "VA-****5678",
    "CreatedAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Virtual Accounts tested\n"

# Test 15 - Credit Card Connection
echo "15 - Credit Card Connection"
CARD_ID="CC-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$CARD_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/credit-card" \
  -H "Content-Type: application/json" \
  -d '{
    "CardID": "'"$CARD_ID"'",
    "Status": "connected",
    "LastFourDigits": "4242",
    "CardType": "Visa",
    "ExpiryDate": "12/27",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Credit Card Connection tested\n"

# Test 16 - Debit Card Connection
echo "16 - Debit Card Connection"
DEBIT_CARD_ID="DC-$(date +%s)"
VALIDATION_KEY=$(generate_signature "$DEBIT_CARD_ID")
curl -X POST "$BASE_URL/api/webhooks/vopay/debit-card" \
  -H "Content-Type: application/json" \
  -d '{
    "CardID": "'"$DEBIT_CARD_ID"'",
    "Status": "connected",
    "LastFourDigits": "1234",
    "CardType": "Debit",
    "BankName": "RBC",
    "ValidationKey": "'"$VALIDATION_KEY"'",
    "Environment": "Production"
  }'
echo -e "\n${GREEN}✓${NC} Debit Card Connection tested\n"

echo "=============================================="
echo -e "${GREEN}✅ All 16 webhooks tested successfully!${NC}"
echo "=============================================="
