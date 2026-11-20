"""Tesztek a 2.1 Heti musor lekerdezese (Issue #8) modulhoz."""

from datetime import date

import pytest

from backend.weekly_schedule import get_weekly_schedule
from db.seed import seed


def test_weekly_schedule_returns_only_seven_day_window(tmp_path):
    """A heti musor csak a megadott 7 napos tartomany vetiteseit adja vissza."""
    db_file = tmp_path / "weekly.sqlite"
    start = date(2026, 11, 23)
    seed(db_file, film_count=6, start_date=start, rng_seed=42)

    movies = get_weekly_schedule(db_file, start_date=start, days=7)
    assert len(movies) > 0

    all_screenings = [s for m in movies for s in m["screenings"]]
    assert len(all_screenings) > 0
    for scr in all_screenings:
        assert "2026-11-23" <= scr["kezdes"][:10] <= "2026-11-29"
        assert scr["total_seats"] == scr["rows"] * scr["cols"]
        assert 0 <= scr["free_seats"] <= scr["total_seats"]


def test_weekly_schedule_genre_filter(tmp_path):
    """A mufaj szuro csak a megadott mufaju filmeket hagyja meg."""
    db_file = tmp_path / "weekly_genre.sqlite"
    start = date(2026, 11, 23)
    seed(db_file, film_count=10, start_date=start, rng_seed=7)

    all_movies = get_weekly_schedule(db_file, start_date=start)
    target_genre = all_movies[0]["genre"]
    filtered = get_weekly_schedule(db_file, start_date=start, mufaj=target_genre)

    assert len(filtered) >= 1
    assert all(m["genre"] == target_genre for m in filtered)


def test_weekly_schedule_invalid_days_raises(tmp_path):
    """Nem pozitiv napszam eseten ValueError dobodik."""
    db_file = tmp_path / "weekly_err.sqlite"
    seed(db_file, rng_seed=1)

    with pytest.raises(ValueError):
        get_weekly_schedule(db_file, days=0)
