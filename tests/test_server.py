"""Integracios teszt a teljes E2 HTTP API szerverhez (2.1-2.4)."""

import http.client
import json
import threading
from datetime import date
from http.server import ThreadingHTTPServer

from backend.server import create_handler
from db.seed import seed


def test_full_booking_flow_over_http(tmp_path):
    """Heti musor -> szabad helyek -> foglalas -> dupla tiltas -> lemondas."""
    db_file = tmp_path / "api_flow.sqlite"
    start = date(2026, 11, 23)
    seed(db_file, film_count=3, start_date=start, seed_bookings=False, rng_seed=42)

    server = ThreadingHTTPServer(("127.0.0.1", 0), create_handler(db_file))
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)

        # 2.1 Heti musor
        conn.request("GET", "/api/screenings?start_date=2026-11-23")
        resp = conn.getresponse()
        assert resp.status == 200
        movies = json.loads(resp.read())
        assert len(movies) > 0
        screening_id = movies[0]["screenings"][0]["id"]

        # 2.2 Szabad helyek
        conn.request("GET", f"/api/screenings/{screening_id}/seats")
        resp = conn.getresponse()
        assert resp.status == 200
        seats_data = json.loads(resp.read())
        assert seats_data["occupied_count"] == 0
        first_seat = seats_data["free"][0]

        # 2.3 Foglalas letrehozasa
        payload = json.dumps(
            {
                "screening_id": screening_id,
                "customer_name": "Kovacs Janos",
                "seats": [{"row": first_seat["row"], "col": first_seat["col"]}],
            }
        )
        conn.request(
            "POST",
            "/api/reservations",
            body=payload,
            headers={"Content-Type": "application/json"},
        )
        resp = conn.getresponse()
        assert resp.status == 201
        created = json.loads(resp.read())
        booking_id = created["bookings"][0]["id"]

        # 2.3 Dupla foglalas -> 409 Conflict
        conn.request(
            "POST",
            "/api/reservations",
            body=payload,
            headers={"Content-Type": "application/json"},
        )
        resp = conn.getresponse()
        resp.read()
        assert resp.status == 409

        # 2.4 Foglalas lemondasa -> 200 OK
        conn.request("DELETE", f"/api/reservations/{booking_id}")
        resp = conn.getresponse()
        assert resp.status == 200
        cancelled = json.loads(resp.read())
        assert cancelled["statusz"] == "lemondva"

        conn.close()
    finally:
        server.shutdown()
        server.server_close()
