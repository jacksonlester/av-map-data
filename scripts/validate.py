#!/usr/bin/env python3
"""
Data validation script for AV Map Data repository.
This is a wrapper that runs pytest for validation.
"""

import sys
import subprocess
from pathlib import Path


def main():
    """Run pytest validation."""
    base_dir = Path(__file__).parent.parent

    print("🔍 Running validation tests with pytest...")
    print("=" * 50)
    print()

    # Run pytest
    result = subprocess.run(
        ["pytest", "tests/", "-v"],
        cwd=base_dir,
        capture_output=False
    )

    sys.exit(result.returncode)


if __name__ == "__main__":
    main()