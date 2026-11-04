import { useMemo, useState, type ReactNode } from 'react';
import { dateOptions, films, rooms, screenings, type VetitesRow } from './data/mockData';

type IconName = 'search' | 'pin' | 'chevron' | 'down' | 'clock' | 'heart' | 'ticket' | 'sparkle' | 'close' | 'filter';

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    down: <path d="m7 10 5 5 5-5" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    heart: <path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" />,
    ticket: <><path d="M3 8a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" /><path d="M13 4v2m0 4v2m0 4v2" /></>,
    sparkle: <><path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6L12 3Z" /><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    filter: <><path d="M4 6h16M7 12h10m-7 6h4" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const getRoom = (id: number) => rooms.find((room) => room.id === id)!;
const getTime = (value: string) => value.slice(11, 16);
const getDate = (value: string) => value.slice(0, 10);
const formatDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(year, month - 1, day));
};

export default function App() {
  const [selectedDate, setSelectedDate] = useState('2026-11-04');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('Összes műfaj');
  const [sort, setSort] = useState('Kezdési idő szerint');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedScreeningId, setSelectedScreeningId] = useState<number | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedScreening = screenings.find((item) => item.id === selectedScreeningId) ?? null;
  const selectedFilm = selectedScreening ? films.find((film) => film.id === selectedScreening.film_id) ?? null : null;
  const selectedRoom = selectedScreening ? getRoom(selectedScreening.terem_id) : null;

  const visibleFilms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('hu');
    const shownFilms = films.filter((film) => {
      const hasScreening = screenings.some((item) => item.film_id === film.id && getDate(item.kezdes) === selectedDate);
      const matchesQuery = !query || `${film.cim} ${film.mufaj}`.toLocaleLowerCase('hu').includes(query);
      const matchesGenre = genre === 'Összes műfaj' || film.mufaj === genre;
      return hasScreening && matchesQuery && matchesGenre;
    });
    if (sort === 'ABC szerint') return [...shownFilms].sort((a, b) => a.cim.localeCompare(b.cim, 'hu'));
    if (sort === 'Leghosszabb elöl') return [...shownFilms].sort((a, b) => b.hossz_perc - a.hossz_perc);
    return [...shownFilms].sort((a, b) => {
      const aTime = screenings.find((item) => item.film_id === a.id && getDate(item.kezdes) === selectedDate)?.kezdes ?? '';
      const bTime = screenings.find((item) => item.film_id === b.id && getDate(item.kezdes) === selectedDate)?.kezdes ?? '';
      return aTime.localeCompare(bTime);
    });
  }, [genre, search, selectedDate, sort]);

  const totalScreenings = screenings.filter((item) => getDate(item.kezdes) === selectedDate && visibleFilms.some((film) => film.id === item.film_id)).length;
  const selectedDateOption = dateOptions.find((date) => date.value === selectedDate) ?? dateOptions[0];
  const toggleFavorite = (id: number) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const chooseScreening = (screening: VetitesRow) => setSelectedScreeningId(screening.id);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="Vetítő főoldal"><span className="brand-mark"><span /></span><span>VETÍTŐ<span className="brand-dot">.</span></span></a>
          <nav className="main-nav" aria-label="Fő navigáció"><a className="nav-link active" href="#musor">Műsor</a><a className="nav-link" href="#mozink">Mozink</a><a className="nav-link" href="#ajanlo">Helyajánló</a></nav>
          <div className="topbar-actions"><div className="location-button"><Icon name="pin" size={16} /><span><strong>Budapest</strong><small>Corvin mozi</small></span><Icon name="down" size={14} /></div><div className="avatar-button" aria-label="Demo profil">D</div></div>
        </div>
      </header>

      <main id="top" className="page-wrap">
        <div className="breadcrumbs"><span>Főoldal</span><Icon name="chevron" size={13} /><strong>Moziműsor</strong></div>
        <section className="hero-section" id="musor">
          <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> A TE KÖVETKEZŐ FILMÉLMÉNYED</div><h1>Ma este a<br /><em>történeteké</em> a főszerep.</h1><p>Válassz filmet és vetítési időpontot a mozi aktuális műsorából.</p></div>
          <div className="hero-side-note"><div className="hero-side-icon"><Icon name="sparkle" size={19} /></div><div><strong>Jó hely, jobb élmény.</strong><span>A vetítések és a termek adatai az adatbázis mintarekordjaiból jelennek meg.</span></div></div>
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-glow" />
        </section>

        <section className="schedule-section" aria-label="Moziműsor szűrése">
          <div className="section-heading-row"><div><div className="section-kicker">VETÍTÉSEK</div><h2>Aktuális műsor</h2></div><div className="schedule-location"><Icon name="pin" size={15} /><span>Corvin mozi, Budapest</span><span className="open-dot" /><small>Mock műsor</small></div></div>
          <div className="date-strip" role="group" aria-label="Nap kiválasztása"><div className="date-strip-label"><span>NOVEMBER</span><strong>2026</strong></div>{dateOptions.map((date) => <button key={date.value} className={`date-option ${selectedDate === date.value ? 'selected' : ''}`} onClick={() => { setSelectedDate(date.value); setSelectedScreeningId(null); }}><span className="date-day">{date.day}</span><strong>{date.date}</strong><span className="date-label">{date.label}</span></button>)}</div>
          <div className="filter-toolbar">
            <label className="search-field"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Keress filmcímet vagy műfajt..." aria-label="Keresés filmek között" />{search && <button className="clear-search" onClick={() => setSearch('')} aria-label="Keresés törlése"><Icon name="close" size={15} /></button>}</label>
            <div className="filter-toolbar-options"><button className="mobile-filter-button" onClick={() => setMobileFiltersOpen((open) => !open)}><Icon name="filter" size={16} /> {mobileFiltersOpen ? 'Szűrők elrejtése' : 'Szűrők'}</button><div className={`filter-controls ${mobileFiltersOpen ? 'mobile-open' : ''}`}><div className="genre-select-wrap"><Icon name="filter" size={16} /><select value={genre} onChange={(event) => setGenre(event.target.value)} aria-label="Műfaj szűrése"><option>Összes műfaj</option>{[...new Set(films.map((film) => film.mufaj))].map((item) => <option key={item}>{item}</option>)}</select><Icon name="down" size={14} /></div><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Rendezés"><option>Kezdési idő szerint</option><option>ABC szerint</option><option>Leghosszabb elöl</option></select></div></div>
          </div>
          <div className="results-line"><div><strong>{visibleFilms.length} film</strong><span className="result-divider">/</span><span>{totalScreenings} elérhető vetítés</span></div><span className="results-date">{selectedDateOption.day}, 2026. november {selectedDateOption.date}.</span></div>
          <div className="content-layout">
            <div className="movie-list">
              {visibleFilms.length > 0 ? visibleFilms.map((film) => {
                const filmScreenings = screenings.filter((item) => item.film_id === film.id && getDate(item.kezdes) === selectedDate).sort((a, b) => a.kezdes.localeCompare(b.kezdes));
                const isFavorite = favorites.includes(film.id);
                return <article className={`movie-card ${film.id === 1 ? 'featured-card' : ''}`} key={film.id}>
                  <div className={`movie-poster poster-tone-${film.id}`} aria-label={`${film.cim} plakát`}><div className="poster-topline"><span>VETÍTŐ ORIGINAL</span><span>{String(film.id).padStart(2, '0')}</span></div><div className="poster-art"><span className="poster-shape shape-a" /><span className="poster-shape shape-b" /><span className="poster-shape shape-c" /></div><div className="poster-title"><span>{film.mufaj.toUpperCase()}</span><strong>{film.cim}</strong><small>MOZIÉLMÉNY</small></div><div className="poster-bottom"><span>2026</span><span>{film.hossz_perc} MIN</span></div>{film.id === 1 && <span className="poster-exclusive">KIEMELT</span>}</div>
                  <div className="movie-info"><div className="movie-title-row"><div className="movie-title-block"><div className="movie-meta-top"><span>{film.mufaj}</span><i /><span>{film.hossz_perc} perc</span></div><h3>{film.cim}</h3><div className="original-title">Vetítések ezen a napon</div></div><button className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(film.id)} aria-label={isFavorite ? 'Eltávolítás a kedvencekből' : 'Hozzáadás a kedvencekhez'}><Icon name="heart" size={17} /></button></div>
                    <p className="movie-description">Válaszd ki a megfelelő kezdési időpontot. A vetítések teremadatai minden időpontnál megjelennek.</p><div className="movie-details"><span><Icon name="clock" size={14} /> {film.hossz_perc} perc</span><span><Icon name="ticket" size={14} /> {filmScreenings.length} vetítési időpont</span></div>
                    <div className="session-area"><div className="session-heading"><strong>Vetítések</strong><span>Válassz időpontot</span></div><div className="session-times">{filmScreenings.map((vetites) => { const room = getRoom(vetites.terem_id); const isChosen = selectedScreeningId === vetites.id; return <button key={vetites.id} className={`time-chip ${isChosen ? 'chosen' : ''}`} onClick={() => chooseScreening(vetites)}><strong>{getTime(vetites.kezdes)}</strong><span>{room.nev}</span></button>; })}</div></div>
                  </div>
                </article>;
              }) : <div className="empty-state"><div className="empty-icon"><Icon name="search" size={24} /></div><h3>Nem találtunk ilyen filmet</h3><p>Próbálj másik keresőkifejezést vagy válassz egy másik műfajt.</p><button onClick={() => { setSearch(''); setGenre('Összes műfaj'); }}>Szűrők törlése</button></div>}
            </div>

            <aside className="booking-sidebar">
              <div className="booking-card"><div className="booking-card-top"><span className="booking-icon"><Icon name="ticket" size={17} /></span><span className="booking-step">KIVÁLASZTÁS <b>4.1</b></span></div><h3>Találd meg a<br /><em>neked való vetítést.</em></h3>
                {selectedScreening && selectedFilm && selectedRoom ? <div className="selected-session-card"><div className="selected-session-label"><span className="selected-indicator" /> KIVÁLASZTOTT VETÍTÉS</div><strong>{selectedFilm.cim}</strong><div className="selected-session-meta"><span>{formatDate(getDate(selectedScreening.kezdes))}</span><i /><span>{getTime(selectedScreening.kezdes)}</span></div><div className="selected-session-footer"><span>{selectedRoom.nev}</span><strong>{selectedFilm.hossz_perc} perc</strong></div><button className="change-session" onClick={() => setSelectedScreeningId(null)}>Vetítés törlése</button></div> : <p className="booking-empty-copy">Válassz egy filmet és egy időpontot a műsorból. Itt látod majd a kiválasztott vetítés adatait.</p>}
                <div className="booking-note"><Icon name="sparkle" size={15} /><span>A kiválasztott vetítés a teremhez és a filmhez tartozó adatbázis-rekordok alapján jelenik meg.</span></div>
              </div>
              <div className="tip-card" id="ajanlo"><div className="tip-card-icon"><Icon name="sparkle" size={17} /></div><div><strong>Helyajánló</strong><p>A következő lépésben a kiválasztott vetítéshez tartozó terem ülésrendje és a szabad helyek jeleníthetők meg.</p></div></div>
              <div className="help-line"><span className="help-dot" /><span>Mock adatbázis · SQLite-séma szerint</span></div>
            </aside>
          </div>
        </section>
      </main>
      <footer className="page-footer"><span>Absolute Cinema<span>.</span></span><small>MOZIÉLMÉNY · MOZIMŰSOR</small><small>Adatok: mock rekordok az 1.1-es db alapján</small></footer>
    </div>
  );
}
