# Service Area Geometries

This directory contains GeoJSON files defining autonomous vehicle service area boundaries.

## File Naming Convention

Geometry files should be named using the pattern:
`{company}-{location}-{YYYY-MM-DD}-boundary.geojson`

Examples:

- `waymo-phoenix-april-25-2017-boundary.geojson`
- `tesla-austin-june-22-2025-boundary.geojson`
- `waymo-san-francisco-december-16-2022-boundary.geojson`

## File Format

All GeoJSON files should be standard FeatureCollections:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      },
      "properties": {}
    }
  ]
}
```

## Important Notes

- **No metadata in properties**: Service metadata (company, dates, etc.) is stored in the events.csv file, not in the GeoJSON properties
- **Simple geometry only**: GeoJSON files contain only the boundary geometry
- **Reference from CSV**: Each geometry file is referenced by name in the `geometry_file` field in events.csv
- **Real data from avmap.io**: This repository will contain the actual service area boundaries that power avmap.io

## Service Area Files

This directory contains GeoJSON boundary files for autonomous vehicle services. To see current files:

```bash
ls *.geojson
```

**File organization by company:**

- **Waymo**: Phoenix, San Francisco, Los Angeles, Austin, Silicon Valley, Atlanta
- **Tesla**: Austin, Bay Area
- **May Mobility**: Atlanta
- **Zoox**: Las Vegas

Files follow the naming pattern: `{company}-{city}-{date}-boundary.geojson` and represent actual service area boundaries from avmap.io.
