"""Tesztek a 3.2 Idopont-ajanlas preferencia alapjan (Issue #13) modulhoz."""

from datetime import date

import pytest

from backend.time_recommender import (
    get_time_of_day,
    recommend_screenings,
    score_screening_preferences,
)
from db.seed import seed


def test_get_time_of_day_categories():
    """A napszak kategoriak helyesen kulonulnek el."""
    assert get_time_of_day("10:30") == "DELELOTT"
    assert get_time_of_day("2026-11-23T11:59") == "DELELOTT"
    assert get_time_of_day("12:00") == "DELUTAN"
    assert get_time_of_day("2026-11-23T17:45") == "DELUTAN"
    assert get_time_of_day("18:00") == "ESTE"
    assert get_time_of_day("2026-11-23T21:15") == "ESTE"


def test_score_screening_preferences_full_and_partial():
    """Pontos illeszkedes 100 pontot ad, reszleges illeszkedes aranyosan pontoz."""
    score_full, matched_full, count_full = score_screening_preferences(
        screening_genre="Akció",
        screening_kezdes="2026-11-27T19:30",
        mufaj="akcio",
        nap="Pentek",
        napszak="este",
    )
    assert score_full == 100.0
    assert matched_full == ["mufaj", "nap", "napszak"]
    assert count_full == 3

    score_partial, matched_partial, count_partial = score_screening_preferences(
        screening_genre="Sci-Fi",
        screening_kezdes="2026-11-27T10:30",
        mufaj="Sci-Fi",
        nap="Péntek",
        napszak="ESTE",
    )
    assert score_partial == 75.0
    assert matched_partial == ["mufaj", "nap"]
    assert count_partial == 3


def test_recommend_screenings_ranks_matching_preferences_first(tmp_path):
    """A preferenciaknak megfelelo vetitesek a lista elejere kerulnek."""
    db_file = tmp_path / "time_rec.sqlite"
    start = date(2026, 11, 23)  # Hetfo
    seed(db_file, film_count=10, start_date=start, rng_seed=42)

    all_items = recommend_screenings(db_file, start_date=start, days=7)
    assert len(all_items) > 0

    sample = all_items[0]
    ranked = recommend_screenings(
        db_file,
        mufaj=sample["genre"],
        nap=sample["day"],
        napszak=sample["time_of_day"],
        start_date=start,
        days=7,
    )

    assert len(ranked) > 0
    assert ranked[0]["time_score"] == 100.0
    assert ranked[0]["all_preferences_matched"] is True
    assert ranked[0]["genre"] == sample["genre"]
    assert ranked[0]["day"] == sample["day"]
    assert ranked[0]["time_of_day"] == sample["time_of_day"]


def test_recommend_screenings_strict_mode_and_limit(tmp_path):
    """Strict modban csak a teljes talalatok maradnak, a limit korlatozza a szamukat."""
    db_file = tmp_path / "time_strict.sqlite"
    start = date(2026, 11, 23)
    seed(db_file, film_count=8, start_date=start, rng_seed=7)

    strict_evening = recommend_screenings(
        db_file,
        napszak="ESTE",
        start_date=start,
        days=7,
        limit=3,
        strict=True,
    )
    assert 1 <= len(strict_evening) <= 3
    assert all(item["time_of_day"] == "ESTE" for item in strict_evening)

    no_match = recommend_screenings(
        db_file,
        mufaj="NemLetezoMufaj",
        start_date=start,
        days=7,
        strict=True,
    )
    assert no_match == []


def test_recommend_screenings_invalid_inputs_raise(tmp_path):
    """Ervenytelen napszak, nap vagy limit ValueError-t dob."""
    db_file = tmp_path / "time_err.sqlite"
    seed(db_file, rng_seed=1)

    with pytest.raises(ValueError):
        recommend_screenings(db_file, napszak="hajnal")

    with pytest.raises(ValueError):
        recommend_screenings(db_file, nap="NincsIlyenNap")

    with pytest.raises(ValueError):
        recommend_screenings(db_file, limit=0)
