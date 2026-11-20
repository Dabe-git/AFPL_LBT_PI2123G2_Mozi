"""Mozi Foglalasi Backend HTTP API szerver (E2 + E3.3 vegpontok).

Kulso fuggosegek nelkul (stdlib http.server) szolgalja ki a vegpontokat:
  - GET    /api/screenings
  - GET    /api/screenings/<id>/seats
  - POST   /api/reservations
  - DELETE /api/reservations/<id>
  - POST   /api/reservations/<id>/cancel
  - GET    /api/recommendations   (3.3 hely + idopont ajanlo)
  - POST   /api/recommendations   (3.3 hely + idopont ajanlo)

Hasznalat: python -m backend.server [--port 8000]
"""

import argparse
import json
import re
from datetime import date
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from backend.available_seats import ScreeningNotFoundError as SeatsScreeningNotFound
from backend.available_seats import get_available_seats
from backend.cancel_booking import (
    BookingAlreadyCancelledError,
    BookingNotFoundError,
    cancel_booking,
)
from backend.create_booking import (
    InvalidBookingError,
    SeatAlreadyBookedError,
    SeatNotFoundError,
    create_booking,
)
from backend.create_booking import (
    ScreeningNotFoundError as BookingScreeningNotFound,
)
from backend.recommender import recommend_screening_and_seats
from backend.weekly_schedule import get_weekly_schedule
from db.migrate import DEFAULT_DB_PATH
from db.seed import seed

SEATS_ROUTE = re.compile(r"^/api/screenings/(\d+)/seats/?$")
CANCEL_ROUTE = re.compile(r"^/api/reservations/(\d+)(?:/cancel)?/?$")
RECOMMEND_PATHS = (
    "/api/recommendations",
    "/api/recommendations/",
    "/api/recommend",
    "/api/recommend/",
)


def _parse_bool(raw: Any) -> bool:
    if isinstance(raw, bool):
        return raw
    if raw is None:
        return False
    return str(raw).strip().lower() in ("1", "true", "yes", "igen")


