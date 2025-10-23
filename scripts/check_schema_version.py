#!/usr/bin/env python3
"""
Schema version checker - helps detect schema drift and mismatches.
Run this before making data changes to ensure tests are in sync.
"""

import sys
from pathlib import Path

# Add tests directory to path to import schema_loader
sys.path.insert(0, str(Path(__file__).parent.parent / 'tests'))

from schema_loader import get_schema
import csv


def check_csv_against_schema():
    """Verify that the CSV structure matches the schema definition."""
    schema = get_schema()
    repo_root = Path(__file__).parent.parent
    csv_file = repo_root / 'events.csv'

    print(f"Schema Version: {schema.version}")
    print(f"Checking CSV: {csv_file}")
    print()

    issues = []

    # Check headers match
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        csv_headers = reader.fieldnames
        schema_headers = schema.column_names

        if csv_headers != schema_headers:
            issues.append("HEADER MISMATCH:")
            issues.append(f"  Expected: {schema_headers}")
            issues.append(f"  Found:    {csv_headers}")

            # Show differences
            missing = set(schema_headers) - set(csv_headers)
            extra = set(csv_headers) - set(schema_headers)

            if missing:
                issues.append(f"  Missing columns: {missing}")
            if extra:
                issues.append(f"  Extra columns: {extra}")

    if issues:
        print("SCHEMA VALIDATION FAILED")
        print("=" * 50)
        for issue in issues:
            print(issue)
        print()
        print("Action required:")
        print("1. Update schema.json if the CSV structure changed intentionally")
        print("2. Or fix the CSV to match the schema")
        return False
    else:
        print("✓ CSV structure matches schema definition")
        print()
        print("Schema Summary:")
        print(f"  - {len(schema.columns)} columns")
        print(f"  - {len(schema.event_types)} event types")
        print(f"  - {len(schema.required_columns)} always-required columns")
        print()
        print("Event Types:")
        for event_type in schema.event_types:
            required = schema.get_required_fields(event_type)
            print(f"  - {event_type}: {len(required)} required fields")
        return True


def main():
    """Main entry point."""
    print("=" * 50)
    print("Schema Version Checker")
    print("=" * 50)
    print()

    success = check_csv_against_schema()

    if not success:
        sys.exit(1)

    print()
    print("All checks passed!")


if __name__ == '__main__':
    main()
