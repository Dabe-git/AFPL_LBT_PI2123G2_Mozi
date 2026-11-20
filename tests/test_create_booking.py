"""Tesztek a 2.3 Foglalas letrehozasa - dupla foglalas tiltasa (#10) modulhoz."""

import contextlib
import sqlite3
from datetime import date

import pytest

from backend.create_booking import (
    InvalidBookingError,
    ScreeningNotFoundError,
    SeatAlreadyBookedError,
    SeatNotFoundError,
    create_booking,
)
from db.seed import seed


def _get_first_screening_id(db_file) -> int:
    with contextlib.closing(sqlite3.connect(db_file)) as db:
        return int(db.execute("SELECT id FROM vetites LIMIT 1").fetchone()[0])


def test_create_booking_succeeds_for_group(tmp_path):
    """Csoportos foglalas tobb szekre sikeresen elmentodik."""
    db_file = tmp_path / "booking_ok.sqlite"
    seed(db_file, film_count=3, start_date=date(2026, 11, 23), seed_bookings=False)
    vetites_id = _get_first_screening_id(db_file)

    res = create_booking(
        vetites_id,
        [{"row": 1, "col": 1}, {"row": 1, "col": 2}],
        "Teszt Elek",
        db_path=db_file,
    )

    assert res["vetites_id"] == vetites_id
    assert len(res["bookings"]) == 2
    assert all(b["statusz"] == "aktiv" for b in res["bookings"])


def test_double_booking_is_rejected_atomically(tmp_path):
    """Dupla foglalas tiltott, es csoportos keresnel egyik hely sem mentodik el."""
    db_file = tmp_path / "booking_double.sqlite"
    seed(db_file, film_count=3, start_date=date(2026, 11, 23), seed_bookings=False)
    vetites_id = _get_first_screening_id(db_file)

    create_booking(vetites_id, [(2, 3)], "Elso Vendeg", db_path=db_file)

    with pytest.raises(SeatAlreadyBookedError):
        create_booking(
            vetites_id,
            [(2, 2), (2, 3)],
            "Masodik Vendeg",
            db_path=db_file,
        )

    with contextlib.closing(sqlite3.connect(db_file)) as db:
        count = db.execute(
            "SELECT COUNT(*) FROM foglalas WHERE vetites_id = ? AND statusz = 'aktiv'",
            (vetites_id,),
        ).fetchone()[0]
    assert count == 1


def test_booking_validation_errors(tmp_path):
    """Hibas bemenetekre a megfelelo kivetel dobodik."""
    db_file = tmp_path / "booking_err.sqlite"
    seed(db_file, film_count=3, start_date=date(2026, 11, 23), seed_bookings=False)
    vetites_id = _get_first_screening_id(db_file)

    with pytest.raises(InvalidBookingError):
        create_booking(vetites_id, [(1, 1)], "   ", db_path=db_file)

    with pytest.raises(InvalidBookingError):
        create_booking(vetites_id, [], "Teszt Elek", db_path=db_file)

    with pytest.raises(ScreeningNotFoundError):
        create_booking(999999, [(1, 1)], "Teszt Elek", db_path=db_file)

    with pytest.raises(SeatNotFoundError):
        create_booking(vetites_id, [(99, 99)], "Teszt Elek", db_path=db_file)
