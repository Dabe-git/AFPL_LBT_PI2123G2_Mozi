import React, { useState, useEffect, useMemo } from "react";

/**
 * 4.1 Műsor nézet (mock adatokkal) - Issue #16
 * React komponens heti moziműsor megjelenítéséhez, szűréshez és vetítésválasztáshoz.
 * Kompatibilis az 1.1 Adatbázis sémával, a 2.1 Heti műsor lekérdezése backenddel,
 * a 3.2 Időpont-ajánlás preferenciákkal és a 4.2 Ülésválasztó nézettel.
 */

const DAYS = [
  "Összes nap",
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
];

export const MOCK_MOVIES = [
  {
    id: 1,
    title: "Csillagok Háborúja: Az Új Horizont",
    genre: "Sci-Fi",
    duration_min: 142,
    age_rating: "12+",
    description:
      "Egy távoli galaxis peremén maroknyi felfedező olyan ősi jelre bukkan, amely örökre megváltoztatja az emberiség jövőjét.",
    gradient: "linear-gradient(135deg, #1e3a8a 0%, #7e22ce 100%)",
    screenings: [
      { id: 101, day: "Hétfő", time: "14:30", hall: "1. Terem (IMAX)", free_seats: 64, total_seats: 80 },
      { id: 102, day: "Hétfő", time: "19:00", hall: "1. Terem (IMAX)", free_seats: 12, total_seats: 80 },
      { id: 103, day: "Szerda", time: "18:30", hall: "1. Terem (IMAX)", free_seats: 45, total_seats: 80 },
      { id: 104, day: "Péntek", time: "20:15", hall: "1. Terem (IMAX)", free_seats: 8, total_seats: 80 },
      { id: 105, day: "Szombat", time: "16:00", hall: "1. Terem (IMAX)", free_seats: 52, total_seats: 80 },
    ],
  },
  {
    id: 2,
    title: "Budapesti Hajsza",
    genre: "Akció",
    duration_min: 118,
    age_rating: "16+",
    description:
      "Látványos autós üldözések és titkosszolgálati játszmák a Duna mindkét partján, amikor egy nemzetközi küldetés balul sül el.",
    gradient: "linear-gradient(135deg, #991b1b 0%, #d97706 100%)",
    screenings: [
      { id: 201, day: "Kedd", time: "17:00", hall: "2. Terem", free_seats: 38, total_seats: 60 },
      { id: 202, day: "Csütörtök", time: "20:00", hall: "2. Terem", free_seats: 19, total_seats: 60 },
      { id: 203, day: "Péntek", time: "21:00", hall: "2. Terem", free_seats: 5, total_seats: 60 },
      { id: 204, day: "Vasárnap", time: "19:30", hall: "2. Terem", free_seats: 41, total_seats: 60 },
    ],
  },
  {
    id: 3,
    title: "Kódok és Kávék",
    genre: "Vígjáték",
    duration_min: 98,
    age_rating: "12+",
    description:
      "Négy egyetemista 48 órája a határidő előtt: merge konfliktusok, eltűnt adatbázisok és egy felejthetetlen hétvége története.",
    gradient: "linear-gradient(135deg, #065f46 0%, #0284c7 100%)",
    screenings: [
      { id: 301, day: "Hétfő", time: "10:30", hall: "3. Terem (VIP)", free_seats: 28, total_seats: 30 },
      { id: 302, day: "Szerda", time: "15:00", hall: "3. Terem (VIP)", free_seats: 22, total_seats: 30 },
      { id: 303, day: "Szombat", time: "11:00", hall: "3. Terem (VIP)", free_seats: 25, total_seats: 30 },
      { id: 304, day: "Szombat", time: "18:00", hall: "3. Terem (VIP)", free_seats: 9, total_seats: 30 },
    ],
  },
  {
    id: 4,
    title: "Az Utolsó Felvonás",
    genre: "Dráma",
    duration_min: 130,
    age_rating: "16+",
    description:
      "Egy visszavonult zongoraművész és fiatal tanítványa közös felkészülése az évszázad koncertjére.",
    gradient: "linear-gradient(135deg, #3730a3 0%, #be185d 100%)",
    screenings: [
      { id: 401, day: "Kedd", time: "19:30", hall: "3. Terem (VIP)", free_seats: 17, total_seats: 30 },
      { id: 402, day: "Csütörtök", time: "16:30", hall: "2. Terem", free_seats: 49, total_seats: 60 },
      { id: 403, day: "Vasárnap", time: "17:00", hall: "1. Terem (IMAX)", free_seats: 60, total_seats: 80 },
    ],
  },
  {
    id: 5,
    title: "Éjszakai Árnyak",
    genre: "Thriller",
    duration_min: 112,
    age_rating: "18+",
    description:
      "Egy elszigetelt hegyi szállodában hirtelen elmegy az áram, és a vendégek rájönnek, hogy valaki nem az, akinek mondja magát.",
    gradient: "linear-gradient(135deg, #111827 0%, #4b5563 100%)",
    screenings: [
      { id: 501, day: "Szerda", time: "21:15", hall: "2. Terem", free_seats: 33, total_seats: 60 },
      { id: 502, day: "Péntek", time: "22:30", hall: "1. Terem (IMAX)", free_seats: 40, total_seats: 80 },
      { id: 503, day: "Szombat", time: "22:00", hall: "2. Terem", free_seats: 14, total_seats: 60 },
    ],
  },
];

