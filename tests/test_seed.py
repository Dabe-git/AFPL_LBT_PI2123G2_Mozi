"""Tesztek az 1.3 Seed (random filmek + heti műsor generálása) scripthez."""

import contextlib
import sqlite3
from datetime import date, datetime, timedelta

from db.seed import NAPOK_SZAMA, seed


def test_seed_creates_films_halls_seats_and_weekly_schedule(tmp_path):
    """A seed feltölti a filmeket, termeket, üléseket és a 7 napos műsort."""
    db_file = tmp_path / "test_mozi.sqlite"
    start = date(2026, 11, 23)

    stats = seed(db_file, film_count=6, start_date=start, rng_seed=42)

    assert stats["film"] == 6
    assert stats["terem"] == 3
    assert stats["ules"] == 170
    assert stats["vetites"] >= 3 * NAPOK_SZAMA * 3
    assert stats["foglalas"] > 0

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        fk_errors = db.execute("PRAGMA foreign_key_check").fetchall()
        assert fk_errors == []

        rows = db.execute("SELECT kezdes FROM vetites").fetchall()
        dates = {row[0][:10] for row in rows}
        assert len(dates) == NAPOK_SZAMA
        assert min(dates) == "2026-11-23"
        assert max(dates) == "2026-11-29"


def test_seed_is_idempotent_without_force(tmp_path):
    """Újrafuttatás force=False esetén nem duplikálja az adatokat."""
    db_file = tmp_path / "test_idempotent.sqlite"

    first = seed(db_file, film_count=5, rng_seed=123)
    second = seed(db_file, film_count=8, rng_seed=999)

    assert first == second


def test_seed_force_replaces_existing_data(tmp_path):
    """A force=True opció tisztán újragenerálja az adatokat."""
    db_file = tmp_path / "test_force.sqlite"

    first = seed(db_file, film_count=5, rng_seed=1)
    second = seed(db_file, film_count=9, rng_seed=2, force=True)

    assert first["film"] == 5
    assert second["film"] == 9


def test_seed_screenings_do_not_overlap_in_same_hall(tmp_path):
    """Egy teremben két vetítés nem fedheti át egymást."""
    db_file = tmp_path / "test_overlap.sqlite"
    seed(db_file, film_count=7, start_date=date(2026, 11, 23), rng_seed=7)

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        rows = db.execute(
            "SELECT v.terem_id, v.kezdes, f.hossz_perc "
            "FROM vetites v JOIN film f ON v.film_id = f.id "
            "ORDER BY v.terem_id, v.kezdes"
        ).fetchall()

    prev_by_hall: dict[int, datetime] = {}
    for terem_id, kezdes, hossz_perc in rows:
        start_dt = datetime.strptime(kezdes, "%Y-%m-%dT%H:%M")
        if terem_id in prev_by_hall:
            assert start_dt >= prev_by_hall[terem_id]
        prev_by_hall[terem_id] = start_dt + timedelta(minutes=hossz_perc)
