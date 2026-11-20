"""3.2 Idopont-ajanlas preferencia alapjan (Issue #13).

Mufaj, nap es napszak preferenciak alapjan pontozza es rangsorolja az elerheto
vetiteseket a heti musorbol.
"""

import contextlib
import sqlite3
import unicodedata
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

DAY_ALIASES: dict[str, int] = {
    "hetfo": 0,
    "monday": 0,
    "mon": 0,
    "kedd": 1,
    "tuesday": 1,
    "tue": 1,
    "szerda": 2,
    "wednesday": 2,
    "wed": 2,
    "csutortok": 3,
    "thursday": 3,
    "thu": 3,
    "pentek": 4,
    "friday": 4,
    "fri": 4,
    "szombat": 5,
    "saturday": 5,
    "sat": 5,
    "vasarnap": 6,
    "sunday": 6,
    "sun": 6,
}

TIME_OF_DAY_ALIASES: dict[str, str] = {
    "delelott": "DELELOTT",
    "reggel": "DELELOTT",
    "morning": "DELELOTT",
    "delutan": "DELUTAN",
    "afternoon": "DELUTAN",
    "este": "ESTE",
    "ejszaka": "ESTE",
    "evening": "ESTE",
    "night": "ESTE",
}

WEIGHT_GENRE = 40.0
WEIGHT_DAY = 35.0
WEIGHT_TIME_OF_DAY = 25.0


