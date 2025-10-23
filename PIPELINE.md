# Pipeline Documentation

## Automatic Triggers

### When you push events.csv or geometries to STAGING:
**Workflow:** update-cache.yml
- Imports CSV to staging Supabase database
- Uploads geometries to staging storage
- Syncs geometries table in staging
- Rebuilds staging cache (all-data.json)

### When you merge to MAIN (with events.csv or geometries changes):
**Workflow 1:** update-cache.yml
- Imports CSV to production Supabase database
- Uploads geometries to production storage
- Syncs geometries table in production
- Rebuilds production cache (all-data.json)

**Workflow 2:** update-avmap.yml
- Sends API call to trigger avmap.io repository rebuild
- This updates the live website

**Workflow 3:** validate.yml
- Runs pytest integration tests
- Validates data against schema

## Manual Triggers

### From GitHub Actions UI:

**update-cache.yml**
- Go to Actions tab > "Update Data Cache" > Run workflow
- Choose environment: staging or production
- Manually rebuild cache without pushing code

## Required Files in .dev/

Scripts:
- import-csv.js (imports events.csv to Supabase)
- upload-geometries.js (uploads geometry files to storage)
- sync-geometries-table.js (syncs metadata table)
- rebuild-cache.js (generates all-data.json cache)
- validate-csv.js (validation script)

Config:
- package.json, package-lock.json (Node dependencies)
- requirements-dev.txt (Python test dependencies)
- schema.json (Data schema definition)

## Testing Locally

Before pushing:
```bash
# Validate data
node .dev/validate-csv.js

# Run tests
pytest tests/ -v

# Check schema consistency
python3 scripts/check_schema_version.py
```

## Workflow Files

- .github/workflows/update-cache.yml (handles staging + production cache)
- .github/workflows/update-avmap.yml (triggers avmap.io rebuild on main)
- .github/workflows/validate.yml (runs tests on main)
