"""Mozi foglalási rendszer - adatbázis seed (Issue #7).

Random filmek, termek, ülések, heti műsor és minta foglalások generálása.
Használat: python db/seed.py [adatbázis fájl útvonala] [--seed 42] [--force]
"""

import argparse
import contextlib
import random
import sqlite3
from datetime import date, datetime, time, timedelta
from pathlib import Path

try:
    from db.migrate import DEFAULT_DB_PATH, migrate
except ImportError:
    from migrate import DEFAULT_DB_PATH, migrate

TERMEK = [
    ("1. Terem (IMAX)", 8, 10),
    ("2. Terem", 6, 10),
    ("3. Terem (VIP)", 5, 6),
]

FILM_POOL = [
    ("Csillagok Háborúja: Az Új Horizont", "Sci-Fi", 142),
    ("Budapesti Hajsza", "Akció", 118),
    ("Kódok és Kávék", "Vígjáték", 98),
    ("Az Utolsó Felvonás", "Dráma", 130),
    ("Éjszakai Árnyak", "Thriller", 112),
    ("Időutazók Klubja", "Sci-Fi", 126),
    ("A Duna Titka", "Kaland", 115),
    ("Nevetni Tilos!", "Vígjáték", 94),
    ("Acél és Tűz", "Akció", 134),
    ("Csendes Vihar", "Dráma", 121),
    ("A Sötét Labirintus", "Thriller", 108),
    ("Robotok Városa", "Animáció", 102),
    ("Végállomás: Mars", "Sci-Fi", 148),
    ("Hétvégi Káosz", "Vígjáték", 96),
    ("Kettős Játszma", "Akció", 124),
]

VENDEG_NEVEK = [
    "Kovács János",
    "Nagy Anna",
    "Tóth Péter",
    "Szabó Eszter",
    "Horváth Bence",
    "Varga Dóra",
    "Kiss Gábor",
    "Molnár Lili",
]

BUFFER_PERC = 25
NAPOK_SZAMA = 7


