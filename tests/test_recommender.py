"""Tesztek a 3.3 Ajanlo vegpont - hely + idopont egyutt (Issue #14) modulhoz."""

import http.client
import json
import threading
from datetime import date
from http.server import ThreadingHTTPServer
from urllib.parse import urlencode

import pytest

from backend.create_booking import create_booking
from backend.recommender import recommend_screening_and_seats
from backend.server import create_handler
from db.seed import seed


def test_combined_recommender_returns_contiguous_seats_and_scores(tmp_path):
    """A kombinalt ajanlo egymas melletti szekeket es osszesitett pontszamot ad."""
    db_file = tmp_path / "rec_combo.sqlite"
    start = date(2026, 11, 23)
    seed(db_file, film_count=8, start_date=start, seed_bookings=False, rng_seed=42)

    result = recommend_screening_and_seats(
        db_file,
        group_size=3,
        napszak="ESTE",
        start_date=start,
        days=7,
        limit=5,
    )

    assert result["group_size"] == 3
    assert result["best_recommendation"] is not None
    assert 1 <= len(result["recommendations"]) <= 5

    best = result["best_recommendation"]
    seats = best["recommended_seats"]
    assert len(seats) == 3
    # Mindharom szek ugyanabban a sorban es egymas mellett van
    assert len({s["row"] for s in seats}) == 1
    cols = [s["col"] for s in seats]
    assert cols == [cols[0], cols[0] + 1, cols[0] + 2]
    assert best["combined_score"] == round(
        best["time_score"] * 0.5 + best["seat_score"] * 0.5, 1
    )

    # Az ajanlott szekek kozvetlenul foglalhatok a 2.3 modullal
    booking = create_booking(
        best["vetites_id"],
        [{"row": s["row"], "col": s["col"]} for s in seats],
        "Ajanlott Vendeg",
        db_path=db_file,
    )
    assert len(booking["bookings"]) == 3


def test_combined_recommender_skips_too_large_group(tmp_path):
    """Ha tul nagy a csoport, nincs talalat."""
    db_file = tmp_path / "rec_huge.sqlite"
    start = date(2026, 11, 23)
    seed(db_file, film_count=3, start_date=start, seed_bookings=False, rng_seed=1)

    result = recommend_screening_and_seats(
        db_file, group_size=50, start_date=start, days=7
    )
    assert result["best_recommendation"] is None
    assert result["recommendations"] == []


def test_combined_recommender_invalid_group_size_raises(tmp_path):
    """Nem pozitiv csoportletszam ValueError-t dob."""
    db_file = tmp_path / "rec_err.sqlite"
    seed(db_file, rng_seed=1)

    with pytest.raises(ValueError):
        recommend_screening_and_seats(db_file, group_size=0)


def test_recommendations_http_endpoint_get_and_post(tmp_path):
    """A GET es POST /api/recommendations vegpont helyesen mukodik."""
    db_file = tmp_path / "rec_http.sqlite"
    start = date(2026, 11, 23)
    seed(db_file, film_count=6, start_date=start, rng_seed=42)

    server = ThreadingHTTPServer(("127.0.0.1", 0), create_handler(db_file))
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)

        query = urlencode(
            {
                "group_size": 2,
                "napszak": "ESTE",
                "start_date": "2026-11-23",
                "limit": 3,
            }
        )
        conn.request("GET", f"/api/recommendations?{query}")
        resp = conn.getresponse()
        assert resp.status == 200
        data = json.loads(resp.read())
        assert data["best_recommendation"] is not None
        assert len(data["best_recommendation"]["recommended_seats"]) == 2

        # POST hivas
        post_body = json.dumps(
            {
                "group_size": 4,
                "day": "Péntek",
                "time_of_day": "DELUTAN",
                "start_date": "2026-11-23",
                "limit": 2,
            }
        )
        conn.request(
            "POST",
            "/api/recommendations",
            body=post_body,
            headers={"Content-Type": "application/json"},
        )
        resp = conn.getresponse()
        assert resp.status == 200
        post_data = json.loads(resp.read())
        assert post_data["group_size"] == 4
        assert len(post_data["recommendations"]) <= 2

        # Hibas parameter -> 400 Bad Request
        conn.request("GET", "/api/recommendations?group_size=0")
        resp = conn.getresponse()
        resp.read()
        assert resp.status == 400

        conn.close()
    finally:
        server.shutdown()
        server.server_close()
