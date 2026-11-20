"""2.3 Foglalas letrehozasa - dupla foglalas tiltasa (Issue #10).

Atomi tranzakcioban letrehozza egy vagy tobb ules foglalast egy vetitesre.
Dupla foglalas eseten az egesz tranzakcio visszagorul (rollback).
"""

import contextlib
import sqlite3
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from db.migrate import DEFAULT_DB_PATH


class BookingError(Exception):
    """Alaposztaly a foglalasi hibakhoz."""


class ScreeningNotFoundError(BookingError, LookupError):
    """A megadott vetites nem talalhato."""


class SeatNotFoundError(BookingError, LookupError):
    """A megadott ules nem letezik a vetites termeben."""


class SeatAlreadyBookedError(BookingError, ValueError):
    """Az egyik kivalasztott ules mar foglalt erre a vetitesre."""


class InvalidBookingError(BookingError, ValueError):
    """Ervenytelen bemeneti adatok foglalashoz."""


SELECT_SEAT_BY_COORDS = (
    "SELECT id, sor, szek FROM ules WHERE terem_id = ? AND sor = ? AND szek = ?"
)


def _resolve_seat(
    db: sqlite3.Connection,
    terem_id: int,
    seat_spec: int | tuple[int, int] | dict[str, Any],
) -> tuple[int, int, int]:
    """Felold egy ules-specifikaciot (ules_id, sor, szek) harmassa."""
    if isinstance(seat_spec, int) and not isinstance(seat_spec, bool):
        row = db.execute(
            "SELECT id, sor, szek FROM ules WHERE id = ? AND terem_id = ?",
            (seat_spec, terem_id),
        ).fetchone()
    elif isinstance(seat_spec, (tuple, list)) and len(seat_spec) == 2:
        row = db.execute(
            SELECT_SEAT_BY_COORDS,
            (terem_id, int(seat_spec[0]), int(seat_spec[1])),
        ).fetchone()
    elif isinstance(seat_spec, dict):
        sor = seat_spec.get("row", seat_spec.get("sor"))
        szek = seat_spec.get("col", seat_spec.get("szek"))
        if sor is None or szek is None:
            raise InvalidBookingError(
                "Az ules objektumnak tartalmaznia kell a row/col mezoket."
            )
        row = db.execute(
            SELECT_SEAT_BY_COORDS,
            (terem_id, int(sor), int(szek)),
        ).fetchone()
    else:
        raise InvalidBookingError(f"Ervenytelen ules formatum: {seat_spec!r}")

    if row is None:
        raise SeatNotFoundError(f"Az ules nem letezik a teremben: {seat_spec!r}")

    return int(row[0]), int(row[1]), int(row[2])


def create_booking(
    vetites_id: int,
    seats: Sequence[int | tuple[int, int] | dict[str, Any]],
    vendeg_nev: str,
    db_path: str | Path = DEFAULT_DB_PATH,
) -> dict[str, Any]:
    """Letrehozza a foglalast atomi tranzakcioban, tiltva a dupla foglalast.

    Tamogatott ules formatumok a 'seats' listaban:
        - ules_id (int), pl. [12, 13]
        - (sor, szek) tuple, pl. [(3, 5), (3, 6)]
        - dict, pl. [{"row": 3, "col": 5}]
    """
    clean_name = vendeg_nev.strip() if isinstance(vendeg_nev, str) else ""
    if not clean_name:
        raise InvalidBookingError("A vendeg neve nem lehet ures.")
    if not seats:
        raise InvalidBookingError("Legalabb egy ulest ki kell valasztani.")

    with contextlib.closing(sqlite3.connect(db_path, isolation_level=None)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("BEGIN IMMEDIATE")
        try:
            screening = db.execute(
                "SELECT id, terem_id FROM vetites WHERE id = ?",
                (vetites_id,),
            ).fetchone()
            if screening is None:
                raise ScreeningNotFoundError(f"A vetites nem talalhato: {vetites_id}")

            terem_id = int(screening[1])
            resolved_seats: list[tuple[int, int, int]] = []
            seen_ids: set[int] = set()

            for seat_spec in seats:
                ules_id, sor, szek = _resolve_seat(db, terem_id, seat_spec)
                if ules_id in seen_ids:
                    raise InvalidBookingError(
                        f"Duplikalt ules a keresben: {sor}. sor {szek}. szek."
                    )
                seen_ids.add(ules_id)
                resolved_seats.append((ules_id, sor, szek))

            created: list[dict[str, Any]] = []
            for ules_id, sor, szek in resolved_seats:
                try:
                    cur = db.execute(
                        "INSERT INTO foglalas "
                        "(vetites_id, terem_id, ules_id, vendeg_nev, statusz) "
                        "VALUES (?, ?, ?, ?, 'aktiv')",
                        (vetites_id, terem_id, ules_id, clean_name),
                    )
                except sqlite3.IntegrityError as exc:
                    raise SeatAlreadyBookedError(
                        f"A hely mar foglalt: {sor}. sor {szek}. szek."
                    ) from exc

                created.append(
                    {
                        "id": cur.lastrowid,
                        "ules_id": ules_id,
                        "row": sor,
                        "col": szek,
                        "statusz": "aktiv",
                    }
                )

            db.execute("COMMIT")
        except Exception:
            db.execute("ROLLBACK")
            raise

    return {
        "vetites_id": vetites_id,
        "terem_id": terem_id,
        "vendeg_nev": clean_name,
        "bookings": created,
    }
