"""2.1 Heti musor lekerdezese (Issue #8).

Lekeri az adott het (alapertelmezetten 7 nap) vetiteseit filmekre csoportositva,
teremmeretekkel es szabad helyek szamaval egyutt.
"""

import contextlib
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from db.migrate import DEFAULT_DB_PATH

MAGYAR_NAPOK = [
    "Hétfő",
    "Kedd",
    "Szerda",
    "Csütörtök",
    "Péntek",
    "Szombat",
    "Vasárnap",
]


def _format_day_name(kezdes: str) -> str:
    dt = datetime.strptime(kezdes, "%Y-%m-%dT%H:%M")
    return MAGYAR_NAPOK[dt.weekday()]


def get_weekly_schedule(
    db_path: str | Path = DEFAULT_DB_PATH,
    *,
    start_date: date | None = None,
    days: int = 7,
    mufaj: str | None = None,
) -> list[dict[str, Any]]:
    """Visszaadja az adott heti musort filmek szerint csoportositva.

    Parameterek:
        db_path: Az SQLite adatbazis fajl utvonala.
        start_date: A heti idoszak kezdonapja (alapertelmezett: mai nap).
        days: Hany napot kerdezzen le (alapertelmezett: 7).
        mufaj: Opcionalis mufaj szuro (kis-/nagybetu fuggetlen).
    """
    if days <= 0:
        raise ValueError("A napok szamanak pozitivnak kell lennie.")

    base_date = start_date or date.today()
    end_date = base_date + timedelta(days=days)
    start_iso = f"{base_date.isoformat()}T00:00"
    end_iso = f"{end_date.isoformat()}T00:00"

    query = """
        SELECT
            f.id AS film_id,
            f.cim,
            f.mufaj,
            f.hossz_perc,
            v.id AS vetites_id,
            v.terem_id,
            t.nev AS terem_nev,
            v.kezdes,
            COALESCE(tm.total_seats, 0) AS total_seats,
            COALESCE(tm.max_sor, 0) AS max_sor,
            COALESCE(tm.max_szek, 0) AS max_szek,
            COALESCE(fg.booked_seats, 0) AS booked_seats
        FROM vetites v
        JOIN film f ON f.id = v.film_id
        JOIN terem t ON t.id = v.terem_id
        LEFT JOIN (
            SELECT
                terem_id,
                COUNT(*) AS total_seats,
                MAX(sor) AS max_sor,
                MAX(szek) AS max_szek
            FROM ules
            GROUP BY terem_id
        ) tm ON tm.terem_id = v.terem_id
        LEFT JOIN (
            SELECT vetites_id, COUNT(*) AS booked_seats
            FROM foglalas
            WHERE statusz = 'aktiv'
            GROUP BY vetites_id
        ) fg ON fg.vetites_id = v.id
        WHERE v.kezdes >= ? AND v.kezdes < ?
    """
    params: list[Any] = [start_iso, end_iso]

    if mufaj:
        query += " AND LOWER(f.mufaj) = LOWER(?)"
        params.append(mufaj.strip())

    query += " ORDER BY f.id, v.kezdes"

    with contextlib.closing(sqlite3.connect(db_path)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = sqlite3.Row
        rows = db.execute(query, params).fetchall()

    movies_by_id: dict[int, dict[str, Any]] = {}
    for row in rows:
        film_id = row["film_id"]
        if film_id not in movies_by_id:
            movies_by_id[film_id] = {
                "id": film_id,
                "title": row["cim"],
                "genre": row["mufaj"],
                "duration_min": row["hossz_perc"],
                "age_rating": "12+",
                "description": f"{row['mufaj']} film ({row['hossz_perc']} perc).",
                "screenings": [],
            }

        total_seats = row["total_seats"]
        booked_seats = row["booked_seats"]
        kezdes = row["kezdes"]

        movies_by_id[film_id]["screenings"].append(
            {
                "id": row["vetites_id"],
                "terem_id": row["terem_id"],
                "hall": row["terem_nev"],
                "kezdes": kezdes,
                "day": _format_day_name(kezdes),
                "time": kezdes[11:16],
                "rows": row["max_sor"],
                "cols": row["max_szek"],
                "total_seats": total_seats,
                "free_seats": max(0, total_seats - booked_seats),
            }
        )

    return list(movies_by_id.values())
