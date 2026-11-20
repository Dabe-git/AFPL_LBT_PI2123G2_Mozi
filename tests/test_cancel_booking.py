"""Tesztek a 2.4 Foglalas lemondasa (Issue #11) modulhoz."""

import contextlib
import sqlite3
from datetime import date

import pytest

from backend.cancel_booking import (
    BookingAlreadyCancelledError,
    BookingNotFoundError,
    cancel_booking,
)
from db.seed import seed


def test_cancel_booking_marks_cancelled_and_allows_rebooking(tmp_path):
    """Lemondas utan a rekord megmarad 'lemondva' statusszal es ujrafoglalhato."""
    db_file = tmp_path / "cancel_ok.sqlite"
    seed(db_file, film_count=3, start_date=date(2026, 11, 23), rng_seed=5)

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        foglalas_id, vetites_id, terem_id, ules_id = db.execute(
            "SELECT id, vetites_id, terem_id, ules_id FROM foglalas "
            "WHERE statusz = 'aktiv' LIMIT 1"
        ).fetchone()

    result = cancel_booking(foglalas_id, db_path=db_file)
    assert result["id"] == foglalas_id
    assert result["statusz"] == "lemondva"

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        status = db.execute(
            "SELECT statusz FROM foglalas WHERE id = ?", (foglalas_id,)
        ).fetchone()[0]
        assert status == "lemondva"

        db.execute(
            "INSERT INTO foglalas "
            "(vetites_id, terem_id, ules_id, vendeg_nev, statusz) "
            "VALUES (?, ?, ?, 'Uj Vendeg', 'aktiv')",
            (vetites_id, terem_id, ules_id),
        )
        db.commit()


def test_cancel_booking_errors(tmp_path):
    """Nem letezo vagy mar lemondott foglalas lemondasa hibat dob."""
    db_file = tmp_path / "cancel_err.sqlite"
    seed(db_file, film_count=3, start_date=date(2026, 11, 23), rng_seed=9)

    with pytest.raises(BookingNotFoundError):
        cancel_booking(999999, db_path=db_file)

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        foglalas_id = db.execute(
            "SELECT id FROM foglalas WHERE statusz = 'aktiv' LIMIT 1"
        ).fetchone()[0]

    cancel_booking(foglalas_id, db_path=db_file)
    with pytest.raises(BookingAlreadyCancelledError):
        cancel_booking(foglalas_id, db_path=db_file)
