# 🧪 SAR - Newman API Testing

Postman/Newman integration for SAR API testing via terminal.

## 📁 Structure

```
postman/
├── collections/
│   └── SAR-API-Tests.postman_collection.json  # Main test collection
├── environments/
│   ├── dev.json                                # Local development
│   ├── staging.json                            # Staging environment
│   └── prod.json                               # Production environment
├── reports/                                    # Generated reports (gitignored)
│   ├── latest.json                             # Symlink to latest JSON
│   ├── latest.html                             # Symlink to latest HTML
│   └── dev_YYYYMMDD_HHMMSS.{json,html}        # Timestamped reports
├── run.sh                                      # Test execution script
└── README.md                                   # This file
```

## 🚀 Quick Start

### 1. Run API Tests

```bash
# Development environment (default)
npm run api:test

# Specific environment
npm run api:test:dev
npm run api:test:staging
npm run api:test:prod

# Quick test (no reports, console only)
npm run api:test:quick
```

### 2. View Latest Report

```bash
npm run api:report
```

### 3. Via Makefile

```bash
make api-test           # Run dev tests
make api-test-staging   # Run staging tests
make api-report         # Open latest report
```

### 4. Direct Newman Command

```bash
newman run postman/collections/SAR-API-Tests.postman_collection.json \
  -e postman/environments/dev.json
```

## 📊 Reports

### HTML Report (htmlextra)

Beautiful, detailed HTML reports with:
- Request/Response details
- Test results with assertions
- Performance metrics
- Environment variables
- Request history
- Charts and graphs

**Location**: `postman/reports/latest.html`

### JSON Report

Machine-readable test results for CI/CD integration.

**Location**: `postman/reports/latest.json`

## 🧪 Test Collection

### Test Groups

1. **Admin - Authentication**
   - Login admin
   - Validates auth flow
   - Performance: <500ms

2. **QuickBooks - Status & Connection**
   - Get QuickBooks status
   - Initiate OAuth connection
   - Validates connection state

3. **QuickBooks - Sync Operations**
   - Sync customers (skipped if not connected)
   - Sync invoices (skipped if not connected)
   - Sync payments (skipped if not connected)

4. **QuickBooks - Reports**
   - Profit & Loss report (skipped if not connected)
   - Balance Sheet report (skipped if not connected)
   - Cash Flow report (skipped if not connected)

5. **Health Checks**
   - App health check
   - Response time validation

### Smart Skip Logic

Tests automatically skip when QuickBooks is not connected, preventing false failures.

```javascript
// Pre-request script example
if (pm.environment.get("QB_CONNECTED") === "false") {
    pm.execution.skipRequest();
}
```

## 🌍 Environments

### Development (dev.json)

```json
{
  "BASE_URL": "http://localhost:4000",
  "ADMIN_PASSWORD": "FredRosa%1978",
  "QB_CONNECTED": "false",
  "ENVIRONMENT": "development"
}
```

### Staging (staging.json)

```json
{
  "BASE_URL": "https://staging.solutionargentrapide.ca",
  "ADMIN_PASSWORD": "",  // Set via secrets
  "QB_CONNECTED": "false",
  "ENVIRONMENT": "staging"
}
```

### Production (prod.json)

```json
{
  "BASE_URL": "https://admin.solutionargentrapide.ca",
  "ADMIN_PASSWORD": "",  // Set via secrets
  "QB_CONNECTED": "false",
  "ENVIRONMENT": "production"
}
```

## 🔧 Configuration

### Update Admin Password (Staging/Prod)

```bash
# Edit environment file
code postman/environments/staging.json

# Or use secrets in CI (recommended)
```

### Add New Tests

1. Import collection in Postman
2. Add/modify requests
3. Export collection
4. Replace `postman/collections/SAR-API-Tests.postman_collection.json`

### Customize Reports

Edit `run.sh` reporter options:

