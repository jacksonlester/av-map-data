# AV Map Data

Open dataset tracking autonomous vehicle deployments in the United States. Powers [avmap.io](https://avmap.io).

## What's here

**events.csv** - Timeline of AV service changes since 2017 (launches, expansions, shutdowns, policy changes)
**geometries/** - GeoJSON service area boundaries showing how coverage evolved

This uses event sourcing: create events capture full service details, updates only record what changed. Every change has a source.

## Current coverage

- 2017 to current timeline
- Waymo, Tesla, May Mobility, Zoox, and others
- Major US cities with active or historical deployments

## Quick start

```bash
git clone https://github.com/jacksonlester/av-map-data.git
head events.csv
ls geometries/*.geojson
```

Load the GeoJSON files into any mapping tool. Parse the CSV for historical analysis.

## Contributing

We welcome contributions! To submit changes:

1. Fork this repository
2. Create a feature branch from `staging`
3. Make your changes to `events.csv` and/or add geometry files
4. Run validation: `python3 scripts/validate.py`
5. Submit a pull request to the `staging` branch
6. Wait for review - a maintainer will test your changes and merge if approved

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed format specs and examples.

**Helpful contributions:**
- New service launches or expansions
- Service area boundary updates
- Fleet changes, policy updates
- Corrections to existing data

## Review Process

After you submit a pull request:
1. Automated tests will run to validate your data format
2. A maintainer will review and test your changes
3. If approved, your PR will be merged to `staging`
4. Changes will be promoted to production after internal testing

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
