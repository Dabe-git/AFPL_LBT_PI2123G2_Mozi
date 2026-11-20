"""Tesztek a 2.2 Szabad helyek lekerdezese (Issue #9) modulhoz."""

import contextlib
import sqlite3
from datetime import date

import pytest

from backend.available_seats import ScreeningNotFoundError, get_available_seats
from db.seed import seed


def test_available_seats_counts_match_hall_capacity(tmp_path):
    """A szabad es foglalt helyek osszege megegyezik a terem kapacitasaval."""
    db_file = tmp_path / "seats.sqlite"
    seed(db_file, film_count=4, start_date=date(2026, 11, 23), rng_seed=42)

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        vetites_id = db.execute("SELECT id FROM vetites LIMIT 1").fetchone()[0]

    result = get_available_seats(vetites_id, db_path=db_file)

    assert result["vetites_id"] == vetites_id
    assert result["total_seats"] == result["rows"] * result["cols"]
    assert result["free_count"] + result["occupied_count"] == result["total_seats"]
    assert len(result["free"]) == result["free_count"]
    assert len(result["occupied"]) == result["occupied_count"]

    free_ids = {s["id"] for s in result["free"]}
    occ_ids = {s["id"] for s in result["occupied"]}
    assert free_ids.isdisjoint(occ_ids)


def test_cancelled_booking_is_counted_as_free(tmp_path):
    """A lemondott foglalas ulese ujra szabadkent jelenik meg."""
    db_file = tmp_path / "seats_cancel.sqlite"
    seed(db_file, film_count=4, start_date=date(2026, 11, 23), rng_seed=10)

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        foglalas_id, vetites_id, ules_id = db.execute(
            "SELECT id, vetites_id, ules_id FROM foglalas "
            "WHERE statusz = 'aktiv' LIMIT 1"
        ).fetchone()
        db.execute(
            "UPDATE foglalas SET statusz = 'lemondva' WHERE id = ?",
            (foglalas_id,),
        )
        db.commit()

    result = get_available_seats(vetites_id, db_path=db_file)
    free_ids = {s["id"] for s in result["free"]}
    occ_ids = {s["id"] for s in result["occupied"]}

    assert ules_id in free_ids
    assert ules_id not in occ_ids


def test_missing_screening_raises_not_found(tmp_path):
    """Nem letezo vetites ID eseten ScreeningNotFoundError dobodik."""
    db_file = tmp_path / "seats_missing.sqlite"
    seed(db_file, rng_seed=1)

    with pytest.raises(ScreeningNotFoundError):
        get_available_seats(999999, db_path=db_file)