def create_handler(db_path: str | Path) -> type[BaseHTTPRequestHandler]:
    """Letrehoz egy HTTP request handlert a megadott SQLite adatbazishoz kotve."""

    class CinemaAPIHandler(BaseHTTPRequestHandler):
        def _send_json(self, status: HTTPStatus, payload: Any) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header(
                "Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"
            )
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            self.wfile.write(body)

        def _read_json_body(self) -> dict[str, Any]:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length > 0 else b"{}"
            data = json.loads(raw.decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("JSON objektum szukseges.")
            return data

        def _handle_recommend(self, params: dict[str, Any]) -> None:
            try:
                group_size = int(
                    params.get(
                        "group_size",
                        params.get("letszam", params.get("seats", 2)),
                    )
                )
                mufaj = params.get("genre", params.get("mufaj"))
                nap = params.get("day", params.get("nap"))
                napszak = params.get("time_of_day", params.get("napszak"))
                start_raw = params.get("start_date")
                start_dt = date.fromisoformat(start_raw) if start_raw else None
                days = int(params.get("days", 7))
                limit = int(params.get("limit", 5))
                strict = _parse_bool(params.get("strict", False))

                result = recommend_screening_and_seats(
                    db_path,
                    group_size=group_size,
                    mufaj=mufaj,
                    nap=nap,
                    napszak=napszak,
                    start_date=start_dt,
                    days=days,
                    limit=limit,
                    strict=strict,
                )
            except ValueError as exc:
                self._send_json(HTTPStatus.BAD_REQUEST, {"detail": str(exc)})
                return
            self._send_json(HTTPStatus.OK, result)

        def do_OPTIONS(self) -> None:  # noqa: N802
            self._send_json(HTTPStatus.NO_CONTENT, {})

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path

            if path in ("/api/screenings", "/api/screenings/"):
                qs = parse_qs(parsed.query)
                mufaj = qs.get("genre", qs.get("mufaj", [None]))[0]
                start_raw = qs.get("start_date", [None])[0]
                start_dt = date.fromisoformat(start_raw) if start_raw else None
                days = int(qs.get("days", ["7"])[0])
                result = get_weekly_schedule(
                    db_path, start_date=start_dt, days=days, mufaj=mufaj
                )
                self._send_json(HTTPStatus.OK, result)
                return

            if path in RECOMMEND_PATHS:
                qs = parse_qs(parsed.query)
                flat_params = {k: v[0] for k, v in qs.items() if v}
                self._handle_recommend(flat_params)
                return

            match = SEATS_ROUTE.match(path)
            if match:
                vetites_id = int(match.group(1))
                try:
                    result = get_available_seats(vetites_id, db_path=db_path)
                except SeatsScreeningNotFound as exc:
                    self._send_json(HTTPStatus.NOT_FOUND, {"detail": str(exc)})
                    return
                self._send_json(HTTPStatus.OK, result)
                return

            self._send_json(HTTPStatus.NOT_FOUND, {"detail": "Vegpont nem talalhato."})

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path

            if path in RECOMMEND_PATHS:
                try:
                    body = self._read_json_body()
                except (ValueError, json.JSONDecodeError) as exc:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"detail": str(exc)})
                    return
                self._handle_recommend(body)
                return

            if path in ("/api/reservations", "/api/reservations/"):
                try:
                    body = self._read_json_body()
                    screening_id = int(
                        body.get("screening_id", body.get("vetites_id", 0))
                    )
                    seats = body.get("seats", [])
                    guest = body.get("customer_name", body.get("vendeg_nev", ""))
                    result = create_booking(screening_id, seats, guest, db_path=db_path)
                except (ValueError, json.JSONDecodeError, InvalidBookingError) as exc:
                    if isinstance(exc, SeatAlreadyBookedError):
                        self._send_json(HTTPStatus.CONFLICT, {"detail": str(exc)})
                    else:
                        self._send_json(HTTPStatus.BAD_REQUEST, {"detail": str(exc)})
                    return
                except (BookingScreeningNotFound, SeatNotFoundError) as exc:
                    self._send_json(HTTPStatus.NOT_FOUND, {"detail": str(exc)})
                    return

                self._send_json(HTTPStatus.CREATED, result)
                return

            match = CANCEL_ROUTE.match(path)
            if match and path.rstrip("/").endswith("/cancel"):
                self._handle_cancel(int(match.group(1)))
                return

            self._send_json(HTTPStatus.NOT_FOUND, {"detail": "Vegpont nem talalhato."})

        def do_DELETE(self) -> None:  # noqa: N802
            match = CANCEL_ROUTE.match(urlparse(self.path).path)
            if match:
                self._handle_cancel(int(match.group(1)))
                return
            self._send_json(HTTPStatus.NOT_FOUND, {"detail": "Vegpont nem talalhato."})

        def _handle_cancel(self, foglalas_id: int) -> None:
            try:
                result = cancel_booking(foglalas_id, db_path=db_path)
            except BookingNotFoundError as exc:
                self._send_json(HTTPStatus.NOT_FOUND, {"detail": str(exc)})
                return
            except BookingAlreadyCancelledError as exc:
                self._send_json(HTTPStatus.CONFLICT, {"detail": str(exc)})
                return
            self._send_json(HTTPStatus.OK, result)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            return

    return CinemaAPIHandler


def run_server(
    host: str = "127.0.0.1",
    port: int = 8000,
    db_path: str | Path = DEFAULT_DB_PATH,
) -> None:
    """Elinditja a lokalis HTTP API szervert."""
    seed(db_path)
    server = ThreadingHTTPServer((host, port), create_handler(db_path))
    print(f"Mozi Backend API fut: http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mozi Foglalasi Backend API szerver.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH))
    cli_args = parser.parse_args()
    run_server(host=cli_args.host, port=cli_args.port, db_path=cli_args.db)
