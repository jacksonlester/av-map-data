# Contributing to AV Map Data

This dataset tracks autonomous vehicle deployments and powers [avmap.io](https://avmap.io). We accept data from anywhere in the world.

## Quick Start

**Most common contribution:** Adding a new service announcement or launch

1. Add one row to `events.csv` with all non-empty fields quoted
2. Submit PR to `staging` branch (not `main`)
3. Automated tests will check your formatting

See [Adding a new service](#adding-a-new-service) for examples.

### Editing the CSV

You can edit `events.csv` with:
- **Excel/Google Sheets:** Open the file, add your row, save as CSV (make sure to choose "CSV UTF-8" format)
- **Text editor:** Any text editor works - just make sure to quote fields with content and separate with commas

**Excel tip:** When saving, Excel will quote fields automatically if they contain commas. Just make sure all your text fields have content or are truly empty.

## ⚠️ Important: Submit PRs to `staging` branch

**All pull requests should target the `staging` branch, not `main`.** This allows us to test your changes on the staging site before promoting to production.

1. Fork this repository
2. Create a feature branch from `main` (the stable production branch)
3. Make your changes
4. Submit a PR to the `staging` branch
5. Your changes will be tested on the staging environment
6. Once verified, they'll be promoted to production

## How it works

Each row in `events.csv` represents **one change** to a service:

- **Service lifecycle events** (`service_testing`, `service_announced`, `service_created`) include all known attributes
- **Update events** (`geometry_updated`, `fares_policy_changed`, etc.) change only one field at a time
- All updates show the **complete new state**, not just what changed (e.g., full vehicle list, not just vehicles added)

## CSV structure

**The CSV has a header row and 18 columns of data.**

| # | Column                   | Description                | Example                                      | Required?     |
|---|--------------------------|----------------------------|----------------------------------------------|---------------|
| 1 | `date`                   | Event date (YYYY-MM-DD)    | `2025-06-22`                                 | Always        |
| 2 | `event_type`             | Type of change             | `service_created`                            | Always        |
| 3 | `company`                | Company name               | `Tesla`                                      | Always        |
| 4 | `city`                   | City or region             | `Austin`                                     | Always        |
| 5 | `geometry_file`          | Boundary file OR coordinates (lng,lat) | `tesla-austin-june-22-2025-boundary.geojson` OR `"-97.7431,30.2672"` | If applicable |
| 6 | `vehicles`               | Vehicle types              | `Tesla Model Y`                              | If applicable |
| 7 | `platform`               | Booking app                | `Robotaxi`                                   | If applicable |
| 8 | `fares`                  | Charges fares?             | `Yes` / `No`                                 | If applicable |
| 9 | `direct_booking`         | Can book AV directly?      | `Yes` / `No`                                 | If applicable |
| 10| `service_model`          | Service model              | `Flexible` / `Fixed Route`                   | If applicable |
| 11| `supervision`            | Supervision level          | `Autonomous` / `Safety Driver`               | If applicable |
| 12| `access`                 | Access policy              | `Public` / `Waitlist`                        | If applicable |
| 13| `fleet_partner`          | Fleet partnerships         | `Moove`                                      | If applicable |
| 14| `expected_launch`        | Expected launch timeframe  | `2026`, `Q2 2026`, `Late 2025`               | If applicable |
| 15| `company_link`           | Company website/page       | `https://waymo.com/`                         | If applicable |
| 16| `booking_platform_link`  | Booking platform link      | `https://www.uber.com/...`                   | If applicable |
| 17| `source_url`             | Source article/announcement| `https://techcrunch.com/...`                 | Preferred     |
| 18| `notes`                  | Additional context (text)  | `Initial service launch`                     | Preferred     |

## CSV formatting rules

### Three critical rules:
1. **All non-empty fields must be quoted** (including the header row)
2. **Every row must have exactly 18 fields** (empty fields are just commas with nothing between)
3. **Quote everything that has content** - text, URLs, and numbers like "Yes" and "No"

**Example row:**
```csv
"2025-09-10","service_created","Zoox","Las Vegas","zoox-las-vegas-boundary.geojson","Zoox Robotaxi","Zoox","No","Yes","Hub-to-Hub","Autonomous","Public",,,"https://zoox.com/","https://zoox.com/ride","https://techcrunch.com/2025/09/10/zoox-las-vegas-launch","Zoox Las Vegas service"
```

### Important details:
- Empty fields: Just use commas with nothing between (e.g., `,,`)
- URLs: Go in columns 15-17 (`company_link`, `booking_platform_link`, `source_url`)
- Notes: Text only in column 18, never URLs
- Expected launch: Only fill column 14 for `service_announced` or `service_testing` events
- Company/booking links: Always include `company_link` (column 15) for `service_testing`, `service_announced`, and `service_created` events. Only include `booking_platform_link` (column 16) if there's a separate booking platform (different from the company) or a fleet partner with their own booking page. For `platform_updated`, include `booking_platform_link`. Other update events should leave both empty

### Validation (optional):

If you have Node.js installed, you can test your changes locally:
```bash
node validate-csv.js
```

Don't worry if you can't run this - GitHub Actions will automatically validate your PR.

## Adding a new service

### Announced or testing service

For `service_testing` or `service_announced` events, only basic info required:

```csv
"2025-09-17","service_announced","Waymo","Nashville","-86.7816,36.1627",,"Lyft",,,,,,,"2026","https://waymo.com/","https://waymo.com/waymo-one/","https://waymo.com/blog/nashville","Partnership with Lyft announced"
```

Required fields (with column numbers):
- `date` (1), `event_type` (2), `company` (3), `city` (4), `source_url` (17)

All other fields can be empty (just commas) but must still be present (18 total fields). Add details as they become available using update events.

### Active service launch

For `service_created` events, fill in all service attributes:

```csv
"2025-09-10","service_created","Zoox","Las Vegas","zoox-las-vegas-september-10-2025-boundary.geojson","Zoox Robotaxi","Zoox","No","Yes","Hub-to-Hub","Autonomous","Public",,,"https://zoox.com/","https://zoox.com/ride","https://techcrunch.com/2025/09/10/zoox-opens-its-las-vegas-robotaxi-service-to-the-public","Zoox Las Vegas service"
```

Required fields (with column numbers):
- `date` (1), `event_type` (2), `company` (3), `city` (4)
- `vehicles` (6), `platform` (7), `fares` (8), `direct_booking` (9)
- `service_model` (10), `supervision` (11), `access` (12), `source_url` (17)

Optional but recommended:
- `geometry_file` (5), `fleet_partner` (13), `company_link` (15), `booking_platform_link` (16), `notes` (18)

Note: `expected_launch` (14) should be empty for `service_created` events.

## Updating a service

**Key rules for updates:**
- Always include `company` and `city` to identify the service
- **One event per field change** - if 3 things change on the same day, create 3 separate rows
- Show the **complete new state** of the field (e.g., all vehicles, not just new ones)

### Service area expansion

```csv
"2025-07-14","geometry_updated","Tesla","Austin","tesla-austin-july-14-2025-boundary.geojson",,,,,,,,,,,,"https://www.businessinsider.com/tesla-new-robotaxi-geofence-austin-shape-elon-musk-bigger-waymo-2025-7","Service area boundary update"
```

### Fleet update (complete new state)

```csv
"2020-10-08","vehicle_types_updated","Waymo","Phoenix",,"Jaguar I-Pace;Chrysler Pacifica Hybrid",,,,,,,,,,,,"https://techcrunch.com/2019/06/17/waymos-self-driving-jaguar-i-pace-vehicles-are-now-testing-on-public-roads","Vehicle fleet expansion - adding Jaguar I-Pace"
```

Note: Multiple vehicles separated by `;` (semicolon). Shows complete current fleet, not just what changed.

### Platform update (complete new state)

```csv
"2023-10-26","platform_updated","Waymo","Phoenix",,,"Waymo;Uber",,,,,,,,,,"https://waymo.com/blog/2023/10/the-waymo-driver-now-available-on-uber-in-phoenix","Booking platform update"
```

Note: Multiple platforms separated by `;` (semicolon). This allows filtering by either platform in the app.

### Policy change

```csv
"2024-11-12","access_policy_changed","Waymo","Los Angeles",,,,,,,"Public",,,,,,"https://waymo.com/blog/2024/11/waymo-one-open-to-all-in-los-angeles","Access policy update"
```

### Service model change

```csv
"2026-03-15","service_model_updated","Zoox","Las Vegas",,,,,,,"Flexible",,,,,,,"https://example.com","Service now allows flexible travel"
```

### Multiple updates on the same day

If multiple fields change on the same day, create separate events:

```csv
"2020-10-08","access_policy_changed","Waymo","Phoenix",,,,,,,"Public",,,,,,"https://waymo.com/blog/2020/10/waymo-is-opening-its-fully-driverless-service-in-phoenix","Access policy update"
"2020-10-08","fares_policy_changed","Waymo","Phoenix",,,"Yes",,,,,,,,,,,"https://waymo.com/blog/2020/10/waymo-is-opening-its-fully-driverless-service-in-phoenix","Fares policy update"
"2020-10-08","geometry_updated","Waymo","Phoenix","waymo-phoenix-october-8-2020-boundary.geojson",,,,,,,,,,,,"https://waymo.com/blog/2020/10/waymo-is-opening-its-fully-driverless-service-in-phoenix","Service area boundary update"
```

Note: Each event represents one field change, even though all three changes happened on the same day and were announced together.

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
"2025-09-17","service_announced","Waymo","Nashville","-86.7816,36.1627",,"Waymo;Lyft",,,,,"Announced","Flexdrive","2026","https://waymo.com/blog/2025/09/waymo-is-coming-to-nashville-in-partnership-with-lyft","https://investor.lyft.com/news-and-events/news/news-details/2025/Lyft-and-Waymo-Launch-Partnership-to-Expand-Autonomous-Mobility-to-Nashville/default.aspx","https://waymo.com/blog/2025/09/waymo-is-coming-to-nashville-in-partnership-with-lyft","Lyft partnership; Waymo app first then Lyft integration; Flexdrive fleet management; autonomous ops in coming months then public riders next year"
"2026-03-20","service_created","Waymo","Nashville","waymo-nashville-march-2026.geojson","Jaguar I-Pace","Waymo;Lyft","Yes","No","Flexible","Autonomous","Waitlist",,,"https://waymo.com/","https://waymo.com/waymo-one/","https://waymo.com/blog/nashville-launch","Service launch in Nashville"
```

**Direct launch (no announcement):**
```csv
"2025-11-10","service_created","Zoox","Austin","zoox-austin-november-2025.geojson","Zoox Robotaxi","Zoox","No","Yes","Hub-to-Hub","Autonomous","Public",,,"https://zoox.com/","https://zoox.com/ride","https://techcrunch.com/2025/11/10/zoox-austin-launch","Zoox launches in Austin"
```

**Full lifecycle (testing → announcement → launch → updates):**
```csv
"2024-10-01","service_testing","Wayve","San Francisco Bay Area","-122.4416,37.7717","Ford Mustang Mach-E","Uber",,,"Flexible","Safety Driver","Testing",,,"https://wayve.ai/press/us-expansion/",,"https://wayve.ai/press/us-expansion/","ADAS testing and data collection - 20 vehicles"
"2025-06-10","service_announced","Wayve","London","-0.1203,51.5415","Jaguar I-PACE","Uber",,,"Flexible","Safety Driver","Announced",,"Spring 2026","https://wayve.ai/press/wayve-uber-l4-autonomy-trials/",,"https://londonist.com/london/transport/uber-self-driving-taxis-london-2026","Partnership with Uber announced for L4 autonomy trials"
"2026-04-15","service_created","Wayve","London","wayve-london-april-2026.geojson","Jaguar I-PACE","Uber","No","No","Flexible","Safety Driver","Waitlist",,,"https://wayve.ai/","https://www.uber.com","https://wayve.ai/press/london-launch","Service launches to waitlist users in London"
"2026-06-20","geometry_updated","Wayve","London","wayve-london-june-2026.geojson",,,,,,,,,,,,"https://wayve.ai/blog/london-expansion","Service area expanded to cover more of Central London"
"2026-08-10","fares_policy_changed","Wayve","London",,,"Yes",,,,,,,,,,,"https://wayve.ai/blog/fares-introduction","Started charging fares after initial free period"
"2026-09-01","access_policy_changed","Wayve","London",,,,,,,"Public",,,,,,"https://wayve.ai/blog/public-launch","Opened to all users, removed waitlist"
```

Note: `service_testing` can precede announcement if testing is spotted first. All examples show complete 18-field format with all fields quoted.

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

Two options for specifying service locations:

### Option 1: Coordinates (for announcements or point locations)

Use inline coordinates in the `geometry_file` column (column 5).

- Format: `"longitude,latitude"` (e.g., `"-97.7431,30.2672"`)
- ⚠️ **lng,lat order** (NOT lat,lng) - longitude first!

Example (with all 18 fields):
```csv
"2025-09-16","service_created","Example Co","Austin","-97.7431,30.2672","Example Vehicle","Example Platform","Yes","Yes","Flexible","Autonomous","Public",,,"https://example.com/","https://example.com/book","https://source.com/article","Service launch at specific location"
```

### Option 2: GeoJSON boundary files (for service areas)

If adding service area boundaries, you can create them with free tools:
- **[geojson.io](https://geojson.io)** - Draw boundaries on a map, copy the GeoJSON
- **[pictomap.app](https://pictomap.app)** - Create boundaries from images or maps
- **Google Earth** - Draw a polygon, export as KML, convert to GeoJSON

Once you have a GeoJSON file:

1. Save it in the `geometries/` folder
2. Name it: `{company}-{city}-{month}-{day}-{year}-boundary.geojson`
   - Example: `waymo-austin-march-4-2025-boundary.geojson`
3. Reference it in your CSV row (column 5)

**Expected GeoJSON format:**
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

**Note:** Both `Polygon` and `MultiPolygon` geometry types work. Tools like geojson.io will create the correct format automatically.

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
