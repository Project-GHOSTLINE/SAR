# VERCEL ENVIRONMENT VARIABLE SETUP

## CRITICAL: Add TELEMETRY_HASH_SALT

### Via Vercel Dashboard (30 seconds)

1. Go to: https://vercel.com/project-ghostline/sar/settings/environment-variables
2. Click "Add New"
3. Enter:
   - **Key**: `TELEMETRY_HASH_SALT`
   - **Value**: `95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2`
   - **Environments**: Check ALL three (Production, Preview, Development)
4. Click "Save"
5. **IMPORTANT**: Redeploy production for changes to take effect
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### Via Vercel CLI (Alternative)

If you have Vercel CLI installed and authenticated:

```bash
# Add to all environments
vercel env add TELEMETRY_HASH_SALT production
# Paste: 95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2

vercel env add TELEMETRY_HASH_SALT preview
# Paste: 95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2

vercel env add TELEMETRY_HASH_SALT development
# Paste: 95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2

# Redeploy
vercel --prod
```

### Verification

After redeployment, check:
1. No more 500 errors in browser console
2. Telemetry tracking works: https://admin.solutionargentrapide.ca/api/telemetry/track-event
3. Sessions appear in Supabase: `SELECT COUNT(*) FROM client_sessions WHERE created_at > NOW() - INTERVAL '1 hour'`
4. Analytics dashboard shows data: https://admin.solutionargentrapide.ca/admin/analytics

## Why This Error Happened

The telemetry API needs `TELEMETRY_HASH_SALT` to hash IPs and User-Agents (privacy requirement). Without it:
- API returns 500 error
- No sessions are created
- No events are tracked
- Analytics dashboard stays empty

Once added and redeployed, all telemetry will start working immediately.
