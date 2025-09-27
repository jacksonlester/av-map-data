# AV Map Data

Open dataset of autonomous vehicle service areas and operational details that powers [avmap.io](https://avmap.io).

This repository tracks the evolution of autonomous vehicle deployments using event sourcing. All data is sourced from public announcements, news reports, and regulatory filings.

Current scope: United States

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Dataset Overview

Current Coverage (as of September 2025):

- Events spanning 2017-2025
- Active service areas across major US cities
- Companies: Waymo, Tesla, May Mobility, Zoox, and more
- Boundary files showing service evolution over time

## Repository Structure

```
av-map-data/
├── events.csv              # Complete event timeline (14-column structure)
├── geometries/              # Service area boundaries (GeoJSON files)
├── CONTRIBUTING.md          # How to contribute (event sourcing guide)
├── README.md               # This file
└── scripts/validate.py     # Data validation tools
```

## Data Format

The dataset uses event sourcing with two file types:

- `events.csv` - Complete event timeline (14-column structure)
- `geometries/*.geojson` - Service area boundaries

Event sourcing approach:

- Service Creation events contain all service attributes
- Update events contain only the changed attribute
- Complete audit trail of every change with sources

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed data format specifications.

### Using the Data

```bash
# Clone the repository
git clone https://github.com/your-username/av-map-data.git

# View the event timeline
head events.csv

# Load GeoJSON files into your mapping application
ls geometries/*.geojson
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for complete guidelines.

Quick start:

1. Add your event to `events.csv` following the event sourcing model
2. Run `python3 scripts/validate.py` to check your data
3. Submit a pull request

Most needed: New service launches, policy changes, boundary updates, fleet changes

## License

MIT License - See [LICENSE](LICENSE) file

## About avmap.io

[avmap.io](https://avmap.io) is an interactive map showing where autonomous vehicles operate across the United States. This repository contains the authoritative event-sourced dataset that powers the site's visualizations, timeline, and historical analysis features.

---

Questions? Open an [issue](../../issues) or see our [contributing guide](CONTRIBUTING.md) for event sourcing examples.
