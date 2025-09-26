# Contributing to AV Map Data

Thank you for your interest in contributing to the AV Map Data repository! This dataset currently tracks autonomous vehicle service deployments across the United States, with plans to expand globally, and powers [avmap.io](https://avmap.io).

**Global contributions welcome!** While our current data focuses on the US, we're ready to accept data from autonomous vehicle services worldwide.

**For a high-level overview of the project, see [README.md](README.md). This guide focuses on implementation details for contributors.**

## Event Sourcing Model

This repository uses an **event sourcing** approach where each row represents a single change to an autonomous vehicle service. This allows us to track the complete evolution of services over time.

### Two Types of Events:

1. **Service Creation** (`service_created`) - Complete initial service setup
2. **Service Updates** - Single attribute changes (geometry, vehicles, fares, etc.)

## CSV Structure

Our 14-column structure captures all service attributes:

| Column           | Description                    | Example                                      |
| ---------------- | ------------------------------ | -------------------------------------------- |
| `date`           | Event date (YYYY-MM-DD)        | `2025-06-22`                                 |
| `event_type`     | Type of change                 | `service_created`                            |
| `company`        | Company name                   | `Tesla`                                      |
| `city`           | City or region                 | `Austin`                                     |
| `geometry_file`  | Boundary file (if applicable)  | `tesla-austin-june-22-2025-boundary.geojson` |
| `vehicles`       | Vehicle types                  | `Tesla Model Y`                              |
| `platform`       | Booking platform/app           | `Robotaxi`                                   |
| `fares`          | Fare policy                    | `Yes` / `No`                                 |
| `direct_booking` | Can book directly              | `Yes` / `No`                                 |
| `supervision`    | Supervision level              | `Safety Driver` / `Autonomous`               |
| `access`         | Access policy                  | `Public` / `Waitlist`                        |
| `fleet_partner`  | Fleet partnerships             | `Moove`                                      |
| `source_url`     | Source article or announcement | `https://...`                                |
| `notes`          | Additional context             | `Initial service launch`                     |

## How to Contribute

### Adding a New Service Launch

For `service_created` events, **fill in ALL service attributes**:

```csv
2025-09-10,service_created,Zoox,Las Vegas,zoox-las-vegas-september-10-2025-boundary.geojson,Zoox Robotaxi,Zoox,No,Yes,Autonomous,Public,,https://techcrunch.com/2025/09/10/zoox-opens-its-las-vegas-robotaxi-service-to-the-public/,Zoox Las Vegas service
```

**Required for service_created:**

- `date`, `event_type`, `company`, `city`
- `vehicles`, `platform`, `fares`, `direct_booking`, `supervision`, `access`
- `geometry_file` (if boundaries available)
- `source_url`

### Adding Service Updates

For update events, **only fill the field that changed**:

#### Boundary Changes

```csv
2025-06-17,geometry_updated,,Silicon Valley,waymo-silicon-valley-june-17-2025-boundary.geojson,,,,,,,,https://www.theverge.com/news/688202/waymo-sf-la-service-area-expand-robotaxi,Service area boundary update
```

#### Vehicle Updates

```csv
2023-03-30,vehicle_types_updated,,Phoenix,,Jaguar I-Pace,,,,,,,https://techcrunch.com/2023/03/30/waymo-retires-its-self-driving-chrysler-pacifica-minivan/,Vehicle fleet update
```

#### Policy Changes

```csv
2020-10-08,fares_policy_changed,,Phoenix,,,,Yes,,,,,https://waymo.com/blog/2020/10/waymo-is-opening-its-fully-driverless-service-in-phoenix,Fares policy update
```

#### Access Changes

```csv
2024-06-25,access_policy_changed,,San Francisco,,,,,,,Public,,https://waymo.com/blog/2024/06/waymo-one-is-now-open-to-everyone-in-san-francisco,Access policy update
```

## Event Types

Use these standardized event types:

### Service Lifecycle

- **`service_created`** - New service launch (fill ALL fields)
- **`service_ended`** - Service discontinued

### Service Changes (fill ONLY the changed field)

- **`geometry_updated`** - Service area boundary changes
- **`vehicle_types_updated`** - Fleet vehicle changes
- **`platform_updated`** - Booking platform changes
- **`fares_policy_changed`** - Fare policy changes
- **`access_policy_changed`** - Access changes (public, waitlist, etc.)
- **`supervision_updated`** - Supervision level changes
- **`fleet_partner_changed`** - Fleet partnership changes

## Service Attributes Guide

**Important:** The values below are examples from existing services. **You can add new values** when documenting new companies, vehicles, platforms, or policies that aren't listed here!

### Companies

Current companies in the dataset: `Waymo`, `Tesla`, `Zoox`, `May Mobility`

**New company?** Use the official company name (e.g., `Aurora`, `Cruise`, `Motional`, `Nuro`, `Argo AI`)

### Vehicles

Examples of vehicle models used:

- `Tesla Model Y`, `Tesla Cybercab`
- `Jaguar I-Pace`
- `Chrysler Pacifica Hybrid`
- `Toyota Sienna`
- `Zoox Robotaxi`

**New vehicles?** Use the official vehicle name (e.g., `Mercedes EQS`, `Ford E-Transit`, `Cruise Origin`)

### Platform

Examples of booking platforms:

- `Waymo` (Waymo One app)
- `Uber` (through Uber app)
- `Lyft` (through Lyft app)
- `Robotaxi` (Tesla's app)
- `Cruise` (Cruise app)
- `Zoox` (Zoox app)

**New platform?** Use the official app/platform name (e.g., `Aurora`, `Motional`, `Via`)

### Fares

- `Yes` - Charges fares
- `No` - Free service

### Direct Booking

- `Yes` - Can book directly through company app
- `No` - Must use third-party platform (Uber/Lyft)

### Supervision

Examples of supervision levels:

- `Autonomous` - No human driver
- `Safety Driver` - Human safety driver present
- `Safety Attendant` - Remote human monitoring
- `Remote Supervision` - Remote human oversight

**New supervision model?** Describe it clearly (e.g., `Teleoperator`, `Safety Engineer`)

### Access

Examples of access policies:

- `Public` - Open to everyone
- `Waitlist` - Must join waitlist
- `Employees Only` - Company employees only
- `Invite Only` - By invitation

**New access model?** Describe it clearly (e.g., `Beta Users`, `Premium Members`, `Local Residents`)

## Geometry Files

If adding service area boundaries:

1. **Create GeoJSON file** in `geometries/` folder
2. **Naming convention**: `{company}-{city}-{month}-{day}-{year}-boundary.geojson`
3. **Standard format**:

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

Test your changes before submitting:

```bash
cd av-map-data
python3 scripts/validate.py
```

The validator checks:

- CSV structure and required fields
- Event sourcing rules (only changed fields filled)
- GeoJSON validity
- File references
- Data consistency

## Submission Process

1. **Fork this repository**
2. **Create a feature branch** (`feature/add-cruise-miami`)
3. **Make your changes** following the event sourcing model
4. **Run validation** to ensure data quality
5. **Submit a pull request** with clear description

## Examples

### Complete Service Launch

```csv
2025-03-11,service_created,Waymo,Silicon Valley,waymo-silicon-valley-march-11-2025-boundary.geojson,Jaguar I-Pace,Waymo,Yes,Yes,Autonomous,Public,,https://www.mercurynews.com/2025/03/11/alphabets-waymo-to-offer-self-driving-rides-in-silicon-valley/,Waymo Silicon Valley service
```

### Service Area Expansion

```csv
2025-07-14,geometry_updated,,Austin,tesla-austin-july-14-2025-boundary.geojson,,,,,,,,https://www.businessinsider.com/tesla-new-robotaxi-geofence-austin-shape-elon-musk-bigger-waymo-2025-7,Service area boundary update
```

### Fleet Update

```csv
2020-10-08,vehicle_types_updated,,Phoenix,,Chrysler Pacifica Hybrid,,,,,,,https://techcrunch.com/2019/06/17/waymos-self-driving-jaguar-i-pace-vehicles-are-now-testing-on-public-roads/,Vehicle fleet expansion - adding Jaguar I-Pace
```

### Policy Change

```csv
2024-11-12,access_policy_changed,,Los Angeles,,,,,,,Public,,https://waymo.com/blog/2024/11/waymo-one-open-to-all-in-los-angeles,Access policy update
```

## Data Quality Guidelines

- **Accuracy first** - Only submit verified information
- **Single changes** - Update events should modify only one attribute
- **Complete initializations** - Service creation must include all attributes
- **Reliable sources** - Always include source URL when available
- **Precise boundaries** - GeoJSON should be as accurate as possible

## Questions?

- Check existing [Issues](../../issues) for similar questions
- Open a new issue if you need help
- Review recent pull requests for examples

Thank you for helping build the most comprehensive dataset of autonomous vehicle deployments!