```bash
--reporter-htmlextra-title "Custom Title"
--reporter-htmlextra-showEnvironmentData
--reporter-htmlextra-logs
```

## 🤖 CI/CD Integration

### GitHub Actions

Workflow: `.github/workflows/api-tests.yml`

**Triggers**:
- Push to `main` or `develop`
- Pull requests
- Manual dispatch (workflow_dispatch)

**Environments tested**:
- Dev (with app running in CI)
- Staging (against live staging)
- Production (manual trigger only)

**Artifacts**:
- HTML reports (30 days retention)
- JSON results (7 days retention)
- PR comments with test summary

### Run Manually

```bash
gh workflow run api-tests.yml -f environment=staging
```

## 📈 Performance Benchmarks

| Endpoint | Expected | Threshold |
|----------|----------|-----------|
| POST /api/admin/login | <200ms | 500ms |
| GET /api/quickbooks/status | <100ms | 1000ms |
| POST /api/quickbooks/sync/* | <2s | 5000ms |
| GET /api/quickbooks/reports/* | <3s | 5000ms |

## 🐛 Troubleshooting

### Tests fail with "ECONNREFUSED"

**Problem**: App not running

**Solution**:
```bash
# Start the app first
npm run dev:4000

# In another terminal
npm run api:test
```

### "QB_CONNECTED is false" - all QB tests skipped

**Status**: This is NORMAL behavior

**Reason**: QuickBooks not connected in test environment

**To test QB features**:
1. Connect QuickBooks via UI
2. Re-run tests
3. QB tests will execute

### Environment file not found

**Problem**: `postman/environments/staging.json` missing password

**Solution**:
```bash
# Add password to environment file
code postman/environments/staging.json
```

### Reports not generated

**Problem**: Newman failed before generating reports

**Solution**:
```bash
# Check Newman installation
newman --version

# Reinstall if needed
npm install -g newman newman-reporter-htmlextra
```

## 📝 Examples

### Run with custom options

```bash
# Verbose output
newman run postman/collections/SAR-API-Tests.postman_collection.json \
  -e postman/environments/dev.json \
  --verbose

# Skip SSL verification (dev only)
newman run postman/collections/SAR-API-Tests.postman_collection.json \
  -e postman/environments/dev.json \
  --insecure

# Stop on first failure
newman run postman/collections/SAR-API-Tests.postman_collection.json \
  -e postman/environments/dev.json \
  --bail
```

### Export reports to custom location

```bash
newman run postman/collections/SAR-API-Tests.postman_collection.json \
  -e postman/environments/dev.json \
  --reporters htmlextra \
  --reporter-htmlextra-export /tmp/custom-report.html
```

### Integrate with other tools

```bash
# JUnit XML for Jenkins
newman run ... --reporters cli,junit --reporter-junit-export results.xml

# JSON + jq for parsing
newman run ... --reporters json --reporter-json-export results.json
cat results.json | jq '.run.stats.tests'
```

## 🎯 Best Practices

1. **Always run dev tests locally** before pushing
2. **Use staging** for integration testing
3. **Production tests** only when necessary (manual trigger)
4. **Review HTML reports** for detailed insights
5. **Keep environment files secure** (gitignored, use secrets)
6. **Update collection** when API changes
7. **Monitor performance trends** over time

## 📚 Resources

- [Newman Documentation](https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/)
- [Postman Collections](https://learning.postman.com/docs/collections/collections-overview/)
- [newman-reporter-htmlextra](https://github.com/DannyDainton/newman-reporter-htmlextra)
- [GitHub Actions for Newman](https://github.com/marketplace/actions/newman-action)

## 🆘 Support

For issues or questions:
1. Check this README
2. Review HTML reports for detailed errors
3. Check app logs: `docker compose logs -f`
4. Verify environment configuration

---

**Last Updated**: 2026-01-21
**Maintainer**: SAR Team
**Newman Version**: 6.2.2
**Reporter Version**: 1.23.1