def _generate_day_schedule(
    day: date,
    terem_id: int,
    filmek: list[tuple[int, int]],
    rng: random.Random,
) -> list[tuple[int, int, str]]:
    """Egy adott napra és teremre nem átfedő vetítéseket generál."""
    vetitesek = []
    start_hour = rng.choice([10, 11, 12])
    start_minute = rng.choice([0, 15, 30, 45])
    current_dt = datetime.combine(day, time(start_hour, start_minute))
    latest_start = datetime.combine(day, time(22, 15))

    slots = rng.randint(3, 4)
    for _ in range(slots):
        if current_dt > latest_start:
            break
        film_id, hossz_perc = rng.choice(filmek)
        kezdes_str = current_dt.strftime("%Y-%m-%dT%H:%M")
        vetitesek.append((film_id, terem_id, kezdes_str))

        extra_gap = rng.choice([0, 15, 30, 45])
        next_minutes = hossz_perc + BUFFER_PERC + extra_gap
        next_minutes = ((next_minutes + 4) // 5) * 5
        current_dt += timedelta(minutes=next_minutes)

    return vetitesek


def seed(
    db_path: str | Path = DEFAULT_DB_PATH,
    *,
    film_count: int = 8,
    start_date: date | None = None,
    rng_seed: int | None = None,
    seed_bookings: bool = True,
    force: bool = False,
) -> dict[str, int]:
    """Feltölti az adatbázist random filmekkel, termekkel, ülésekkel és heti műsorral.

    Idempotens: ha már vannak filmek az adatbázisban és force=False, nem írja felül.
    """
    migrate(db_path)
    rng = random.Random(rng_seed)
    base_date = start_date or date.today()

    with contextlib.closing(sqlite3.connect(db_path)) as db:
        db.execute("PRAGMA foreign_keys = ON")

        existing_films = db.execute("SELECT COUNT(*) FROM film").fetchone()[0]
        if existing_films > 0 and not force:
            return {
                "film": existing_films,
                "terem": db.execute("SELECT COUNT(*) FROM terem").fetchone()[0],
                "ules": db.execute("SELECT COUNT(*) FROM ules").fetchone()[0],
                "vetites": db.execute("SELECT COUNT(*) FROM vetites").fetchone()[0],
                "foglalas": db.execute("SELECT COUNT(*) FROM foglalas").fetchone()[0],
            }

        with db:
            if force:
                db.execute("DELETE FROM foglalas")
                db.execute("DELETE FROM vetites")
                db.execute("DELETE FROM ules")
                db.execute("DELETE FROM terem")
                db.execute("DELETE FROM film")

            terem_ulesek: dict[int, list[int]] = {}
            for nev, sorok, szekek in TERMEK:
                cur = db.execute("INSERT INTO terem (nev) VALUES (?)", (nev,))
                terem_id = cur.lastrowid
                ules_idk = []
                for sor in range(1, sorok + 1):
                    for szek in range(1, szekek + 1):
                        u_cur = db.execute(
                            "INSERT INTO ules (terem_id, sor, szek) VALUES (?, ?, ?)",
                            (terem_id, sor, szek),
                        )
                        ules_idk.append(u_cur.lastrowid)
                terem_ulesek[terem_id] = ules_idk

            count = max(1, min(film_count, len(FILM_POOL)))
            chosen_films = rng.sample(FILM_POOL, k=count)
            filmek: list[tuple[int, int]] = []
            for cim, mufaj, alap_hossz in chosen_films:
                hossz = max(60, alap_hossz + rng.randint(-10, 10))
                cur = db.execute(
                    "INSERT INTO film (cim, mufaj, hossz_perc) VALUES (?, ?, ?)",
                    (cim, mufaj, hossz),
                )
                filmek.append((cur.lastrowid, hossz))

            vetites_rekordok: list[tuple[int, int]] = []
            insert_vetites_sql = (
                "INSERT INTO vetites (film_id, terem_id, kezdes) VALUES (?, ?, ?)"
            )
            for day_offset in range(NAPOK_SZAMA):
                current_day = base_date + timedelta(days=day_offset)
                for terem_id in terem_ulesek:
                    napi_vetitesek = _generate_day_schedule(
                        current_day, terem_id, filmek, rng
                    )
                    for film_id, t_id, kezdes in napi_vetitesek:
                        cur = db.execute(insert_vetites_sql, (film_id, t_id, kezdes))
                        vetites_rekordok.append((cur.lastrowid, t_id))

            foglalas_db = 0
            insert_foglalas_sql = (
                "INSERT INTO foglalas "
                "(vetites_id, terem_id, ules_id, vendeg_nev, statusz) "
                "VALUES (?, ?, ?, ?, 'aktiv')"
            )
            if seed_bookings:
                for vetites_id, terem_id in vetites_rekordok:
                    ules_lista = terem_ulesek[terem_id]
                    max_foglalas = min(5, len(ules_lista) // 4)
                    if max_foglalas < 1:
                        continue
                    foglalt_ulesek = rng.sample(
                        ules_lista, k=rng.randint(1, max_foglalas)
                    )
                    for ules_id in foglalt_ulesek:
                        vendeg = rng.choice(VENDEG_NEVEK)
                        db.execute(
                            insert_foglalas_sql,
                            (vetites_id, terem_id, ules_id, vendeg),
                        )
                        foglalas_db += 1

        return {
            "film": len(filmek),
            "terem": len(terem_ulesek),
            "ules": sum(len(u) for u in terem_ulesek.values()),
            "vetites": len(vetites_rekordok),
            "foglalas": foglalas_db,
        }


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Mozi adatbázis seed: random filmek és heti műsor generálása."
    )
    parser.add_argument(
        "db_path",
        nargs="?",
        default=str(DEFAULT_DB_PATH),
        help="Az SQLite adatbázis fájl útvonala.",
    )
    parser.add_argument(
        "--films",
        type=int,
        default=8,
        help="Generálandó random filmek száma (alapértelmezett: 8).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Opcionális random seed a reprodukálható generáláshoz.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Meglévő adatok törlése és újragenerálása.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    stats = seed(
        args.db_path,
        film_count=args.films,
        rng_seed=args.seed,
        force=args.force,
    )
    print(
        f"Seed finished: {stats['film']} film, {stats['terem']} terem, "
        f"{stats['ules']} ules, {stats['vetites']} vetites, "
        f"{stats['foglalas']} foglalas"
    )
