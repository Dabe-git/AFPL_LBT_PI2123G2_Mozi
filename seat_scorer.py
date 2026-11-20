"""3.1 Helypontozó algoritmus (Issue #12).

A középhez közelebbi sor/szék jobb; a csoport tagjait egymás mellé ülteti.
Kompatibilis SQLite/SQLAlchemy/ORM adatbázis-modellekkel, FastAPI/Flask
backend API-kkal és frontend JSON-formátummal.
"""

from typing import Any


def calculate_seat_score(
    row: int,
    col: int,
    total_rows: int,
    total_cols: int,
) -> float:
    """Kiszámolja egy adott szék pontszámát 0.0 és 100.0 között.

    Minél közelebb van a sor és a szék a terem közepéhez, annál magasabb
    a pontszám.

    Paraméterek:
        row: Sorindex (0-tól indulva: 0 .. total_rows-1).
        col: Szék/oszlop indexe (0-tól indulva: 0 .. total_cols-1).
        total_rows: A terem összes sorának száma.
        total_cols: Az egy sorban lévő székek száma.
    """
    if total_rows <= 0 or total_cols <= 0:
        return 0.0

    # A terem mértani közepe.
    center_row = (total_rows - 1) / 2.0
    center_col = (total_cols - 1) / 2.0

    # A maximális távolság; ez az 1x1-es teremnél elkerüli a nullával osztást.
    max_row_dist = max(center_row, 1.0)
    max_col_dist = max(center_col, 1.0)

    # Normalizált távolság (0.0 = közép, 1.0 = terem széle).
    row_dist = abs(row - center_row) / max_row_dist
    col_dist = abs(col - center_col) / max_col_dist

    # A sor és a szék középponttól való távolsága egyaránt 50-50%-ot számít.
    distance_penalty = (row_dist * 0.5) + (col_dist * 0.5)
    score = (1.0 - distance_penalty) * 100.0

    return round(max(0.0, score), 2)


def find_best_seats_for_group(
    hall_matrix: list[list[int]],
    group_size: int,
    one_based_output: bool = False,
) -> dict[str, Any] | None:
    """Megkeresi a csoport számára legjobb egymás melletti szabad helyeket.

    Paraméterek:
        hall_matrix: 2D lista, ahol 0 = szabad, 1 = foglalt.
        group_size: Az egymás mellé ülni kívánó személyek száma.
        one_based_output: True esetén a visszatérő sor-/székszámozás 1-től
            indul (frontend-megjelenítéshez).

    Visszatérési érték:
        JSON-barát szótár a legjobb székekkel és az átlagpontszámmal,
        vagy None, ha nincs megfelelő hely.
    """
    if not hall_matrix or not hall_matrix[0] or group_size <= 0:
        return None

    total_rows = len(hall_matrix)
    total_cols = len(hall_matrix[0])

    if group_size > total_cols:
        return None  # A csoport nem fér el egy sorban.

    best_group_coords: list[dict[str, Any]] | None = None
    best_score = -1.0

    for r in range(total_rows):
        for c in range(total_cols - group_size + 1):
            # Ellenőrizzük, hogy a csoport összes egymás melletti széke szabad-e.
            if all(hall_matrix[r][c + i] == 0 for i in range(group_size)):
                seat_scores = [
                    calculate_seat_score(r, c + i, total_rows, total_cols)
                    for i in range(group_size)
                ]
                avg_score = round(sum(seat_scores) / group_size, 2)

                if avg_score > best_score:
                    best_score = avg_score
                    offset = 1 if one_based_output else 0
                    best_group_coords = [
                        {
                            "row": r + offset,
                            "col": c + i + offset,
                            "seat_number": c + i + offset,
                            "score": seat_scores[i],
                        }
                        for i in range(group_size)
                    ]

    if best_group_coords is None:
        return None

    return {
        "group_size": group_size,
        "average_score": best_score,
        "score": best_score,  # Kompatibilitási kulcs.
        "seats": best_group_coords,
        "coordinates": [(seat["row"], seat["col"]) for seat in best_group_coords],
    }


