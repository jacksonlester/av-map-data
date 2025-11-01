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

---

**Maintainers:** See [MAINTAINERS.md](MAINTAINERS.md) for staging/production workflow.

## License

MIT - use it however you want.

---

Built and maintained for [avmap.io](https://avmap.io). Issues and questions welcome.
