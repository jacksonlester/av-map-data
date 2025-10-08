# AV Map Data

Open dataset tracking autonomous vehicle deployments in the United States. Powers [avmap.io](https://avmap.io).

## What's here

**events.csv** - Timeline of AV service changes since 2017 (launches, expansions, shutdowns, policy changes)
**geometries/** - GeoJSON service area boundaries showing how coverage evolved

This uses event sourcing: create events capture full service details, updates only record what changed. Every change has a source.

## Current coverage

- 2017-2025 timeline
- Waymo, Tesla, May Mobility, Zoox, Cruise, and others
- Major US cities with active or historical deployments

## Quick start

```bash
git clone https://github.com/jacksonlester/av-map-data.git
head events.csv
ls geometries/*.geojson
```

Load the GeoJSON files into any mapping tool. Parse the CSV for historical analysis.

## Contributing

**Important: Submit all PRs to the `staging` branch, not `main`.**

1. Fork this repository
2. Create a feature branch from `staging`
3. Add events to `events.csv` or update geometries
4. Run `python3 scripts/validate.py` to verify your changes
5. Submit a PR to the `staging` branch
6. Your changes will be tested on the staging site before being promoted to production

See [CONTRIBUTING.md](CONTRIBUTING.md) for the data format spec and examples.

Most useful contributions: new service launches, boundary updates, fleet size changes, policy announcements.

## Staging & Production Workflow

This repository uses a staging environment to test data updates before they go live:

- **`staging` branch** → Deploys to staging environment (test your changes here)
- **`main` branch** → Deploys to production (avmap.io)

### Testing Your Changes

After submitting a PR to `staging`:
1. Wait for the GitHub Action to rebuild the staging cache
2. Check the staging site to verify your data looks correct
3. Once approved, your PR will be merged to `staging`
4. Later, staging will be promoted to `main` (production)

## For Maintainers

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

### Manual Cache Rebuilds

```bash
# Rebuild staging cache
STAGING=true node rebuild-cache.js

# Rebuild production cache
node rebuild-cache.js
```

## License

MIT - use it however you want.

---

Built and maintained for [avmap.io](https://avmap.io). Issues and questions welcome.
