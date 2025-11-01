# Maintainer Guide

This guide is for repository maintainers managing the staging → production workflow.

## Branch Structure

This repository uses a staging environment to test data updates before they go live:
- **`staging` branch** → Deploys to staging environment for testing
- **`main` branch** → Deploys to production (avmap.io)

## Promoting Staging to Production

Once staging data has been verified and looks good:

```bash
# Create a PR from staging → main
gh pr create --base main --head staging --title "Promote staging to production"

# Or via GitHub UI:
# 1. Go to Pull Requests → New PR
# 2. Base: main ← Compare: staging
# 3. Review changes, then merge
# 4. GitHub Action will automatically rebuild production cache
```

## Syncing Production Data to Staging

To refresh staging with the latest production data:

```bash
# Sync database tables
node sync-prod-to-staging.js

# Copy geometry files
node copy-geometries.js

# Rebuild staging cache
STAGING=true node rebuild-cache.js
```

## Data Update Workflow

### 1. Import Events from CSV

After updating `events.csv`, import the changes to the database:

```bash
# Import to staging (ALWAYS START HERE)
cd .dev
STAGING=true node import-csv.js

# Import to production (only after staging verification)
cd .dev
node import-csv.js  # Will prompt for confirmation
```

The production import includes a safety prompt requiring you to type "PRODUCTION" to confirm.

### 2. Rebuild Cache

After importing events, rebuild the cache to generate the frontend data:

```bash
# Rebuild staging cache
cd .dev
STAGING=true node rebuild-cache.js

# Verify the changes in staging environment!
# Check https://staging.avmap.io to confirm everything looks correct

# Rebuild production cache (only after staging verification)
cd .dev
node rebuild-cache.js
```

**Important:** The cache rebuild uses the Node.js script at `.dev/rebuild-cache.js`. The Supabase edge function has been removed to avoid confusion - always use the Node script.

### 3. Automated Rebuilds

GitHub Actions automatically rebuilds the cache when changes are pushed to `staging` or `main` branches, so manual rebuilds are only needed when testing locally.
