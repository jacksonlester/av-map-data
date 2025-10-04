# Contributing to AV Map Data

This dataset tracks autonomous vehicle deployments and powers [avmap.io](https://avmap.io). While currently focused on US services, we accept data from anywhere.

## Event sourcing basics

Each row in `events.csv` represents one change to a service. Service creation events include all attributes. Updates include only what changed.

## CSV structure

14 columns capture service attributes:

| Column           | Description                | Example                                      |
| ---------------- | -------------------------- | -------------------------------------------- |
| `date`           | Event date (YYYY-MM-DD)    | `2025-06-22`                                 |
| `event_type`     | Type of change             | `service_created`                            |
| `company`        | Company name               | `Tesla`                                      |
| `city`           | City or region             | `Austin`                                     |
| `geometry_file`  | Boundary file if available | `tesla-austin-june-22-2025-boundary.geojson` |
| `vehicles`       | Vehicle types              | `Tesla Model Y`                              |
| `platform`       | Booking app                | `Robotaxi`                                   |
| `fares`          | Charges fares?             | `Yes` / `No`                                 |
| `direct_booking` | Can book AV directly?      | `Yes` / `No`                                 |
| `supervision`    | Supervision level          | `Autonomous` / `Safety Driver`               |
| `access`         | Access policy              | `Public` / `Waitlist`                        |
| `fleet_partner`  | Fleet partnerships         | `Moove`                                      |
| `source_url`     | Source link                | `https://...`                                |
| `notes`          | Additional context         | `Initial service launch`                     |

## Adding a new service

For `service_created` events, fill in all service attributes:

```csv
2025-09-10,service_created,Zoox,Las Vegas,zoox-las-vegas-september-10-2025-boundary.geojson,Zoox Robotaxi,Zoox,No,Yes,Autonomous,Public,,https://techcrunch.com/2025/09/10/zoox-opens-its-las-vegas-robotaxi-service-to-the-public/,Zoox Las Vegas service
```

Required: `date`, `event_type`, `company`, `city`, `vehicles`, `platform`, `fares`, `direct_booking`, `supervision`, `access`, `source_url`

## Updating a service

For updates, fill only the date, event type, company, city, the changed field, and source URL.

### Service area expansion

```csv
2025-07-14,geometry_updated,Tesla,Austin,tesla-austin-july-14-2025-boundary.geojson,,,,,,,,https://www.businessinsider.com/tesla-new-robotaxi-geofence-austin-shape-elon-musk-bigger-waymo-2025-7,Service area boundary update
```

### Fleet update

```csv
2020-10-08,vehicle_types_updated,Waymo,Phoenix,,Chrysler Pacifica Hybrid,,,,,,,https://techcrunch.com/2019/06/17/waymos-self-driving-jaguar-i-pace-vehicles-are-now-testing-on-public-roads/,Vehicle fleet expansion - adding Jaguar I-Pace
```

### Policy change

```csv
2024-11-12,access_policy_changed,Waymo,Los Angeles,,,,,,,Public,,https://waymo.com/blog/2024/11/waymo-one-open-to-all-in-los-angeles,Access policy update
```

## Event types

**Service lifecycle:**

- `service_created` - New service launch (fill all fields)
- `service_ended` - Service discontinued

**Service changes (fill only the changed field):**

- `geometry_updated` - Service area changes
- `vehicle_types_updated` - Fleet changes
- `platform_updated` - Booking platform changes
- `fares_policy_changed` - Fare policy changes
- `access_policy_changed` - Access changes
- `supervision_updated` - Supervision level changes
- `fleet_partner_changed` - Fleet partnership changes

## Field values

Add new values when documenting companies, vehicles, platforms, or policies not listed here.

**Companies:** Waymo, Tesla, Zoox, May Mobility, Cruise

**Vehicles:** Tesla Model Y, Jaguar I-Pace, Chrysler Pacifica Hybrid, Toyota Sienna, Zoox Robotaxi

**Platform:** Waymo, Uber, Lyft, Robotaxi, Cruise, Zoox

**Fares:** `Yes` (charges fares), `No` (free)

**Direct Booking:** `Yes` (book AV directly), `No` (may or may not get AV, like Waymo on UberX)

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

Before submitting:

```bash
python3 scripts/validate.py
```

Checks CSV structure, event sourcing rules, GeoJSON validity, and data consistency.

## Submission

1. Fork this repository
2. Create a feature branch (`feature/add-cruise-miami`)
3. Make your changes
4. Run validation
5. Submit a pull request

## Questions?

Check existing [issues](../../issues) or open a new one.
