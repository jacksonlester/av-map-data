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

Add events to `events.csv`, run `python3 scripts/validate.py`, submit a PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the data format spec and examples.

Most useful contributions: new service launches, boundary updates, fleet size changes, policy announcements.

## License

MIT - use it however you want.

---

Built and maintained for [avmap.io](https://avmap.io). Issues and questions welcome.
