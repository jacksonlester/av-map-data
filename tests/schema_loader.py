"""
Schema loader utility for AV Map Data validation.
Provides a single source of truth for schema definitions.
"""

import json
from pathlib import Path
from typing import Dict, List, Any


class SchemaLoader:
    """Loads and provides access to the centralized schema definition."""

    def __init__(self, schema_path: Path = None):
        """
        Initialize the schema loader.

        Args:
            schema_path: Path to schema.json. Defaults to repo root.
        """
        if schema_path is None:
            # Default to .dev/schema.json
            schema_path = Path(__file__).parent.parent / '.dev' / 'schema.json'

        with open(schema_path, 'r') as f:
            self._schema = json.load(f)

    @property
    def version(self) -> str:
        """Get schema version."""
        return self._schema['version']

    @property
    def columns(self) -> List[Dict[str, Any]]:
        """Get all column definitions."""
        return self._schema['columns']

    @property
    def column_names(self) -> List[str]:
        """Get ordered list of column names."""
        return [col['name'] for col in self.columns]

    @property
    def required_columns(self) -> List[str]:
        """Get list of always-required columns."""
        return [col['name'] for col in self.columns if col.get('required', False)]

    @property
    def event_types(self) -> List[str]:
        """Get list of valid event types."""
        event_type_col = next(col for col in self.columns if col['name'] == 'event_type')
        return event_type_col['enum']

    def get_column(self, name: str) -> Dict[str, Any]:
        """Get column definition by name."""
        return next((col for col in self.columns if col['name'] == name), None)

    def get_enum_values(self, column_name: str) -> List[str]:
        """Get valid enum values for a column."""
        col = self.get_column(column_name)
        if col and 'enum' in col:
            return [v for v in col['enum'] if v != '']  # Exclude empty string
        return []

    def get_event_requirements(self, event_type: str) -> Dict[str, Any]:
        """Get field requirements for a specific event type."""
        return self._schema['eventTypeRequirements'].get(event_type, {})

    def get_required_fields(self, event_type: str) -> List[str]:
        """Get required fields for a specific event type."""
        reqs = self.get_event_requirements(event_type)
        return reqs.get('requiredFields', [])

    def get_forbidden_fields(self, event_type: str) -> List[str]:
        """Get forbidden fields for a specific event type."""
        reqs = self.get_event_requirements(event_type)
        return reqs.get('forbiddenFields', [])

    def get_allowed_fields(self, event_type: str) -> List[str]:
        """Get allowed fields for a specific event type."""
        reqs = self.get_event_requirements(event_type)
        return reqs.get('allowedFields', [])

    @property
    def validation_rules(self) -> Dict[str, Any]:
        """Get validation rules."""
        return self._schema['validationRules']

    def get_pattern(self, column_name: str) -> str:
        """Get regex pattern for a column."""
        col = self.get_column(column_name)
        return col.get('pattern', '') if col else ''

    def is_url_field(self, column_index: int) -> bool:
        """Check if a column index is a URL field."""
        return column_index in self.validation_rules['urlFields']


# Singleton instance for easy access
_schema_loader = None


def get_schema() -> SchemaLoader:
    """Get the singleton schema loader instance."""
    global _schema_loader
    if _schema_loader is None:
        _schema_loader = SchemaLoader()
    return _schema_loader


# Convenience functions for common operations
def get_event_types() -> List[str]:
    """Get list of valid event types."""
    return get_schema().event_types


def get_column_names() -> List[str]:
    """Get list of column names in order."""
    return get_schema().column_names


def get_enum_values(column_name: str) -> List[str]:
    """Get valid enum values for a column."""
    return get_schema().get_enum_values(column_name)


def get_required_fields(event_type: str) -> List[str]:
    """Get required fields for an event type."""
    return get_schema().get_required_fields(event_type)


def get_schema_version() -> str:
    """Get schema version."""
    return get_schema().version