def build_matrix_from_db_records(
    total_rows: int,
    total_cols: int,
    occupied_seats: list[tuple[int, int] | dict[str, int] | Any],
    is_one_based: bool = True,
) -> list[list[int]]:
    """Az adatbázisból kapott foglalt székeket 2D mátrixszá alakítja.

    A mátrixban 0 jelöli a szabad, 1 a foglalt helyet. A függvény az
    adatbázisséma és a helypontozó algoritmus összekötésére szolgál.

    Támogatott ``occupied_seats`` elemformátumok:
        - Tuple/list: (sor, szék), például [(1, 5), (1, 6)].
        - Dict: row/col, sor/szek vagy row_number/seat_number kulcsok.
        - SQLAlchemy/ORM objektum: row/col, sor/szek vagy row_number/
          seat_number attribútumok.
    """
    matrix = [[0 for _ in range(total_cols)] for _ in range(total_rows)]
    offset = 1 if is_one_based else 0

    for item in occupied_seats:
        row, col = None, None
        if isinstance(item, (tuple, list)) and len(item) >= 2:
            row, col = item[0], item[1]
        elif isinstance(item, dict):
            row = item.get("row", item.get("sor", item.get("row_number")))
            col = item.get(
                "col",
                item.get(
                    "seat",
                    item.get("szek", item.get("seat_number")),
                ),
            )
        else:
            # ORM objektum (például SQLAlchemy-modellpéldány).
            row = getattr(
                item,
                "row",
                getattr(item, "sor", getattr(item, "row_number", None)),
            )
            col = getattr(
                item,
                "col",
                getattr(
                    item,
                    "seat",
                    getattr(item, "szek", getattr(item, "seat_number", None)),
                ),
            )

        if row is not None and col is not None:
            row_idx = int(row) - offset
            col_idx = int(col) - offset
            if 0 <= row_idx < total_rows and 0 <= col_idx < total_cols:
                matrix[row_idx][col_idx] = 1

    return matrix


def recommend_seats_from_db(
    total_rows: int,
    total_cols: int,
    occupied_seats: list[Any],
    group_size: int = 1,
    db_is_one_based: bool = True,
) -> dict[str, Any] | None:
    """Backend/DB függvény az ajánlóhoz és az ülésválasztó nézethez.

    Fogadja a terem méreteit és az adatbázisból lekérdezett foglalt helyeket,
    majd visszaadja a frontendnek a legjobb helyeket és a pontozott térképet.
    """
    matrix = build_matrix_from_db_records(
        total_rows,
        total_cols,
        occupied_seats,
        is_one_based=db_is_one_based,
    )
    best_recommendation = find_best_seats_for_group(
        matrix,
        group_size,
        one_based_output=db_is_one_based,
    )

    offset = 1 if db_is_one_based else 0
    full_seat_map = []
    for r in range(total_rows):
        row_list = []
        for c in range(total_cols):
            row_list.append(
                {
                    "row": r + offset,
                    "col": c + offset,
                    "status": "occupied" if matrix[r][c] == 1 else "free",
                    "score": (
                        calculate_seat_score(r, c, total_rows, total_cols)
                        if matrix[r][c] == 0
                        else 0.0
                    ),
                }
            )
        full_seat_map.append(row_list)

    return {
        "success": best_recommendation is not None,
        "recommendation": best_recommendation,
        "seat_map": full_seat_map,
    }


# Gyors önellenőrzés: python seat_scorer.py
if __name__ == "__main__":
    # Példa: 5 soros, 8 székes terem; a 3. sor 4. és 5. széke foglalt.
    foglalt_helyek_db = [{"row": 3, "col": 4}, {"row": 3, "col": 5}]
    eredmeny = recommend_seats_from_db(
        total_rows=5,
        total_cols=8,
        occupied_seats=foglalt_helyek_db,
        group_size=2,
        db_is_one_based=True,
    )
    print("Ajánlott helyek 2 fő részére:", eredmeny["recommendation"])
