#!/usr/bin/env python3
"""
Data validation script for AV Map Data repository.
Validates the simplified CSV events data and GeoJSON geometry files.
"""

import csv
import json
import os
import sys
from pathlib import Path
from typing import List, Tuple
import re
from urllib.parse import urlparse

def validate_csv_structure() -> Tuple[bool, List[str]]:
    """Validate CSV has correct structure and data types."""
    errors = []

    try:
        with open('events.csv', 'r') as f:
            reader = csv.DictReader(f)

            # Check headers
            expected_headers = ['date', 'event_type', 'company', 'city', 'geometry_file', 'vehicles', 'platform', 'fares', 'direct_booking', 'supervision', 'access', 'fleet_partner', 'source_url', 'notes']
            if reader.fieldnames != expected_headers:
                errors.append(f"CSV headers incorrect. Expected: {expected_headers}, Got: {reader.fieldnames}")
                return False, errors

            # Validate each row
            for row_num, row in enumerate(reader, start=2):
                # Check required fields
                if not row.get('date'):
                    errors.append(f"Row {row_num}: Missing date")

                if not row.get('event_type'):
                    errors.append(f"Row {row_num}: Missing event_type")

                # Note: source_url is recommended but not strictly required

                # Validate date format
                date_val = row.get('date', '')
                if date_val and not re.match(r'^\d{4}-\d{2}-\d{2}$', date_val):
                    errors.append(f"Row {row_num}: Invalid date format. Expected YYYY-MM-DD, got: {date_val}")

                # Validate event types
                valid_event_types = [
                    'service_created', 'service_ended', 'geometry_updated',
                    'vehicle_types_updated', 'supervision_updated', 'fares_policy_changed',
                    'access_policy_changed', 'platform_updated', 'fleet_partner_changed'
                ]
                event_type = row.get('event_type', '')
                if event_type and event_type not in valid_event_types:
                    errors.append(f"Row {row_num}: Invalid event_type '{event_type}'. Valid types: {valid_event_types}")

                # Validate event sourcing rules
                event_type = row.get('event_type', '')
                if event_type == 'service_created':
                    # service_created events must have company, city, and all service attributes
                    required_fields = ['company', 'city', 'vehicles', 'platform', 'fares', 'direct_booking', 'supervision', 'access']
                    for field in required_fields:
                        if not row.get(field, '').strip():
                            errors.append(f"Row {row_num}: service_created event missing required field: {field}")
                elif event_type == 'service_ended':
                    # service_ended events must have company and city to identify the service
                    if not row.get('company', '').strip():
                        errors.append(f"Row {row_num}: service_ended event missing required field: company")
                    if not row.get('city', '').strip():
                        errors.append(f"Row {row_num}: service_ended event missing required field: city")
                    # service_ended events should not have service attribute fields filled
                    service_fields = ['vehicles', 'platform', 'fares', 'direct_booking', 'supervision', 'access', 'fleet_partner']
                    filled_fields = [field for field in service_fields if row.get(field, '').strip()]
                    if len(filled_fields) > 0:
                        errors.append(f"Row {row_num}: service_ended event should not have service attribute fields filled: {filled_fields}")
                elif event_type.endswith('_updated') or event_type.endswith('_changed'):
                    # Update events should have only one service attribute filled (plus geometry_file for geometry_updated)
                    service_fields = ['vehicles', 'platform', 'fares', 'direct_booking', 'supervision', 'access', 'fleet_partner']
                    filled_fields = [field for field in service_fields if row.get(field, '').strip()]

                    if event_type == 'geometry_updated':
                        # geometry_updated can have geometry_file but no service attributes
                        if len(filled_fields) > 0:
                            errors.append(f"Row {row_num}: geometry_updated event should not have service attribute fields filled")
                        if not row.get('geometry_file', '').strip():
                            errors.append(f"Row {row_num}: geometry_updated event must have geometry_file")
                    else:
                        # Other update events should have at least one service attribute filled
                        if len(filled_fields) == 0:
                            errors.append(f"Row {row_num}: {event_type} event should have at least one service attribute field filled")
                        elif len(filled_fields) > 1:
                            # Allow multiple fields for complex updates, but warn
                            pass  # This is acceptable for complex updates

                    # Update events should not have company filled (but city is allowed for context)
                    if row.get('company', '').strip():
                        errors.append(f"Row {row_num}: Update event should not have company field filled")

                # Validate geometry file naming
                geometry_file = row.get('geometry_file', '')
                if geometry_file:
                    if not geometry_file.endswith('.geojson'):
                        errors.append(f"Row {row_num}: Geometry file should end with .geojson: {geometry_file}")

                    expected_pattern = r'^[a-z0-9]+-[a-z0-9-]+-[a-z]+-\d{1,2}-\d{4}-boundary\.geojson$'
                    if not re.match(expected_pattern, geometry_file):
                        errors.append(f"Row {row_num}: Geometry file doesn't follow naming convention: {geometry_file}")

                # Validate service attribute values
                fares = row.get('fares', '').strip()
                if fares and fares not in ['Yes', 'No']:
                    errors.append(f"Row {row_num}: fares must be 'Yes' or 'No', got: {fares}")

                direct_booking = row.get('direct_booking', '').strip()
                if direct_booking and direct_booking not in ['Yes', 'No']:
                    errors.append(f"Row {row_num}: direct_booking must be 'Yes' or 'No', got: {direct_booking}")

                supervision = row.get('supervision', '').strip()
                valid_supervision = ['Autonomous', 'Safety Driver', 'Safety Attendant']
                if supervision and supervision not in valid_supervision:
                    errors.append(f"Row {row_num}: supervision must be one of {valid_supervision}, got: {supervision}")

                access = row.get('access', '').strip()
                valid_access = ['Public', 'Waitlist', 'Employees Only', 'Invite Only']
                if access and access not in valid_access:
                    errors.append(f"Row {row_num}: access must be one of {valid_access}, got: {access}")

                # Validate URL format
                source_url = row.get('source_url', '')
                if source_url:
                    try:
                        result = urlparse(source_url)
                        if not all([result.scheme, result.netloc]):
                            errors.append(f"Row {row_num}: Invalid URL format: {source_url}")
                    except Exception:
                        errors.append(f"Row {row_num}: Invalid URL format: {source_url}")

    except FileNotFoundError:
        errors.append("CSV file not found: events.csv")
    except Exception as e:
        errors.append(f"Error reading CSV file: {e}")

    return len(errors) == 0, errors

