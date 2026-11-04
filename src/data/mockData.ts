/**
 * 4.1 Műsor nézet – mock adatok az 1.1-es SQLite-sémához igazítva.
 * A mezőnevek megegyeznek az SQL-oszlopnevekkel.
 */
export type FilmRow = { id: number; cim: string; mufaj: string; hossz_perc: number };
export type TeremRow = { id: number; nev: string };
export type VetitesRow = { id: number; film_id: number; terem_id: number; kezdes: string };

export const films: FilmRow[] = [
  { id: 1, cim: 'A holnap körvonala', mufaj: 'Sci-fi', hossz_perc: 128 },
  { id: 2, cim: 'Az utolsó járat', mufaj: 'Thriller', hossz_perc: 106 },
  { id: 3, cim: 'A csend szigete', mufaj: 'Dráma', hossz_perc: 114 },
  { id: 4, cim: 'Csillagpor nyomában', mufaj: 'Családi', hossz_perc: 94 },
  { id: 5, cim: 'Nulladik protokoll', mufaj: 'Akció', hossz_perc: 121 },
];

export const rooms: TeremRow[] = [
  { id: 1, nev: '1. terem' }, { id: 2, nev: '2. terem' },
  { id: 3, nev: '3. terem' }, { id: 4, nev: '4. terem' },
];

const scheduleByFilm: Record<number, { terem_id: number; dates: Record<string, string[]> }> = {
  1: { terem_id: 1, dates: { '2026-11-04': ['14:20', '17:10', '20:00'], '2026-11-05': ['15:00', '18:20', '21:10'], '2026-11-06': ['14:40', '17:30', '20:20'], '2026-11-07': ['13:50', '16:40', '19:30'], '2026-11-08': ['14:10', '17:00', '19:50'], '2026-11-09': ['16:00', '18:50'] } },
  2: { terem_id: 3, dates: { '2026-11-04': ['16:30', '19:00', '21:20'], '2026-11-05': ['16:10', '18:40', '21:00'], '2026-11-06': ['15:50', '18:20', '20:50'], '2026-11-07': ['15:20', '17:50', '20:20'], '2026-11-08': ['16:00', '18:30', '21:00'], '2026-11-09': ['17:20', '20:00'] } },
  3: { terem_id: 2, dates: { '2026-11-04': ['13:40', '17:40', '20:30'], '2026-11-05': ['14:10', '17:20', '20:10'], '2026-11-06': ['13:30', '16:40', '19:40'], '2026-11-07': ['14:30', '17:40', '20:30'], '2026-11-08': ['13:50', '17:00', '20:00'], '2026-11-09': ['15:10', '18:10'] } },
  4: { terem_id: 4, dates: { '2026-11-04': ['10:30', '13:00', '15:20'], '2026-11-05': ['10:40', '13:10', '15:30'], '2026-11-06': ['10:20', '12:50', '15:10'], '2026-11-07': ['10:00', '12:30', '15:00'], '2026-11-08': ['10:30', '13:00', '15:30'], '2026-11-09': ['11:00', '13:30'] } },
  5: { terem_id: 1, dates: { '2026-11-04': ['15:10', '18:10', '21:00'], '2026-11-05': ['15:30', '18:30', '21:20'], '2026-11-06': ['14:50', '17:50', '20:40'], '2026-11-07': ['14:20', '17:20', '20:10'], '2026-11-08': ['15:00', '18:00', '20:50'], '2026-11-09': ['16:20', '19:20'] } },
};

let nextScreeningId = 1;
export const screenings: VetitesRow[] = films.flatMap((film) => {
  const schedule = scheduleByFilm[film.id];
  return Object.entries(schedule.dates).flatMap(([date, times]) => times.map((time) => ({
    id: nextScreeningId++, film_id: film.id, terem_id: schedule.terem_id, kezdes: `${date}T${time}`,
  })));
});

export const dateOptions = [
  { value: '2026-11-04', day: 'Sze', date: '04', label: 'Ma' },
  { value: '2026-11-05', day: 'Csü', date: '05', label: 'Holnap' },
  { value: '2026-11-06', day: 'Pén', date: '06', label: 'nov.' },
  { value: '2026-11-07', day: 'Szo', date: '07', label: 'nov.' },
  { value: '2026-11-08', day: 'Vas', date: '08', label: 'nov.' },
  { value: '2026-11-09', day: 'Hét', date: '09', label: 'nov.' },
];
