# AV Map Data

Open dataset tracking autonomous vehicle deployments around the world. Powers [avmap.io](https://avmap.io).

## What's here

**events.csv** - Timeline of AV service changes since 2017 (testing, announcements, launches, expansions, shutdowns, policy changes)
**geometries/** - GeoJSON service area boundaries showing how coverage evolved

This uses event sourcing: create events capture full service details, updates only record what changed. Every change has a source.

## Current coverage

- 2017 to current timeline
- Waymo, Tesla, May Mobility, Zoox, Apollo Go, Cruise, Nuro, Oxa, Wayve, WeRide, and others
- Global cities with active or historical AV deployments

## Quick start

```bash
git clone https://github.com/jacksonlester/av-map-data.git
head events.csv
ls geometries/*.geojson
```

Load the GeoJSON files into any mapping tool. Parse the CSV for historical analysis.

## Contributing

We welcome contributions! Two easy ways to help:

**Email updates:** Send CSV changes or info to [jackson@avmap.io](mailto:jackson@avmap.io)

**GitHub PR:**
1. Fork this repository
2. Edit `events.csv` (Excel or text editor work fine)
3. Submit a pull request to the `staging` branch
4. We'll review and merge

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed format specs and examples.

**Helpful contributions:**
- New service launches or expansions
- Service area boundary updates
- Fleet changes, policy updates
- Corrections to existing data

## Review Process

After you submit:
1. We'll check the data format (automated tests help catch issues)
2. Review and test your changes
3. Merge to `staging` for testing
4. Promote to production once verified

## For Maintainers Only

The following commands are for repository maintainers managing the staging → production workflow.

This repository uses a staging environment to test data updates before they go live:
- **`staging` branch** → Deploys to staging environment for testing
- **`main` branch** → Deploys to production (avmap.io)

### Promoting Staging to Production

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

### Syncing Production Data to Staging

To refresh staging with the latest production data:

```bash
# Sync database tables
node sync-prod-to-staging.js

# Copy geometry files
node copy-geometries.js

# Rebuild staging cache
STAGING=true node rebuild-cache.js
```

### Data Update Workflow

#### 1. Import Events from CSV

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

#### 2. Rebuild Cache

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

#### 3. Automated Rebuilds

GitHub Actions automatically rebuilds the cache when changes are pushed to `staging` or `main` branches, so manual rebuilds are only needed when testing locally.

## License

MIT - use it however you want.

---

Built and maintained for [avmap.io](https://avmap.io). Issues and questions welcome.