function getTimeOfDayCategory(timeStr) {
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (hour < 12) return "DELELOTT";
  if (hour < 18) return "DELUTAN";
  return "ESTE";
}

export default function MusorNezet({ onSelectScreening }) {
  const [movies, setMovies] = useState(MOCK_MOVIES);
  const [dataSource, setDataSource] = useState("Mock adatok (#16)");
  const [selectedDay, setSelectedDay] = useState("Összes nap");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("ALL");
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState("ALL");
  const [activeBooking, setActiveBooking] = useState(null);

  // Automatikus csatlakozás a Backend API-hoz (2.1 Heti műsor lekérdezése), ha elérhető
  useEffect(() => {
    let isMounted = true;
    fetch("/api/screenings")
      .then((res) => {
        if (!res.ok) throw new Error("Backend nem elérhető");
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setMovies(data);
          setDataSource("Élő Backend API");
        }
      })
      .catch(() => {
        // Hiba esetén marad a beépített MOCK_MOVIES lista
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return movies
      .map((movie) => {
        const matchesTitle = movie.title.toLowerCase().includes(query);
        const matchesGenre = selectedGenre === "ALL" || movie.genre === selectedGenre;
        if (!matchesTitle || !matchesGenre) return null;

        const matchingScreenings = (movie.screenings || []).filter((scr) => {
          const matchesDay = selectedDay === "Összes nap" || scr.day === selectedDay;
          const matchesTod =
            selectedTimeOfDay === "ALL" || getTimeOfDayCategory(scr.time) === selectedTimeOfDay;
          return matchesDay && matchesTod;
        });

        if (matchingScreenings.length === 0) return null;

        return {
          ...movie,
          filteredScreenings: matchingScreenings,
        };
      })
      .filter(Boolean);
  }, [movies, searchQuery, selectedGenre, selectedDay, selectedTimeOfDay]);

  const handleScreeningClick = (movie, screening) => {
    const payload = {
      movieId: movie.id,
      movieTitle: movie.title,
      genre: movie.genre,
      duration_min: movie.duration_min,
      ...screening,
    };
    setActiveBooking(payload);
    try {
      sessionStorage.setItem("selectedScreening", JSON.stringify(payload));
    } catch (e) {
      // sessionStorage nem elérhető
    }
  };

  const handleProceedToSeats = () => {
    if (onSelectScreening && activeBooking) {
      onSelectScreening(activeBooking);
    }
    setActiveBooking(null);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.brand}>
            🎬 AFPL <span style={{ color: "#e11d48" }}>Mozi</span> – Heti Műsor
          </div>
          <div style={styles.badge}>Adatforrás: {dataSource}</div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Szűrő panel */}
        <section style={styles.filterSection}>
          <div style={styles.dayTabs}>
            {DAYS.map((day) => {
              const isActive = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  style={{
                    ...styles.dayBtn,
                    ...(isActive ? styles.dayBtnActive : {}),
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.controlGroup}>
              <label style={styles.label} htmlFor="movie-search">
                Film keresése
              </label>
              <input
                id="movie-search"
                type="text"
                placeholder="Írd be a film címét..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label} htmlFor="genre-select">
                Műfaj
              </label>
              <select
                id="genre-select"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                style={styles.input}
              >
                <option value="ALL">Összes műfaj</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Akció">Akció</option>
                <option value="Vígjáték">Vígjáték</option>
                <option value="Dráma">Dráma</option>
                <option value="Thriller">Thriller</option>
              </select>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label} htmlFor="tod-select">
                Napszak (Preferencia)
              </label>
              <select
                id="tod-select"
                value={selectedTimeOfDay}
                onChange={(e) => setSelectedTimeOfDay(e.target.value)}
                style={styles.input}
              >
                <option value="ALL">Bármely napszak</option>
                <option value="DELELOTT">Délelőtt (08:00 - 11:59)</option>
                <option value="DELUTAN">Délután (12:00 - 17:59)</option>
                <option value="ESTE">Este (18:00 - 23:59)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Filmek és vetítések listája */}
        <section style={styles.moviesList}>
          {filteredMovies.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>Nincs találat a megadott szűrőkkel</h3>
              <p style={{ marginTop: "0.5rem" }}>
                Próbálj más napot, műfajt vagy napszakot választani!
              </p>
            </div>
          ) : (
            filteredMovies.map((movie) => (
              <article key={movie.id} style={styles.movieCard}>
                <div
                  style={{
                    ...styles.poster,
                    background: movie.gradient || "linear-gradient(135deg, #1e3a8a, #7e22ce)",
                  }}
                >
                  <span style={styles.ageBadge}>{movie.age_rating}</span>
                  <div>{movie.title}</div>
                </div>

                <div style={styles.movieContent}>
                  <div>
                    <h2 style={styles.movieTitle}>{movie.title}</h2>
                    <div style={styles.metaRow}>
                      <span style={styles.metaTag}>🎭 {movie.genre}</span>
                      <span style={styles.metaTag}>⏱️ {movie.duration_min} perc</span>
                      <span style={styles.metaTag}>🔞 Korhatár: {movie.age_rating}</span>
                    </div>
                    <p style={styles.description}>{movie.description}</p>
                  </div>

                  <div>
                    <h4 style={styles.screeningsTitle}>
                      Elérhető vetítések (kattints a helyfoglaláshoz):
                    </h4>
                    <div style={styles.screeningsRow}>
                      {movie.filteredScreenings.map((scr) => {
                        const isLow = scr.free_seats <= 15;
                        return (
                          <button
                            key={scr.id}
                            type="button"
                            onClick={() => handleScreeningClick(movie, scr)}
                            style={styles.screeningBtn}
                          >
                            <span style={styles.screeningTime}>{scr.time}</span>
                            <span style={styles.screeningSub}>
                              {scr.day} • {scr.hall}
                            </span>
                            <span
                              style={{
                                ...styles.seatsBadge,
                                color: isLow ? "#f59e0b" : "#10b981",
                              }}
                            >
                              {scr.free_seats} szabad hely
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>

      {/* Vetítés kiválasztása Modal (4.2 Ülésválasztó előkészítés) */}
      {activeBooking && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
              {activeBooking.movieTitle}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              Vetítés kiválasztva helyfoglaláshoz:
            </p>
            <div style={styles.modalInfo}>
              <p>
                <strong>Nap és időpont:</strong> {activeBooking.day}, {activeBooking.time}
              </p>
              <p>
                <strong>Terem:</strong> {activeBooking.hall}
              </p>
              <p>
                <strong>Szabad helyek:</strong> {activeBooking.free_seats} /{" "}
                {activeBooking.total_seats} fő
              </p>
              <p>
                <strong>Vetítés azonosító (screening_id):</strong> #{activeBooking.id}
              </p>
            </div>
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setActiveBooking(null)}
                style={styles.btnSecondary}
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleProceedToSeats}
                style={styles.btnPrimary}
              >
                Tovább az ülésválasztóhoz (4.2)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    paddingBottom: "4rem",
  },
  header: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
    borderBottom: "1px solid #334155",
    padding: "1.25rem 2rem",
  },
  headerContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  brand: {
    fontSize: "1.45rem",
    fontWeight: 800,
  },
  badge: {
    fontSize: "0.8rem",
    padding: "0.35rem 0.75rem",
    borderRadius: "999px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  main: {
    maxWidth: "1200px",
    margin: "2rem auto",
    padding: "0 1.5rem",
  },
  filterSection: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "1.25rem",
    marginBottom: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  dayTabs: {
    display: "flex",
    gap: "0.5rem",
    overflowX: "auto",
    paddingBottom: "0.25rem",
  },
  dayBtn: {
    backgroundColor: "#0f172a",
    color: "#94a3b8",
    border: "1px solid #334155",
    padding: "0.55rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  dayBtnActive: {
    backgroundColor: "#e11d48",
    color: "#ffffff",
    borderColor: "#e11d48",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  label: {
    fontSize: "0.78rem",
    color: "#94a3b8",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "1px solid #334155",
    padding: "0.6rem 0.85rem",
    borderRadius: "8px",
    fontSize: "0.95rem",
  },
  moviesList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  movieCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "14px",
    overflow: "hidden",
    display: "flex",
    flexWrap: "wrap",
  },
  poster: {
    flex: "0 0 210px",
    minHeight: "240px",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    position: "relative",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "1.25rem",
  },
  ageBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: "0.2rem 0.55rem",
    borderRadius: "6px",
    fontSize: "0.78rem",
  },
  movieContent: {
    flex: "1 1 320px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "1rem",
  },
  movieTitle: {
    fontSize: "1.35rem",
    fontWeight: 700,
    marginBottom: "0.4rem",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "0.75rem",
  },
  metaTag: {
    backgroundColor: "#0f172a",
    color: "#94a3b8",
    padding: "0.2rem 0.65rem",
    borderRadius: "6px",
    fontSize: "0.8rem",
    border: "1px solid #334155",
  },
  description: {
    color: "#94a3b8",
    fontSize: "0.95rem",
  },
  screeningsTitle: {
    fontSize: "0.82rem",
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: "0.6rem",
  },
  screeningsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  screeningBtn: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "0.6rem 1rem",
    color: "#f8fafc",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "125px",
  },
  screeningTime: {
    fontSize: "1.08rem",
    fontWeight: 700,
  },
  screeningSub: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    marginTop: "0.15rem",
  },
  seatsBadge: {
    fontSize: "0.72rem",
    marginTop: "0.25rem",
    fontWeight: 600,
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem",
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    border: "1px dashed #334155",
    color: "#94a3b8",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "1rem",
    zIndex: 200,
  },
  modalCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "14px",
    maxWidth: "460px",
    width: "100%",
    padding: "1.6rem",
  },
  modalInfo: {
    backgroundColor: "#0f172a",
    padding: "1rem",
    borderRadius: "8px",
    margin: "1rem 0",
    fontSize: "0.9rem",
    border: "1px solid #334155",
    lineHeight: 1.7,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "1px solid #334155",
    padding: "0.55rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
  btnPrimary: {
    backgroundColor: "#e11d48",
    color: "#ffffff",
    border: "none",
    padding: "0.55rem 1.15rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
};
