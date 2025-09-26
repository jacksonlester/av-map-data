# AV Map Data

**Open dataset of autonomous vehicle service areas and operational details that powers [avmap.io](https://avmap.io)**

This repository contains comprehensive data tracking the evolution of autonomous vehicle deployments using an **event sourcing** approach. All data is sourced from public announcements, news reports, and regulatory filings.

**Current scope:** United States
**Future scope:** Global autonomous vehicle services

**Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed implementation guidelines.

## 📊 Dataset Overview

**Current Coverage (as of September 2025):**

- **Multiple events** spanning 2017-2025
- **Active service areas** across major US cities
- **Major companies**: Waymo, Tesla, May Mobility, Zoox, and more
- **Boundary files** showing service evolution over time

## 🎯 Event Sourcing Approach

This dataset uses **event sourcing** to track every change to autonomous vehicle services:

- **Service Creation Events**: Complete initial service setup with all attributes
- **Service Update Events**: Single attribute changes (vehicles, fares, boundaries, etc.)

This approach allows you to:

- ✅ **Replay history** - Reconstruct service state at any point in time
- ✅ **Track changes** - See exactly what changed and when
- ✅ **Maintain accuracy** - Complete audit trail of all modifications

## 🗂️ Repository Structure

```
av-map-data/
├── events.csv              # Complete event timeline (14-column structure)
├── geometries/              # Service area boundaries (GeoJSON files)
├── CONTRIBUTING.md          # How to contribute (event sourcing guide)
├── README.md               # This file
└── scripts/validate.py     # Data validation tools
```

## 📋 Data Format

The dataset uses **event sourcing** with two file types:

- **`events.csv`** - Complete event timeline (14-column structure)
- **`geometries/*.geojson`** - Service area boundaries

**Event sourcing approach:**

- **Service Creation** events contain all service attributes
- **Update events** contain only the changed attribute
- Complete audit trail of every change with sources

👉 **See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed data format specifications**

## 📈 Key Insights

**Service Evolution Timeline:**

- **2017**: Waymo Phoenix launches (first autonomous rideshare service)
- **2022**: Waymo expands to San Francisco
- **2024**: Waymo launches in Los Angeles
- **2025**: Tesla enters with Austin service, rapid expansion across multiple companies

**Active Services Include:**

- **Waymo**: Multiple cities including Phoenix, San Francisco, Los Angeles
- **Tesla**: Austin, Bay Area
- **Other operators**: May Mobility, Zoox, and expanding coverage

**Service Attributes Tracked:**

- **Vehicles**: Tesla Model Y, Jaguar I-Pace, Chrysler Pacifica Hybrid, etc.
- **Platforms**: Waymo, Uber, Lyft, Robotaxi, etc.
- **Supervision**: Autonomous, Safety Driver, Safety Attendant
- **Access**: Public, Waitlist, Employees Only
- **Fares**: Yes/No fare policies

## 🚀 Getting Started

### Using the Data

```bash
# Clone the repository
git clone https://github.com/your-username/av-map-data.git

# View the event timeline
head events.csv

# Load GeoJSON files into your mapping application
ls geometries/*.geojson
```

### Intended Use Cases

- **Research**: Analyze AV deployment patterns and policy evolution
- **Mapping**: Visualize current and historical service areas, seeing the cool Petri dish visual of the expansion or autonomous vehicle services
- **Analysis**: Track technology changes, business model evolution
- **Integration**: Power websites and applications (like avmap.io)
- **Event Replay**: Reconstruct service state at any historical date

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for complete guidelines.

**Quick start:**

1. Add your event to `events.csv` following the event sourcing model
2. Run `python3 scripts/validate.py` to check your data
3. Submit a pull request

**Most needed:** New service launches, policy changes, boundary updates, fleet changes

## 🔗 Integration with avmap.io

This dataset powers [avmap.io](https://avmap.io) through event sourcing:

1. **Historical Reconstruction**: Events are replayed chronologically to build current service state
2. **Timeline Features**: Complete event history enables timeline visualization
3. **Change Tracking**: Exact change detection for notifications and updates
4. **Data Integrity**: Event sourcing ensures no data is ever lost

## 🛠️ Technical Implementation

**Event Sourcing Benefits:**

- **Immutable History**: Events are never modified, only added
- **Complete Audit Trail**: Every change is recorded with source
- **Point-in-Time Queries**: Reconstruct state at any historical date
- **Change Detection**: Easily identify what changed between time periods

**CSV Format Choice:**

- Easy to view/edit in spreadsheet applications
- Simple to import into analysis tools (Python pandas, R)
- Version control friendly (clear diffs)
- No database dependency for contributors

## 📅 Data Freshness

- **Update frequency**: Community-driven (pull requests)
- **Data validation**: Automated checks on all submissions
- **Event sourcing**: Immutable event log with complete history

## 📜 License

MIT License - See [LICENSE](LICENSE) file

## 🏢 About avmap.io

[avmap.io](https://avmap.io) is an interactive map showing where autonomous vehicles operate across the United States, and eventually world. This repository contains the authoritative event-sourced dataset that powers the site's visualizations, timeline, and historical analysis features.

---

**Questions?** Open an [issue](../../issues) or see our [contributing guide](CONTRIBUTING.md) for event sourcing examples.
