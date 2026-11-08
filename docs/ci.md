# CI pipeline

Ticket: #19 (5.1 CI pipeline)
Megvalósítás: [`.github/workflows/build.yml`](../.github/workflows/build.yml)

A pipeline minden push és Pull Request esetén lefut, bármelyik lépés hibája esetén a teljes futás sikertelen.

| Lépés | Parancs | Mit ellenőriz |
|---|---|---|
| Linting | `ruff check .` | Hibák, nem használt importok, importok sorrendje, túl hosszú sorok |
| Formatting | `ruff format --check .` | Behúzás, felesleges szóközök, sortörések (88 karakteres sorhossz) |
| Automated Tests | `pytest` | A `tests` mappa összes tesztje |

Egy Pull Request ágán a pipeline kétszer fut le: egyszer a push, egyszer a Pull Request miatt.

## Helyi futtatás

```sh
pip install -r requirements-dev.txt
ruff check .
ruff format --check .
pytest
```

A formázási hibákat a `ruff format .` parancs javítja, a Ruff és a pytest verziója a `requirements-dev.txt` fájlban van rögzítve.
