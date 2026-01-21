# SAR - E2E Testing Makefile
# Quick shortcuts for common operations

.PHONY: help stack-up stack-down stack-logs reset e2e smoke collect report trace api-test api-test-staging api-report

# Default target
help:
	@echo "SAR E2E Testing - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Docker Stack:"
	@echo "  make stack-up      - Start n8n + playwright-runner"
	@echo "  make stack-down    - Stop all containers"
	@echo "  make stack-logs    - View n8n logs"
	@echo ""
	@echo "Testing:"
	@echo "  make reset         - Clean test artifacts"
	@echo "  make smoke         - Run smoke tests (quick)"
	@echo "  make e2e           - Run full E2E suite"
	@echo "  make e2e-quick     - Run E2E without reset"
	@echo ""
	@echo "API Testing (Newman):"
	@echo "  make api-test      - Run API tests (dev)"
	@echo "  make api-test-staging - Run API tests (staging)"
	@echo "  make api-report    - View latest API test report"
	@echo ""
	@echo "Site Analysis:"
	@echo "  make analyze       - Analyze entire site for errors"
	@echo "  make analyze-report - View site analysis report"
	@echo "  make analyze-qb    - Analyze QuickBooks section"
	@echo "  make analyze-qb-report - View QuickBooks analysis"
	@echo ""
	@echo "Artifacts & Interfaces:"
	@echo "  make report        - Open HTML report"
	@echo "  make dashboard     - Open E2E Dashboard (recommended)"
	@echo "  make ui            - Open Playwright UI Mode (interactive)"
	@echo "  make interfaces    - Open all interfaces at once"
	@echo "  make collect       - Package artifacts"
	@echo "  make trace         - View last trace"
	@echo ""

# Docker operations
stack-up:
	@echo "🚀 Starting Docker stack..."
	docker compose up -d
	@echo "✅ Stack running:"
	@echo "   - n8n: http://localhost:5678"
	@echo "   - Playwright runner: ready"

stack-down:
	@echo "🛑 Stopping Docker stack..."
	docker compose down

stack-logs:
	docker compose logs -f n8n

# Testing operations
reset:
	@echo "🧹 Resetting test environment..."
	@./tools/reset_env.sh

smoke: reset
	@echo "🔥 Running smoke tests..."
	@./tools/run_smoke.sh

e2e: reset
	@echo "🧪 Running full E2E suite..."
	@./tools/run_e2e.sh

e2e-quick:
	@echo "⚡ Running E2E tests (no reset)..."
	@cd e2e && npx playwright test

# Specific test tags
test-quickbooks:
	@echo "💰 Running QuickBooks tests..."
	@cd e2e && npx playwright test --grep @quickbooks

test-auth:
	@echo "🔐 Running authentication tests..."
	@cd e2e && npx playwright test --grep @auth

# Artifacts and reporting
report:
	@echo "📊 Opening test report..."
	@cd e2e && npx playwright show-report ../test-artifacts/playwright-report

dashboard:
	@echo "🎨 Opening E2E Dashboard..."
	@open e2e-dashboard.html

ui:
	@echo "🎭 Opening Playwright UI Mode..."
	@cd e2e && npx playwright test --ui

interfaces:
	@echo "🌟 Opening all interfaces..."
	@./tools/open_all_interfaces.sh

collect:
	@echo "📦 Collecting artifacts..."
	@./tools/collect_artifacts.sh

trace:
	@echo "🔍 Opening trace viewer..."
	@cd e2e && npx playwright show-trace ../test-artifacts/traces/*.zip 2>/dev/null || echo "No traces found"

# Development helpers
install:
	@echo "📥 Installing dependencies..."
	@cd e2e && npm ci && npx playwright install chromium

clean: reset stack-down
	@echo "🧹 Full cleanup..."
	@rm -rf e2e/node_modules
	@rm -rf test-artifacts-*.tar.gz
	@echo "✅ Cleanup complete"

# API Testing (Newman)
api-test:
	@echo "🧪 Running API tests (dev)..."
	@bash postman/run.sh dev

api-test-staging:
	@echo "🧪 Running API tests (staging)..."
	@bash postman/run.sh staging

api-test-prod:
	@echo "🧪 Running API tests (production)..."
	@bash postman/run.sh prod

api-report:
	@echo "📊 Opening API test report..."
	@open postman/reports/latest.html

# Site Analysis
analyze:
	@echo "🕷️ Analyzing entire site..."
	@cd e2e && npx playwright test site-analyzer --project=chromium

analyze-report:
	@echo "📊 Opening site analysis report..."
	@open test-artifacts/site-analysis/report.html

analyze-qb:
	@echo "🔍 Analyzing QuickBooks section..."
	@cd e2e && npx playwright test admin-quickbooks-analyzer --project=chromium

analyze-qb-report:
	@echo "📊 Opening QuickBooks analysis report..."
	@open test-artifacts/quickbooks-analysis/quickbooks-analysis.html

# CI/CD simulation
ci: reset e2e collect
	@echo "✅ CI pipeline complete"
