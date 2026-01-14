#!/usr/bin/env python3

"""
Import CSV to Supabase

This script reads events.csv and syncs it to the Supabase database.
It will create/update events in the database based on the CSV.

Usage:
  python3 import-csv.py              # Import to production
  STAGING=true python3 import-csv.py # Import to staging
"""

import os
import sys
import csv
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env file if not in GitHub Actions
if not os.getenv('GITHUB_ACTIONS'):
    load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY')

if not supabase_url or not supabase_service_key:
    print('❌ Missing required environment variables!')
    print('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env')
    sys.exit(1)

is_staging = os.getenv('STAGING') == 'true'
environment = 'staging' if is_staging else 'production'
events_table = 'av_events_staging' if is_staging else 'av_events'

print('\n' + '=' * 70)
print(f'🌍 ENVIRONMENT: {environment.upper()}')
print('=' * 70)
print(f'📋 Events table: {events_table}\n')

# Production safety check
if not is_staging and not os.getenv('GITHUB_ACTIONS'):
    print('⚠️  WARNING: You are about to modify PRODUCTION data!')
    print('This will import events to the production database.')
    print('Make sure you have tested in STAGING first!\n')

    confirmation = input('Type "PRODUCTION" to confirm (or Ctrl+C to cancel): ')
    if confirmation.strip() != 'PRODUCTION':
        print('\n❌ Import cancelled - confirmation did not match')
        sys.exit(0)
    print('')

supabase: Client = create_client(supabase_url, supabase_service_key)

# Map CSV column names to database field names
FIELD_MAPPING = {
    'date': 'event_date',
    'event_type': 'event_type',
    'company': 'company',
    'city': 'city',
    'geometry_file': 'geometry_name',
    'vehicles': 'vehicle_types',
    'platform': 'platform',
    'fares': 'fares',
    'direct_booking': 'direct_booking',
    'service_model': 'service_model',
    'supervision': 'supervision',
    'access': 'access',
    'fleet_partner': 'fleet_partner',
    'expected_launch': 'expected_launch',
    'company_link': 'company_link',
    'booking_platform_link': 'booking_platform_link',
    'source_url': 'event_url',
    'notes': 'notes'
}

