# AFPL_LBT_PI2123G2_Mozi

[![Build](https://github.com/Dabe-git/AFPL_LBT_PI2123G2_Mozi/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/Dabe-git/AFPL_LBT_PI2123G2_Mozi/actions/workflows/build.yml)

Mozi foglalási rendszer egy agilis (Scrum) szoftverfejlesztési beadandóhoz. A cél a heti műsor böngészése, helyek foglalása és lemondása, valamint hely- és időpontajánlás. Jelenleg az adatbázis-séma és a migráció készült el, a többi funkció a Product Backlogban szerepel.

## Indítás

A projekt Python 3.14-gyel készül és a CI is ezt használja.

```sh
pip install -r requirements-dev.txt
python db/migrate.py
pytest
```

## Dokumentáció

- [Adatbázis-séma és migráció](docs/database-schema.md)
- [CI pipeline](docs/ci.md)
