"""3.3 Ajanlo vegpont logika - hely + idopont egyutt (Issue #14).

Osszekoti a 3.1 helypontozo algoritmust (seat_scorer), a 3.2 idopont-ajanlot
(backend.time_recommender) es a 2.2 szabad hely lekerdezest (backend.available_seats).
"""

from datetime import date
from pathlib import Path
from typing import Any

from backend.available_seats import get_available_seats
from backend.time_recommender import recommend_screenings
from db.migrate import DEFAULT_DB_PATH
from seat_scorer import calculate_seat_score

TIME_SCORE_WEIGHT = 0.5
SEAT_SCORE_WEIGHT = 0.5


def _find_best_contiguous_group(
    free_seats: list[dict[str, int]],
    total_rows: int,
    total_cols: int,
    group_size: int,
) -> tuple[list[dict[str, Any]], float] | None:
    """Megkeresi a legmagasabb atlagpontszamu egymas melletti szabad szekeket.

    A 3.1-es seat_scorer.calculate_seat_score fuggvenyt hasznalja minden szekre.
    """
    if group_size <= 0 or group_size > total_cols or total_rows <= 0:
        return None

    free_by_coord: dict[tuple[int, int], int] = {
        (seat["row"], seat["col"]): seat["id"] for seat in free_seats
    }

    best_seats: list[dict[str, Any]] | None = None
    best_avg = -1.0

    for r_idx in range(total_rows):
        row_num = r_idx + 1
        for c_idx in range(total_cols - group_size + 1):
            candidate: list[dict[str, Any]] = []
            score_sum = 0.0
            all_free = True

            for offset in range(group_size):
                col_num = c_idx + offset + 1
                ules_id = free_by_coord.get((row_num, col_num))
                if ules_id is None:
                    all_free = False
                    break
                seat_score = float(
                    calculate_seat_score(r_idx, c_idx + offset, total_rows, total_cols)
                )
                score_sum += seat_score
                candidate.append(
                    {
                        "id": ules_id,
                        "row": row_num,
                        "col": col_num,
                        "score": seat_score,
                    }
                )

            if all_free:
                avg_score = round(score_sum / group_size, 1)
                if avg_score > best_avg:
                    best_avg = avg_score
                    best_seats = candidate

    if best_seats is None:
        return None
    return best_seats, best_avg


def recommend_screening_and_seats(
    db_path: str | Path = DEFAULT_DB_PATH,
    *,
    group_size: int = 2,
    mufaj: str | None = None,
    nap: str | date | int | None = None,
    napszak: str | None = None,
    start_date: date | None = None,
    days: int = 7,
    limit: int = 5,
    strict: bool = False,
) -> dict[str, Any]:
    """Kombinált ajanlas: megkeresi a legjobb vetites + egymas melletti ules parokat.

    A kombinalt pontszam 50%-ban az idopont preferencia-illeszkedesbol (3.2),
    50%-ban a legjobb egymas melletti helyek pontszamabol (3.1) all ossze.
    """
    if group_size <= 0:
        raise ValueError("A csoport letszamanak pozitivnak kell lennie.")
    if limit <= 0:
        raise ValueError("A limit ertekenek pozitivnak kell lennie.")

    candidates = recommend_screenings(
        db_path,
        mufaj=mufaj,
        nap=nap,
        napszak=napszak,
        min_free_seats=group_size,
        start_date=start_date,
        days=days,
        strict=strict,
    )

    recommendations: list[dict[str, Any]] = []
    for item in candidates:
        seat_info = get_available_seats(item["vetites_id"], db_path=db_path)
        group_result = _find_best_contiguous_group(
            seat_info["free"],
            seat_info["rows"],
            seat_info["cols"],
            group_size,
        )
        if group_result is None:
            continue

        best_seats, seat_avg_score = group_result
        combined_score = round(
            item["time_score"] * TIME_SCORE_WEIGHT + seat_avg_score * SEAT_SCORE_WEIGHT,
            1,
        )

        recommendations.append(
            {
                **item,
                "seat_score": seat_avg_score,
                "combined_score": combined_score,
                "recommended_seats": best_seats,
            }
        )

    recommendations.sort(
        key=lambda rec: (
            -rec["combined_score"],
            -rec["time_score"],
            -rec["seat_score"],
            rec["kezdes"],
            rec["vetites_id"],
        )
    )

    top_items = recommendations[:limit]
    return {
        "group_size": group_size,
        "preferences": {
            "mufaj": mufaj,
            "nap": nap.isoformat() if isinstance(nap, date) else nap,
            "napszak": napszak,
            "strict": strict,
        },
        "total_candidates": len(recommendations),
        "best_recommendation": top_items[0] if top_items else None,
        "recommendations": top_items,
    }
