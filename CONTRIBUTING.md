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

15 columns capture service attributes:

| Column           | Description                | Example                                      | Required?     |
| ---------------- | -------------------------- | -------------------------------------------- | ------------- |
| `date`           | Event date (YYYY-MM-DD)    | `2025-06-22`                                 | Always        |
| `event_type`     | Type of change             | `service_created`                            | Always        |
| `company`        | Company name               | `Tesla`                                      | Always        |
| `city`           | City or region             | `Austin`                                     | Always        |
| `geometry_file`  | Boundary file if available | `tesla-austin-june-22-2025-boundary.geojson` | If applicable |
| `vehicles`       | Vehicle types              | `Tesla Model Y`                              | If applicable |
| `platform`       | Booking app                | `Robotaxi`                                   | If applicable |
| `fares`          | Charges fares?             | `Yes` / `No`                                 | If applicable |
| `direct_booking` | Can book AV directly?      | `Yes` / `No`                                 | If applicable |
| `service_model`  | Service model              | `Flexible` / `Stop-to-Stop`                  | If applicable |
| `supervision`    | Supervision level          | `Autonomous` / `Safety Driver`               | If applicable |
| `access`         | Access policy              | `Public` / `Waitlist`                        | If applicable |
| `fleet_partner`  | Fleet partnerships         | `Moove`                                      | If applicable |
| `source_url`     | Source link                | `https://...`                                | Preferred     |
| `notes`          | Additional context         | `Initial service launch`                     | Preferred     |

## Adding a new service

For `service_created` events, fill in all service attributes:

```csv
2025-09-10,service_created,Zoox,Las Vegas,zoox-las-vegas-september-10-2025-boundary.geojson,Zoox Robotaxi,Zoox,No,Yes,Stop-to-Stop,Autonomous,Public,,https://techcrunch.com/2025/09/10/zoox-opens-its-las-vegas-robotaxi-service-to-the-public/,Zoox Las Vegas service
```

Required: `date`, `event_type`, `company`, `city`, `vehicles`, `fares`, `direct_booking`, `service_model`, `supervision`, `access`, `source_url`

Note: `platform` is optional - leave empty if the service doesn't have a booking platform initially, then add it later with a `platform_updated` event.

## Updating a service

For updates, **always include** `company` and `city` to identify the service. Fill the changed field with the **complete new state** (not just what was added/removed).

### Service area expansion

```csv
2025-07-14,geometry_updated,Tesla,Austin,tesla-austin-july-14-2025-boundary.geojson,,,,,,,,https://www.businessinsider.com/tesla-new-robotaxi-geofence-austin-shape-elon-musk-bigger-waymo-2025-7,Service area boundary update
```

### Fleet update (complete new state)

```csv
2020-10-08,vehicle_types_updated,Waymo,Phoenix,,Jaguar I-Pace;Chrysler Pacifica Hybrid,,,,,,,https://techcrunch.com/2019/06/17/waymos-self-driving-jaguar-i-pace-vehicles-are-now-testing-on-public-roads/,Vehicle fleet expansion
```

Note: Multiple vehicles separated by `;` (semicolon). Shows complete current fleet, not just what changed.

### Platform update (complete new state)

```csv
2023-10-26,platform_updated,Waymo,Phoenix,,,Waymo;Uber,,,,,,https://waymo.com/blog/2023/10/the-waymo-driver-now-available-on-uber-in-phoenix,Added Uber platform
```

Note: Multiple platforms separated by `;` (semicolon). This allows filtering by either platform in the app.

### Policy change

```csv
2024-11-12,access_policy_changed,Waymo,Los Angeles,,,,,,,Public,,https://waymo.com/blog/2024/11/waymo-one-open-to-all-in-los-angeles,Access policy update
```

### Service model change

```csv
2026-03-15,service_model_updated,Zoox,Las Vegas,,,,,,,Flexible,,,https://example.com,Service now allows flexible travel
```

## Event types

**Service lifecycle:**

- `service_created` - New service launch (fill all fields)
- `service_ended` - Service discontinued

**Service changes (must include company + changed field with complete new state):**

- `geometry_updated` - Service area changes
- `vehicle_types_updated` - Fleet changes (show complete current fleet)
- `platform_updated` - Booking platform changes (show all platforms)
- `fares_policy_changed` - Fare policy changes
- `access_policy_changed` - Access changes
- `supervision_updated` - Supervision level changes
- `flexibility_updated` - Travel flexibility changes
- `fleet_partner_changed` - Fleet partnership changes

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

## Submission

1. Fork this repository and create a feature branch from `main`
2. Make your changes
3. Run tests (`pytest tests/ -v`)
4. Push your branch and create a pull request to the `staging` branch

## Questions?

Check existing [issues](../../issues) or open a new one.