def _normalize_text(value: str) -> str:
    """Kisbetusiti es ekezetmentesiti a szoveget az osszehasonlitashoz."""
    decomposed = unicodedata.normalize("NFKD", value.strip().lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def get_time_of_day(time_str: str) -> str:
    """Meghatarozza a napszak kategoriat ('DELELOTT', 'DELUTAN', 'ESTE').

    Elfogad 'HH:MM' vagy 'YYYY-MM-DDTHH:MM' formatumu sztringet is.
    """
    clock = time_str[11:16] if "T" in time_str else time_str
    hour = int(clock.split(":")[0])
    if hour < 12:
        return "DELELOTT"
    if hour < 18:
        return "DELUTAN"
    return "ESTE"


def normalize_time_of_day(napszak: str | None) -> str | None:
    """Egysegesiti a napszak preferenciat ('DELELOTT' | 'DELUTAN' | 'ESTE')."""
    if napszak is None or not str(napszak).strip():
        return None
    norm = _normalize_text(str(napszak))
    if norm in ("all", "barmely", "mind"):
        return None
    if norm not in TIME_OF_DAY_ALIASES:
        raise ValueError(
            f"Ervenytelen napszak: {napszak!r}. Hasznald: DELELOTT, DELUTAN vagy ESTE."
        )
    return TIME_OF_DAY_ALIASES[norm]


def _parse_day_preference(
    nap: str | date | int | None,
) -> tuple[str | None, int | None]:
    """Feloldja a nap preferenciat (iso_datum, het_napja_index) parra."""
    if nap is None:
        return None, None
    if isinstance(nap, date) and not isinstance(nap, datetime):
        return nap.isoformat(), nap.weekday()
    if isinstance(nap, int) and not isinstance(nap, bool):
        if 0 <= nap <= 6:
            return None, nap
        raise ValueError(
            "A nap indexenek 0 (Hetfo) es 6 (Vasarnap) kozott kell lennie."
        )

    raw = str(nap).strip()
    if not raw:
        return None, None
    norm = _normalize_text(raw)
    if norm in ("all", "osszes nap", "barmely", "mind"):
        return None, None
    if norm in DAY_ALIASES:
        return None, DAY_ALIASES[norm]

    try:
        parsed_date = date.fromisoformat(raw)
        return parsed_date.isoformat(), parsed_date.weekday()
    except ValueError as exc:
        raise ValueError(
            f"Ervenytelen nap preferencia: {nap!r}. "
            "Adj meg napnevet (pl. 'Pentek') vagy ISO datumot (YYYY-MM-DD)."
        ) from exc


def score_screening_preferences(
    *,
    screening_genre: str,
    screening_kezdes: str,
    mufaj: str | None = None,
    nap: str | date | int | None = None,
    napszak: str | None = None,
) -> tuple[float, list[str], int]:
    """Kiszamolja egy vetites preferencia-pontszamat (0.0 - 100.0).

    Visszateresi ertek: (pontszam, teljesult_preferenciak_listaja, megadott_db).
    """
    dt = datetime.strptime(screening_kezdes, "%Y-%m-%dT%H:%M")
    screening_date_iso = dt.date().isoformat()
    screening_weekday = dt.weekday()
    screening_tod = get_time_of_day(screening_kezdes)

    target_genre = (
        _normalize_text(mufaj)
        if mufaj and _normalize_text(mufaj) not in ("all", "osszes", "barmely")
        else None
    )
    target_date_iso, target_weekday = _parse_day_preference(nap)
    target_tod = normalize_time_of_day(napszak)

    active_weights = 0.0
    earned_weights = 0.0
    matched: list[str] = []
    provided_count = 0

    if target_genre is not None:
        provided_count += 1
        active_weights += WEIGHT_GENRE
        if _normalize_text(screening_genre) == target_genre:
            earned_weights += WEIGHT_GENRE
            matched.append("mufaj")

    if target_date_iso is not None or target_weekday is not None:
        provided_count += 1
        active_weights += WEIGHT_DAY
        if target_date_iso is not None:
            day_matches = screening_date_iso == target_date_iso
        else:
            day_matches = screening_weekday == target_weekday
        if day_matches:
            earned_weights += WEIGHT_DAY
            matched.append("nap")

    if target_tod is not None:
        provided_count += 1
        active_weights += WEIGHT_TIME_OF_DAY
        if screening_tod == target_tod:
            earned_weights += WEIGHT_TIME_OF_DAY
            matched.append("napszak")

    if active_weights == 0.0:
        return 100.0, matched, 0

    score = round((earned_weights / active_weights) * 100.0, 1)
    return score, matched, provided_count


def recommend_screenings(
    db_path: str | Path = DEFAULT_DB_PATH,
    *,
    mufaj: str | None = None,
    nap: str | date | int | None = None,
    napszak: str | None = None,
    min_free_seats: int = 1,
    start_date: date | None = None,
    days: int = 7,
    limit: int | None = None,
    strict: bool = False,
) -> list[dict[str, Any]]:
    """Idopontokat ajanl a felhasznalo mufaj, nap es napszak preferenciali alapjan.

    Parameterek:
        db_path: Az SQLite adatbazis fajl utvonala.
        mufaj: Preferalt mufaj (pl. 'Sci-Fi', 'Akcio').
        nap: Preferalt napnev (pl. 'Pentek') vagy datum ('2026-11-27').
        napszak: Preferalt napszak ('DELELOTT', 'DELUTAN', 'ESTE').
        min_free_seats: Minimum szukseges szabad helyek szama.
        start_date: Idoszak kezdonapja (alapertelmezett: mai nap).
        days: Hany napot vizsgaljon (alapertelmezett: 7).
        limit: Opcionalis maximum talalatszam.
        strict: Ha True, csak a teljesen illeszkedo vetiteseket adja vissza.
    """
    if days <= 0:
        raise ValueError("A napok szamanak pozitivnak kell lennie.")
    if min_free_seats < 0:
        raise ValueError("A minimum szabad helyek szama nem lehet negativ.")
    if limit is not None and limit <= 0:
        raise ValueError("A limit ertekenek pozitivnak kell lennie.")

    # Bemenetek elozetes validalasa akkor is, ha ures az adatbazis
    _parse_day_preference(nap)
    normalize_time_of_day(napszak)

    base_date = start_date or date.today()
    end_date = base_date + timedelta(days=days)
    start_iso = f"{base_date.isoformat()}T00:00"
    end_iso = f"{end_date.isoformat()}T00:00"

    query = """
        SELECT
            v.id AS vetites_id,
            f.id AS film_id,
            f.cim,
            f.mufaj,
            f.hossz_perc,
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
        ORDER BY v.kezdes, v.id
    """

    with contextlib.closing(sqlite3.connect(db_path)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.row_factory = sqlite3.Row
        rows = db.execute(query, (start_iso, end_iso)).fetchall()

    results: list[dict[str, Any]] = []
    for row in rows:
        total_seats = int(row["total_seats"])
        booked_seats = int(row["booked_seats"])
        free_seats = max(0, total_seats - booked_seats)
        if free_seats < min_free_seats:
            continue

        kezdes = row["kezdes"]
        score, matched, provided = score_screening_preferences(
            screening_genre=row["mufaj"],
            screening_kezdes=kezdes,
            mufaj=mufaj,
            nap=nap,
            napszak=napszak,
        )

        if strict and len(matched) < provided:
            continue

        dt = datetime.strptime(kezdes, "%Y-%m-%dT%H:%M")
        results.append(
            {
                "vetites_id": row["vetites_id"],
                "film_id": row["film_id"],
                "title": row["cim"],
                "genre": row["mufaj"],
                "duration_min": row["hossz_perc"],
                "terem_id": row["terem_id"],
                "hall": row["terem_nev"],
                "kezdes": kezdes,
                "day": MAGYAR_NAPOK[dt.weekday()],
                "time": kezdes[11:16],
                "time_of_day": get_time_of_day(kezdes),
                "rows": int(row["max_sor"]),
                "cols": int(row["max_szek"]),
                "total_seats": total_seats,
                "free_seats": free_seats,
                "time_score": score,
                "matched_preferences": matched,
                "all_preferences_matched": len(matched) == provided,
            }
        )

    results.sort(
        key=lambda item: (
            -item["time_score"],
            -len(item["matched_preferences"]),
            -item["free_seats"],
            item["kezdes"],
            item["vetites_id"],
        )
    )

    if limit is not None:
        return results[:limit]
    return results