def validate_geojson_files() -> Tuple[bool, List[str]]:
    """Validate all GeoJSON files in geometries directory."""
    errors = []

    geometries_dir = Path('geometries')
    if not geometries_dir.exists():
        errors.append("Geometries directory not found")
        return False, errors

    geojson_files = list(geometries_dir.glob("*.geojson"))

    for geojson_file in geojson_files:
        try:
            with open(geojson_file, 'r') as f:
                geojson_data = json.load(f)

            # Basic GeoJSON structure validation
            if geojson_data.get('type') != 'FeatureCollection':
                errors.append(f"{geojson_file.name}: Must be a FeatureCollection")
                continue

            if 'features' not in geojson_data:
                errors.append(f"{geojson_file.name}: Missing 'features' array")
                continue

            if not isinstance(geojson_data['features'], list):
                errors.append(f"{geojson_file.name}: 'features' must be an array")
                continue

            # Validate each feature
            for i, feature in enumerate(geojson_data['features']):
                if feature.get('type') != 'Feature':
                    errors.append(f"{geojson_file.name}: Feature {i} must have type 'Feature'")

                if 'geometry' not in feature:
                    errors.append(f"{geojson_file.name}: Feature {i} missing geometry")

                if 'properties' not in feature:
                    errors.append(f"{geojson_file.name}: Feature {i} missing properties")

                # Check geometry types
                geometry = feature.get('geometry', {})
                geom_type = geometry.get('type')
                if geom_type not in ['Polygon', 'MultiPolygon', 'Point', 'LineString']:
                    errors.append(f"{geojson_file.name}: Feature {i} has invalid geometry type: {geom_type}")

        except json.JSONDecodeError as e:
            errors.append(f"{geojson_file.name}: Invalid JSON - {e}")
        except Exception as e:
            errors.append(f"{geojson_file.name}: Error reading file - {e}")

    return len(errors) == 0, errors

