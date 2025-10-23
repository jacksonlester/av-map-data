# Contributing to AV Map Data

This dataset tracks autonomous vehicle deployments and powers [avmap.io](https://avmap.io). While currently focused on US services, we accept data from anywhere.

## ⚠️ Important: Submit PRs to `staging` branch

**All pull requests should target the `staging` branch, not `main`.** This allows us to test your changes on the staging site before promoting to production.

1. Fork this repository
2. Create a feature branch from `main` (the stable production branch)
3. Make your changes
4. Submit a PR to the `staging` branch
5. Your changes will be tested on the staging environment
6. Once verified, they'll be promoted to production

## Event sourcing basics

Each row in `events.csv` represents one change to a service. Service creation events include all attributes. **Update events must include the complete new state for the field being updated** (not deltas) and always include the `company` field to identify which service is being updated.

## CSV structure

**The CSV has 18 columns plus a trailing comma on each row.**

| # | Column                   | Description                | Example                                      | Required?     |
|---|--------------------------|----------------------------|----------------------------------------------|---------------|
| 1 | `date`                   | Event date (YYYY-MM-DD)    | `2025-06-22`                                 | Always        |
| 2 | `event_type`             | Type of change             | `service_created`                            | Always        |
| 3 | `company`                | Company name               | `Tesla`                                      | Always        |
| 4 | `city`                   | City or region             | `Austin`                                     | Always        |
| 5 | `geometry_file`          | Boundary file if available | `tesla-austin-june-22-2025-boundary.geojson` | If applicable |
| 6 | `vehicles`               | Vehicle types              | `Tesla Model Y`                              | If applicable |
| 7 | `platform`               | Booking app                | `Robotaxi`                                   | If applicable |
| 8 | `fares`                  | Charges fares?             | `Yes` / `No`                                 | If applicable |
| 9 | `direct_booking`         | Can book AV directly?      | `Yes` / `No`                                 | If applicable |
| 10| `service_model`          | Service model              | `Flexible` / `Fixed Route`                   | If applicable |
| 11| `supervision`            | Supervision level          | `Autonomous` / `Safety Driver`               | If applicable |
| 12| `access`                 | Access policy              | `Public` / `Waitlist`                        | If applicable |
| 13| `fleet_partner`          | Fleet partnerships         | `Moove`                                      | If applicable |
| 14| `expected_launch`        | Expected launch timeframe  | `2026`, `Q2 2026`, `Late 2025`               | If applicable |
| 15| `company_link`           | Company website/page       | `https://waymo.com/`                         | Preferred     |
| 16| `booking_platform_link`  | Booking platform link      | `https://www.uber.com/...`                   | Preferred     |
| 17| `source_url`             | Source article/announcement| `https://techcrunch.com/...`                 | Preferred     |
| 18| `notes`                  | Additional context (text)  | `Initial service launch`                     | Preferred     |

## CSV formatting rules

### Field count
- Every row must have exactly 18 fields
- Every row must end with a trailing comma
- Missing fields will cause column misalignment

### Quoting rules
These 7 fields should be quoted to allow commas within the content:
- `city` (4), `geometry_file` (5), `vehicles` (6), `platform` (7), `fleet_partner` (13), `expected_launch` (14), `notes` (18)

Example with quotes:
```csv
2025-09-10,service_created,Zoox,"Las Vegas","zoox-las-vegas-boundary.geojson","Zoox Robotaxi","Zoox",No,Yes,Stop-to-Stop,Autonomous,Public,"","",https://zoox.com/,https://zoox.com/ride,https://techcrunch.com/2025/09/10/zoox-las-vegas-launch,"Zoox Las Vegas service",
```

### Column alignment
- Columns 15-17 (`company_link`, `booking_platform_link`, `source_url`) should contain URLs or be empty
- Column 18 (`notes`) should contain descriptive text, never URLs
- Column 14 (`expected_launch`) should only be filled for `service_announced` or `service_testing` events

### Validation
Run the validation script before committing:
```bash
node validate-csv.js
```

## Adding a new service

### Announced or testing service

For `service_testing` or `service_announced` events, only basic info required:

```csv
2025-09-17,service_announced,Waymo,"Nashville","-86.7816,36.1627","","Lyft",,,,,,,,"2026",https://waymo.com/,https://waymo.com/waymo-one/,https://waymo.com/blog/nashville,"Partnership with Lyft announced",
```

Required fields (with column numbers):
- `date` (1), `event_type` (2), `company` (3), `city` (4), `source_url` (17)

All other fields can be empty but must still be present (18 total fields). Add details as they become available using update events.

### Active service launch

For `service_created` events, fill in all service attributes:

```csv
2025-09-10,service_created,Zoox,"Las Vegas","zoox-las-vegas-september-10-2025-boundary.geojson","Zoox Robotaxi","Zoox",No,Yes,Stop-to-Stop,Autonomous,Public,"","",https://zoox.com/,https://zoox.com/ride,https://techcrunch.com/2025/09/10/zoox-opens-its-las-vegas-robotaxi-service-to-the-public/,"Zoox Las Vegas service",
```

Required fields (with column numbers):
- `date` (1), `event_type` (2), `company` (3), `city` (4)
- `vehicles` (6), `platform` (7), `fares` (8), `direct_booking` (9)
- `service_model` (10), `supervision` (11), `access` (12), `source_url` (17)

Optional but recommended:
- `geometry_file` (5), `fleet_partner` (13), `company_link` (15), `booking_platform_link` (16), `notes` (18)

Note: `expected_launch` (14) should be empty for `service_created` events.

## Updating a service

For updates, **always include** `company` and `city` to identify the service. Fill the changed field with the **complete new state** (not just what was added/removed).

### Service area expansion

```csv
2025-07-14,geometry_updated,Tesla,"Austin","tesla-austin-july-14-2025-boundary.geojson","","",,,,,,,"",,,,https://www.businessinsider.com/tesla-new-robotaxi-geofence-austin-shape-elon-musk-bigger-waymo-2025-7,"Service area boundary update",
```

### Fleet update (complete new state)

```csv
2020-10-08,vehicle_types_updated,Waymo,"Phoenix","","Jaguar I-Pace;Chrysler Pacifica Hybrid","",,,,,,,"",,,,https://techcrunch.com/2019/06/17/waymos-self-driving-jaguar-i-pace-vehicles-are-now-testing-on-public-roads/,"Vehicle fleet expansion",
```

Note: Multiple vehicles separated by `;` (semicolon). Shows complete current fleet, not just what changed.

### Platform update (complete new state)

```csv
2023-10-26,platform_updated,Waymo,"Phoenix","","","Waymo;Uber",,,,,,,"",,,,https://waymo.com/blog/2023/10/the-waymo-driver-now-available-on-uber-in-phoenix,"Added Uber platform",
```

Note: Multiple platforms separated by `;` (semicolon). This allows filtering by either platform in the app.

### Policy change

```csv
2024-11-12,access_policy_changed,Waymo,"Los Angeles","","","",,,,,Public,,"",,,,https://waymo.com/blog/2024/11/waymo-one-open-to-all-in-los-angeles,"Access policy update",
```

### Service model change

```csv
2026-03-15,service_model_updated,Zoox,"Las Vegas","","","",,,,,Flexible,,"",,,,https://example.com,"Service now allows flexible travel",
```

## Event types

**Service lifecycle:**

- `service_testing` - Testing spotted (may be unconfirmed)
- `service_announced` - Official public announcement
- `service_created` - Service launches to public/waitlist
- `service_ended` - Service discontinued

Services progress: testing → announced → active (both testing and announcement optional)

**Required fields:**
- `service_testing` / `service_announced`: Only date, company, city, source_url
- `service_created`: All service attributes (vehicles, platform, fares, etc.)

**Service changes (must include company + changed field with complete new state):**

- `geometry_updated` - Service area changes
- `vehicle_types_updated` - Fleet changes (show complete current fleet)
- `platform_updated` - Booking platform changes (show all platforms)
- `fares_policy_changed` - Fare policy changes
- `access_policy_changed` - Access changes
- `supervision_updated` - Supervision level changes
- `flexibility_updated` - Travel flexibility changes
- `fleet_partner_changed` - Fleet partnership changes

## Lifecycle examples

**With announcement:**
```csv
2025-09-17,service_announced,Waymo,"Nashville","-86.7816,36.1627","","Lyft",,,,,,,,"2026",https://waymo.com/,https://waymo.com/waymo-one/,https://waymo.com/blog/nashville,"Partnership with Lyft announced",
2026-03-20,service_created,Waymo,"Nashville","waymo-nashville-march-2026.geojson","Jaguar I-Pace","Waymo;Lyft",Yes,No,Flexible,Autonomous,Waitlist,"","",https://waymo.com/,https://waymo.com/waymo-one/,https://waymo.com/blog/nashville-launch,"Service launch in Nashville",
```

**Direct launch (no announcement):**
```csv
2025-11-10,service_created,Zoox,"Austin","zoox-austin-november-2025.geojson","Zoox Robotaxi","Zoox",No,Yes,Stop-to-Stop,Autonomous,Public,"","",https://zoox.com/,https://zoox.com/ride,https://techcrunch.com/2025/11/10/zoox-austin-launch,"Zoox launches in Austin",
```

Note: `service_testing` can precede announcement if testing is spotted first. All examples show complete 18-field format with trailing comma.

## Field values

Add new values when documenting companies, vehicles, platforms, or policies not listed here.

**Multi-value fields:** For `vehicles` and `platform` fields, separate multiple values with `;` (semicolon). Examples: `Waymo;Uber` or `Jaguar I-Pace;Chrysler Pacifica Hybrid`. Semicolons preserve CSV compatibility while allowing the app to filter by individual values.

**Companies:** Waymo, Tesla, Zoox, May Mobility, Cruise

**Vehicles:** Tesla Model Y, Jaguar I-Pace, Chrysler Pacifica Hybrid, Toyota Sienna, Zoox Robotaxi

**Platform:** Waymo, Uber, Lyft, Robotaxi, Cruise, Zoox

**Fares:** `Yes` (charges fares), `No` (free)

**Direct Booking:** `Yes` (book AV directly), `No` (may or may not get AV, like Waymo on UberX)

**Flexibility:** `Point-to-Point` (riders can travel freely between any points in the service area), `Stop-to-Stop` (riders can only travel to/from predetermined stops)

**Supervision:** `Autonomous`, `Safety Driver`, `Safety Attendant`

**Access:** `Public`, `Waitlist`

## Geometry files

You have two options for specifying service locations:

### Option 1: Inline coordinates (for single-point locations)

For services without defined boundaries, use inline coordinates in the `geometry_file` column (column 5).

Format: `"longitude,latitude"` (e.g., `"-97.7431,30.2672"`)

Example (with all 18 fields):
```csv
2025-09-16,service_created,Example Co,"Austin","-97.7431,30.2672","Example Vehicle","Example Platform",Yes,Yes,Flexible,Autonomous,Public,"","",https://example.com/,https://example.com/book,https://source.com/article,"Service launch at specific location",
```

### Option 2: GeoJSON boundary files (for service areas)

If adding service area boundaries:

1. Create GeoJSON in `geometries/` folder
2. Name it: `{company}-{city}-{month}-{day}-{year}-boundary.geojson`
3. Use standard GeoJSON format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng, lat], [lng, lat], ...]]
      },
      "properties": {}
    }
  ]
}
```

## Validation

Run tests before submitting:

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
```

Or use the wrapper script:

```bash
python3 scripts/validate.py
```

Pull requests run tests automatically via GitHub Actions.

## Schema changes

Schema is defined in `.dev/schema.json`. To add columns/event types:
1. Edit `.dev/schema.json` (add definitions), bump version
2. Run `python3 scripts/check_schema_version.py`
3. Tests auto-update from schema - no manual test changes needed

## Submission

1. Fork this repository and create a feature branch from `main`
2. Make your changes
3. Run tests (`python3 scripts/check_schema_version.py && pytest tests/ -v`)
4. Push your branch and create a pull request to the `staging` branch

## Questions?

Check existing [issues](../../issues) or open a new one.
