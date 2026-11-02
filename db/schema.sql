-- Mozi foglalási rendszer – adatbázis-séma (SQLite)
-- Ticket: #4 (1.1 Adatbázis-séma megtervezése)

-- Az SQLite kapcsolatonként kapcsolja be az idegen kulcsok ellenőrzését,
-- ezért az alkalmazásnak minden új kapcsolatnál futtatnia kell ezt a parancsot.
PRAGMA foreign_keys = ON;

CREATE TABLE film (
    id         INTEGER PRIMARY KEY,
    cim        TEXT    NOT NULL,
    mufaj      TEXT    NOT NULL,
    hossz_perc INTEGER NOT NULL CHECK (hossz_perc > 0)
) STRICT;

CREATE TABLE terem (
    id  INTEGER PRIMARY KEY,
    nev TEXT    NOT NULL UNIQUE
) STRICT;

CREATE TABLE ules (
    id       INTEGER PRIMARY KEY,
    terem_id INTEGER NOT NULL REFERENCES terem (id),
    sor      INTEGER NOT NULL CHECK (sor > 0),
    szek     INTEGER NOT NULL CHECK (szek > 0),
    UNIQUE (terem_id, sor, szek),
    -- A foglalas tábla összetett idegen kulcsának célja.
    UNIQUE (id, terem_id)
) STRICT;

CREATE TABLE vetites (
    id       INTEGER PRIMARY KEY,
    film_id  INTEGER NOT NULL REFERENCES film (id),
    terem_id INTEGER NOT NULL REFERENCES terem (id),
    -- Formátum: ÉÉÉÉ-HH-NNTÓÓ:PP, így a szövegként tárolt időpontok is
    -- helyesen rendezhetők és szűrhetők (pl. heti műsor).
    -- Érvénytelen dátumra a strftime NULL-t ad, az = pedig így átengedné,
    -- ezért itt IS szerepel.
    kezdes   TEXT    NOT NULL CHECK (kezdes IS strftime('%Y-%m-%dT%H:%M', kezdes)),
    UNIQUE (terem_id, kezdes),
    -- A foglalas tábla összetett idegen kulcsának célja.
    UNIQUE (id, terem_id)
) STRICT;

CREATE INDEX idx_vetites_kezdes ON vetites (kezdes);

-- Egy sor egy foglalt ülést jelent, a csoportos foglalás több sorból áll.
CREATE TABLE foglalas (
    id         INTEGER PRIMARY KEY,
    vetites_id INTEGER NOT NULL,
    -- A két összetett idegen kulcs közös terem_id oszlopa garantálja,
    -- hogy az ülés abban a teremben van, ahol a vetítés zajlik.
    terem_id   INTEGER NOT NULL,
    ules_id    INTEGER NOT NULL,
    vendeg_nev TEXT    NOT NULL,
    statusz    TEXT    NOT NULL DEFAULT 'aktiv' CHECK (statusz IN ('aktiv', 'lemondva')),
    letrehozva TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M', 'now')),
    FOREIGN KEY (vetites_id, terem_id) REFERENCES vetites (id, terem_id),
    FOREIGN KEY (ules_id, terem_id) REFERENCES ules (id, terem_id)
) STRICT;

-- Dupla foglalás tiltása: egy ülésre vetítésenként csak egy aktív foglalás
-- lehet. A lemondott foglalás megmarad, az ülés pedig újra foglalható.
CREATE UNIQUE INDEX uq_foglalas_aktiv_ules
    ON foglalas (vetites_id, ules_id)
    WHERE statusz = 'aktiv';
