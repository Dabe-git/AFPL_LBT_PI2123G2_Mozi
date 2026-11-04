"""Mozi foglalási rendszer - adatbázis-migráció.

Használat: python db/migrate.py [adatbázis fájl útvonala]
"""

import contextlib
import sqlite3
import sys
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).parent / "mozi.sqlite"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"
SCHEMA_VERSION = 1


def migrate(db_path=DEFAULT_DB_PATH, schema_path=SCHEMA_PATH):
    """Létrehozza az adatbázist a séma alapján, a már migrált adatbázist nem módosítja.

    A séma és a verziószám egy tranzakcióban fut le, így hibánál üres marad a fájl.
    """
    schema = Path(schema_path).read_text(encoding="utf-8")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    with contextlib.closing(sqlite3.connect(db_path)) as db:
        version = db.execute("PRAGMA user_version").fetchone()[0]
        if version < SCHEMA_VERSION:
            db.executescript(
                f"BEGIN;\n{schema}\nPRAGMA user_version = {SCHEMA_VERSION};\nCOMMIT;"
            )


if __name__ == "__main__":
    migrate(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB_PATH)
    print("Migration finished")