def check_file_references() -> Tuple[bool, List[str]]:
    """Check that all geometry files referenced in CSV exist."""
    errors = []

    try:
        with open('events.csv', 'r') as f:
            reader = csv.DictReader(f)

            for row_num, row in enumerate(reader, start=2):
                geometry_file = row.get('geometry_file', '').strip()
                if geometry_file:
                    geometry_path = Path('geometries') / geometry_file
                    if not geometry_path.exists():
                        errors.append(f"Row {row_num}: Referenced geometry file does not exist: {geometry_file}")

    except FileNotFoundError:
        errors.append("CSV file not found: events.csv")
    except Exception as e:
        errors.append(f"Error checking file references: {e}")

    return len(errors) == 0, errors

def check_data_consistency() -> Tuple[bool, List[str]]:
    """Check for data consistency issues."""
    errors = []

    try:
        with open('events.csv', 'r') as f:
            reader = csv.DictReader(f)

            service_locations = set()

            for row_num, row in enumerate(reader, start=2):
                # Track service locations for consistency
                company = row.get('company', '').strip()
                city = row.get('city', '').strip()
                if company and city:
                    service_key = f"{company}-{city}"
                    service_locations.add(service_key)

                # Additional consistency checks for service_created events
                event_type = row.get('event_type', '')
                if event_type == 'service_created':
                    if not row.get('company'):
                        errors.append(f"Row {row_num}: service_created event missing company")
                    if not row.get('city'):
                        errors.append(f"Row {row_num}: service_created event missing city")
                    if not row.get('notes'):
                        errors.append(f"Row {row_num}: service_created event missing notes")

    except Exception as e:
        errors.append(f"Error checking data consistency: {e}")

    return len(errors) == 0, errors

def main():
    """Main validation function."""
    print("🔍 Validating AV Map Data...")
    print("=" * 50)

    base_dir = Path(__file__).parent.parent
    os.chdir(base_dir)

    total_errors = 0

    # Validate CSV structure
    print("📊 Validating CSV structure...")
    csv_valid, csv_errors = validate_csv_structure()
    if csv_valid:
        print("✅ CSV structure is valid")
    else:
        print("❌ CSV structure validation failed:")
        for error in csv_errors:
            print(f"   {error}")
        total_errors += len(csv_errors)

    print()

    # Validate GeoJSON files
    print("🗺️  Validating GeoJSON files...")
    geojson_valid, geojson_errors = validate_geojson_files()
    if geojson_valid:
        print("✅ All GeoJSON files are valid")
    else:
        print("❌ GeoJSON validation failed:")
        for error in geojson_errors:
            print(f"   {error}")
        total_errors += len(geojson_errors)

    print()

    # Check file references
    print("🔗 Checking file references...")
    refs_valid, ref_errors = check_file_references()
    if refs_valid:
        print("✅ All file references are valid")
    else:
        print("❌ File reference validation failed:")
        for error in ref_errors:
            print(f"   {error}")
        total_errors += len(ref_errors)

    print()

    # Check data consistency
    print("🔍 Checking data consistency...")
    consistency_valid, consistency_errors = check_data_consistency()
    if consistency_valid:
        print("✅ Data consistency checks passed")
    else:
        print("❌ Data consistency validation failed:")
        for error in consistency_errors:
            print(f"   {error}")
        total_errors += len(consistency_errors)

    print()
    print("=" * 50)

    if total_errors == 0:
        print("🎉 All validations passed!")
        sys.exit(0)
    else:
        print(f"💥 Validation failed with {total_errors} error(s)")
        sys.exit(1)

if __name__ == "__main__":
    main()