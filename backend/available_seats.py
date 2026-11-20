"""2.2 Szabad helyek lekerdezese vetitesenkent (Issue #9).

Lekeri egy adott vetites osszes uleset, kulon valasztva a szabad es az aktiv
foglalassal rendelkezo (foglalt) helyeket.
"""

import contextlib
import sqlite3
from pathlib import Path
from typing import Any

from db.migrate import DEFAULT_DB_PATH


class ScreeningNotFoundError(LookupError):
    """Akkor dobodik, ha a keresett vetites nem letezik."""


def get_available_seats(
    vetites_id: int,
    db_path: str | Path = DEFAULT_DB_PATH,
) -> dict[str, Any]:
    """Visszaadja egy vetites szabad es foglalt helyeinek listajat.

    A lemondott ('lemondva') foglalasok nem szamitanak foglaltnak.
    """
    with contextlib.closing(sqlite3.connect(db_path)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = sqlite3.Row

        screening = db.execute(
            """
            SELECT
                v.id AS vetites_id,
                v.film_id,
                f.cim AS film_cim,
                v.terem_id,
                t.nev AS terem_nev,
                v.kezdes
            FROM vetites v
            JOIN film f ON f.id = v.film_id
            JOIN terem t ON t.id = v.terem_id
            WHERE v.id = ?
            """,
            (vetites_id,),
        ).fetchone()

        if screening is None:
            raise ScreeningNotFoundError(f"A vetites nem talalhato: {vetites_id}")

        seat_rows = db.execute(
            """
            SELECT
                u.id AS ules_id,
                u.sor,
                u.szek,
                CASE WHEN fg.id IS NOT NULL THEN 1 ELSE 0 END AS is_occupied
            FROM ules u
            LEFT JOIN foglalas fg
                ON fg.ules_id = u.id
                AND fg.vetites_id = ?
                AND fg.statusz = 'aktiv'
            WHERE u.terem_id = ?
            ORDER BY u.sor, u.szek
            """,
            (vetites_id, screening["terem_id"]),
        ).fetchall()

    free_seats: list[dict[str, int]] = []
    occupied_seats: list[dict[str, int]] = []
    max_row = 0
    max_col = 0

    for seat in seat_rows:
        row_num = seat["sor"]
        col_num = seat["szek"]
        max_row = max(max_row, row_num)
        max_col = max(max_col, col_num)
        item = {"id": seat["ules_id"], "row": row_num, "col": col_num}
        if seat["is_occupied"]:
            occupied_seats.append(item)
        else:
            free_seats.append(item)

    return {
        "vetites_id": screening["vetites_id"],
        "film_id": screening["film_id"],
        "film_cim": screening["film_cim"],
        "terem_id": screening["terem_id"],
        "terem_nev": screening["terem_nev"],
        "kezdes": screening["kezdes"],
        "rows": max_row,
        "cols": max_col,
        "total_seats": len(free_seats) + len(occupied_seats),
        "free_count": len(free_seats),
        "occupied_count": len(occupied_seats),
        "free": free_seats,
        "occupied": occupied_seats,
    }
