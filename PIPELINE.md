# Pipeline Documentation

## Automatic Triggers

### Single workflow: `deploy-data.yml`

Runs on push to `main` or `staging` when `events.csv` or `geometries/**` change. Also runs validation on pull requests targeting either branch.

**Job 1: validate** (runs on all triggers including PRs)
- Runs `pytest tests/ -v`
- If this fails, the pipeline stops. Nothing is deployed.

**Job 2: update-cache** (runs only after validation passes, skipped on PRs)
- Imports CSV to Supabase database (staging or production)
- Uploads geometries to storage bucket
- Syncs geometries metadata table
- Rebuilds `all-data.json` cache and uploads to storage bucket

## Manual Triggers

### From GitHub Actions UI:
- Go to Actions tab > "Validate & Update Cache" > Run workflow
- Choose environment: staging or production
- Manually rebuild cache without pushing code

## Required Files in .dev/

Scripts:
- import-csv.py (imports events.csv to Supabase)
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

- .github/workflows/deploy-data.yml (validates, then updates cache for staging or production)