def csv_row_to_event(row):
    company = row.get('company', '').strip()
    city = row.get('city', '').strip()
    date = row.get('date', '').strip()

    if not company or not city or not date:
        raise ValueError('Missing required fields: company, city, or date')

    # Create aggregate_id (unique identifier for the service)
    aggregate_id = f"{company.lower().replace(' ', '-')}-{city.lower().replace(' ', '-')}"

    # Build event_data object with all service attributes
    event_data = {
        'name': city,  # city becomes "name" in event_data
        'company': company  # company goes in event_data too
    }

    # Determine which fields to include in event_data based on event type
    event_type = row.get('event_type', '')
    is_update_event = event_type in [
        'fares_policy_changed',
        'access_policy_changed',
        'supervision_updated',
        'platform_updated',
        'vehicle_types_updated',
        'fleet_partner_changed',
        'service_model_updated',
        'geometry_updated',
        'direct_booking_updated'
    ]

    is_service_created = event_type == 'service_created'
    is_service_testing = event_type == 'service_testing'
    is_service_announced = event_type == 'service_announced'

    # Map all CSV fields to event_data
    for csv_key, value in row.items():
        value = value.strip() if value else ''
        if not value:
            continue  # Skip empty values

        db_key = FIELD_MAPPING.get(csv_key)
        if db_key and db_key not in ['event_date', 'event_type']:
            # Convert geometry_file to geometry_name format
            if csv_key == 'geometry_file':
                # Check if it's inline coordinates (lng,lat format)
                import re
                if re.match(r'^-?\d+\.?\d*,-?\d+\.?\d*$', value):
                    # Store inline coordinates directly as geometry_name
                    event_data['geometry_name'] = value
                else:
                    # Remove .geojson extension from filename
                    event_data['geometry_name'] = value.replace('.geojson', '')
            # For service_created, service_testing, service_announced include all fields
            # For update events, skip the field being updated (will be added as new_* below)
            # Always include company, city, notes, and source_url
            elif (is_service_created or
                  is_service_testing or
                  is_service_announced or
                  csv_key in ['company', 'city', 'notes', 'source_url', 'expected_launch']):
                event_data[db_key] = value
            # For update events, only include fields that aren't being updated
            elif is_update_event:
                is_field_being_updated = (
                    (event_type == 'fares_policy_changed' and csv_key == 'fares') or
                    (event_type == 'access_policy_changed' and csv_key == 'access') or
                    (event_type == 'supervision_updated' and csv_key == 'supervision') or
                    (event_type == 'platform_updated' and csv_key == 'platform') or
                    (event_type == 'vehicle_types_updated' and csv_key == 'vehicles') or
                    (event_type == 'fleet_partner_changed' and csv_key == 'fleet_partner') or
                    (event_type == 'service_model_updated' and csv_key == 'service_model') or
                    (event_type == 'direct_booking_updated' and csv_key == 'direct_booking')
                )

                if not is_field_being_updated:
                    event_data[db_key] = value

    # Add the new_* fields for update events
    if event_type == 'fares_policy_changed' and row.get('fares'):
        event_data['new_fares'] = row['fares']
    elif event_type == 'access_policy_changed' and row.get('access'):
        event_data['new_access'] = row['access']
    elif event_type == 'supervision_updated' and row.get('supervision'):
        event_data['new_supervision'] = row['supervision']
    elif event_type == 'platform_updated' and row.get('platform'):
        event_data['new_platform'] = row['platform']
    elif event_type == 'vehicle_types_updated' and row.get('vehicles'):
        event_data['new_vehicle_types'] = row['vehicles']
    elif event_type == 'fleet_partner_changed' and row.get('fleet_partner'):
        event_data['new_fleet_partner'] = row['fleet_partner']
    elif event_type == 'service_model_updated' and row.get('service_model'):
        event_data['new_service_model'] = row['service_model']
    elif event_type == 'direct_booking_updated' and row.get('direct_booking'):
        event_data['new_direct_booking'] = row['direct_booking']

    return {
        'aggregate_id': aggregate_id,
        'aggregate_type': 'service_area',
        'event_date': date,
        'event_type': event_type,
        'event_data': event_data
    }

def import_csv():
    print('📖 Reading events.csv...')

    try:
        # Read CSV file
        records = []
        with open('./events.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            records = list(reader)

        print(f'   Found {len(records)} events in CSV\n')

        # Convert CSV rows to event objects
        print('🔄 Converting CSV to event format...')
        events = []
        for index, row in enumerate(records):
            try:
                events.append(csv_row_to_event(row))
            except Exception as error:
                print(f'   ❌ Error on row {index + 2}: {error}')
                raise

        print(f'   ✅ Converted {len(events)} events\n')

        # Clear existing events in the table
        print(f'🗑️  Clearing {events_table} table...')
        response = supabase.table(events_table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print('   ✅ Table cleared\n')

        # Insert events in batches
        print('📥 Importing events to database...')
        BATCH_SIZE = 50
        imported = 0

        for i in range(0, len(events), BATCH_SIZE):
            batch = events[i:i + BATCH_SIZE]
            response = supabase.table(events_table).insert(batch).execute()

            imported += len(batch)
            print(f'   Progress: {imported}/{len(events)} events')

        print(f'   ✅ Imported {imported} events\n')

        # Verify count
        print('🔍 Verifying import...')
        response = supabase.table(events_table).select('id', count='exact').execute()
        count = response.count

        print(f'   CSV events: {len(events)}')
        print(f'   Database events: {count}\n')

        if count == len(events):
            print('✅ Import complete! All events synced successfully.')
            print('\n📝 Next steps:')
            print(f'   Run: {"STAGING=true " if is_staging else ""}python3 rebuild-cache.py')
        else:
            print('❌ Count mismatch! Import may have failed.')
            sys.exit(1)

    except Exception as error:
        print(f'❌ Import failed: {error}')
        sys.exit(1)

if __name__ == '__main__':
    import_csv()
