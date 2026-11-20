"""2.4 Foglalas lemondasa (Issue #11).

A foglalas statuszat 'lemondva' allapotra allitja, megorizve a rekordot,
mikozben az ules ujra foglalhatova valik (uq_foglalas_aktiv_ules index alapjan).
"""

import contextlib
import sqlite3
from pathlib import Path
from typing import Any

from db.migrate import DEFAULT_DB_PATH


class BookingNotFoundError(LookupError):
    """A megadott azonositoju foglalas nem letezik."""


class BookingAlreadyCancelledError(ValueError):
    """A megadott foglalas mar korabban le lett mondva."""


def cancel_booking(
    foglalas_id: int,
    db_path: str | Path = DEFAULT_DB_PATH,
) -> dict[str, Any]:
    """Lemond egy aktiv foglalast ('aktiv' -> 'lemondva')."""
    with contextlib.closing(sqlite3.connect(db_path)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = sqlite3.Row

        with db:
            row = db.execute(
                """
                SELECT
                    f.id,
                    f.vetites_id,
                    f.terem_id,
                    f.ules_id,
                    u.sor,
                    u.szek,
                    f.vendeg_nev,
                    f.statusz
                FROM foglalas f
                JOIN ules u ON u.id = f.ules_id
                WHERE f.id = ?
                """,
                (foglalas_id,),
            ).fetchone()

            if row is None:
                raise BookingNotFoundError(f"A foglalas nem talalhato: {foglalas_id}")

            if row["statusz"] == "lemondva":
                raise BookingAlreadyCancelledError(
                    f"A foglalas mar le van mondva: {foglalas_id}"
                )

            db.execute(
                "UPDATE foglalas SET statusz = 'lemondva' WHERE id = ?",
                (foglalas_id,),
            )

    return {
        "id": row["id"],
        "vetites_id": row["vetites_id"],
        "terem_id": row["terem_id"],
        "ules_id": row["ules_id"],
        "row": row["sor"],
        "col": row["szek"],
        "vendeg_nev": row["vendeg_nev"],
        "statusz": "lemondva",
    }
