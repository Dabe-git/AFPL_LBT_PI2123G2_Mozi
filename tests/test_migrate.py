import contextlib
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from db.migrate import SCHEMA_VERSION, migrate

SCRIPT = Path(__file__).parent.parent / "db" / "migrate.py"


def query(db_path, sql):
    with contextlib.closing(sqlite3.connect(db_path)) as db:
        return db.execute(sql).fetchall()


def table_names(db_path):
    rows = query(
        db_path, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    )
    return [row[0] for row in rows]


def run_cli(*args):
    return subprocess.run(
        [sys.executable, SCRIPT, *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_creates_all_tables(tmp_path):
    db_path = tmp_path / "mozi.sqlite"

    migrate(db_path)

    assert table_names(db_path) == ["film", "foglalas", "terem", "ules", "vetites"]


def test_creates_missing_parent_folder(tmp_path):
    db_path = tmp_path / "uj" / "mappa" / "mozi.sqlite"

    migrate(db_path)

    assert db_path.exists()


def test_sets_schema_version(tmp_path):
    db_path = tmp_path / "mozi.sqlite"

    migrate(db_path)

    assert query(db_path, "PRAGMA user_version") == [(SCHEMA_VERSION,)]


def test_second_run_keeps_existing_data(tmp_path):
    db_path = tmp_path / "mozi.sqlite"
    migrate(db_path)
    with contextlib.closing(sqlite3.connect(db_path)) as db:
        db.execute("INSERT INTO terem (nev) VALUES ('Nagyterem')")
        db.commit()

    migrate(db_path)

    assert query(db_path, "SELECT nev FROM terem") == [("Nagyterem",)]


def test_failed_migration_leaves_database_empty_and_can_be_retried(tmp_path):
    db_path = tmp_path / "mozi.sqlite"
    bad_schema = tmp_path / "bad.sql"
    bad_schema.write_text(
        "CREATE TABLE film (id INTEGER);\nEZ NEM SQL;", encoding="utf-8"
    )

    with pytest.raises(sqlite3.Error):
        migrate(db_path, bad_schema)

    assert table_names(db_path) == []
    assert query(db_path, "PRAGMA user_version") == [(0,)]

    migrate(db_path)

    assert "film" in table_names(db_path)


def test_cli_prints_migration_finished(tmp_path):
    db_path = tmp_path / "mozi.sqlite"

    result = run_cli(str(db_path))

    assert result.returncode == 0
    assert result.stdout.strip() == "Migration finished"
    assert "vetites" in table_names(db_path)


def test_cli_can_run_twice(tmp_path):
    db_path = tmp_path / "mozi.sqlite"
    run_cli(str(db_path))

    result = run_cli(str(db_path))

    assert result.returncode == 0
    assert result.stdout.strip() == "Migration finished"
