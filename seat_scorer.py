"""
3.1 Helypontozó algoritmus (Issue #12)
A középhez közelebbi sor/szék jobb, csoport egymás mellé ültetése.
Kompatibilis: Adatbázis modellekkel (SQLite/SQLAlchemy/ORM), Backend API-val (FastAPI/Flask) és Frontend JSON formátummal.
"""

from typing import List, Dict, Any, Optional, Tuple, Union


def calculate_seat_score(row: int, col: int, total_rows: int, total_cols: int) -> float:
    """
    Kiszámolja egy adott szék pontszámát (0.0 - 100.0 között).
    Minél közelebb van a terem közepéhez a sor és a szék, annál magasabb a pontszám.
    
    Paraméterek:
        row (int): Sor indexe (0-tól indulva: 0 .. total_rows-1)
        col (int): Szék/oszlop indexe (0-tól indulva: 0 .. total_cols-1)
        total_rows (int): A terem összes sorának száma
        total_cols (int): Egy sorban lévő székek száma
    """
    if total_rows <= 0 or total_cols <= 0:
        return 0.0

    # Terem mértani közepe
    center_row = (total_rows - 1) / 2.0
    center_col = (total_cols - 1) / 2.0

    # Maximális lehetséges távolság a középponttól (nullával való osztás elkerülése 1x1-es terem esetén)
    max_row_dist = max(center_row, 1.0)
    max_col_dist = max(center_col, 1.0)

    # Normalizált távolság (0.0 = pont középen, 1.0 = terem szélén)
    row_dist = abs(row - center_row) / max_row_dist
    col_dist = abs(col - center_col) / max_col_dist

    # Súlyozás: a sor és a szék középhez való közelsége egyaránt 50-50%-ban számít
    distance_penalty = (row_dist * 0.5) + (col_dist * 0.5)
    score = (1.0 - distance_penalty) * 100.0

    return round(max(0.0, score), 2)


def find_best_seats_for_group(
    hall_matrix: List[List[int]], 
    group_size: int,
    one_based_output: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Megkeresi a legjobb egymás melletti szabad helyeket egy csoport számára 2D mátrix alapján.
    
    Paraméterek:
        hall_matrix: 2D lista, ahol 0 = szabad, 1 = foglalt.
        group_size: Hány fő szeretne egymás mellé ülni.
        one_based_output: Ha True, a visszatérési sor/szék számozás 1-től indul (Frontend megjelenítéshez).
        
    Visszatérési érték:
        JSON-barát szótár (dict) a legjobb székek listájával és az átlagpontszámmal, vagy None.
    """
    if not hall_matrix or not hall_matrix[0] or group_size <= 0:
        return None

    total_rows = len(hall_matrix)
    total_cols = len(hall_matrix[0])

    if group_size > total_cols:
        return None  # A csoport nagyobb, mint amennyi hely egy sorban összesen van

    best_group_coords: Optional[List[Dict[str, Any]]] = None
    best_score: float = -1.0

    for r in range(total_rows):
        for c in range(total_cols - group_size + 1):
            # Ellenőrizzük, hogy a 'group_size' darab egymás melletti szék mind szabad-e (0)
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
                            "score": seat_scores[i]
                        }
                        for i in range(group_size)
                    ]

    if best_group_coords is None:
        return None

    return {
        "group_size": group_size,
        "average_score": best_score,
        "score": best_score,  # Kompatibilitási kulcs
        "seats": best_group_coords,
        "coordinates": [(s["row"], s["col"]) for s in best_group_coords]
    }


def build_matrix_from_db_records(
    total_rows: int,
    total_cols: int,
    occupied_seats: List[Union[Tuple[int, int], Dict[str, int], Any]],
    is_one_based: bool = True
) -> List[List[int]]:
    """
    Segédfüggvény az Adatbázis (1.1 séma / 2.2 szabad helyek lekérdezése) és az algoritmus összekötéséhez.
    Átalakítja az adatbázisból érkező foglalt székek listáját 2D mátrixszá (0 = szabad, 1 = foglalt).
    
    Támogatott 'occupied_seats' elemformátumok:
        - Tuple: (sor, szek) pl. [(1, 5), (1, 6)]
        - Dict: {"row": 1, "col": 5} vagy {"sor": 1, "szek": 5} vagy {"row_number": 1, "seat_number": 5}
        - SQLAlchemy / ORM objektum: obj.row, obj.col vagy obj.sor, obj.szek attribútumokkal
    """
    matrix = [[0 for _ in range(total_cols)] for _ in range(total_rows)]
    offset = 1 if is_one_based else 0

    for item in occupied_seats:
        r, c = None, None
        if isinstance(item, (tuple, list)) and len(item) >= 2:
            r, c = item[0], item[1]
        elif isinstance(item, dict):
            r = item.get("row", item.get("sor", item.get("row_number")))
            c = item.get("col", item.get("seat", item.get("szek", item.get("seat_number"))))
        else:
            # ORM objektum (pl. SQLAlchemy model példány)
            r = getattr(item, "row", getattr(item, "sor", getattr(item, "row_number", None)))
            c = getattr(item, "col", getattr(item, "seat", getattr(item, "szek", getattr(item, "seat_number", None))))

        if r is not None and c is not None:
            r_idx = int(r) - offset
            c_idx = int(c) - offset
            if 0 <= r_idx < total_rows and 0 <= c_idx < total_cols:
                matrix[r_idx][c_idx] = 1

    return matrix


def recommend_seats_from_db(
    total_rows: int,
    total_cols: int,
    occupied_seats: List[Any],
    group_size: int = 1,
    db_is_one_based: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Komplett Backend/DB kiszolgáló függvény (a 3.3 Ajánló végponthoz és a 4.2 Ülésválasztó nézethez).
    Fogadja a terem méreteit és a DB-ből lekérdezett foglalt helyeket, majd visszaadja a Frontendnek
    a legjobb helyeket és a teljes terem pontozott térképét.
    """
    matrix = build_matrix_from_db_records(total_rows, total_cols, occupied_seats, is_one_based=db_is_one_based)
    best_recommendation = find_best_seats_for_group(matrix, group_size, one_based_output=db_is_one_based)

    offset = 1 if db_is_one_based else 0
    full_seat_map = []
    for r in range(total_rows):
        row_list = []
        for c in range(total_cols):
            row_list.append({
                "row": r + offset,
                "col": c + offset,
                "status": "occupied" if matrix[r][c] == 1 else "free",
                "score": calculate_seat_score(r, c, total_rows, total_cols) if matrix[r][c] == 0 else 0.0
            })
        full_seat_map.append(row_list)

    return {
        "success": best_recommendation is not None,
        "recommendation": best_recommendation,
        "seat_map": full_seat_map
    }


# Gyors önellenőrző teszt, ha közvetlenül futtatod a fájlt: python seat_scorer.py
if __name__ == "__main__":
    # Példa: 5 soros, 8 székes moziterem, ahol a középső sor (3. sor) közepén már ülnek (3,4 és 3,5)
    foglalt_helyek_db = [{"row": 3, "col": 4}, {"row": 3, "col": 5}]
    eredmeny = recommend_seats_from_db(
        total_rows=5,
        total_cols=8,
        occupied_seats=foglalt_helyek_db,
        group_size=2,
        db_is_one_based=True
    )
    print("Ajánlott helyek 2 fő részére:", eredmeny["recommendation"])
