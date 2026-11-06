import React, { useState, useEffect, useMemo } from "react";

/**
 * 4.2 Ülésválasztó nézet (mock adatokkal) - Issue #17
 * React komponens interaktív moziterem térképpel, helypontozó (3.1) algoritmussal,
 * automatikus csoport-ajánlással és foglalás-véglegesítéssel (2.3 kompatibilis).
 */

const DEFAULT_SCREENING = {
  id: 101,
  movieTitle: "Csillagok Háborúja: Az Új Horizont",
  genre: "Sci-Fi",
  day: "Hétfő",
  time: "19:00",
  hall: "1. Terem (IMAX)",
  rows: 8,
  cols: 12,
  ticketPrice: 2800,
};

// Mock foglalt székek (1-től induló sor és szék számozás)
const MOCK_OCCUPIED_SEATS = [
  { row: 3, col: 6 },
  { row: 3, col: 7 },
  { row: 4, col: 5 },
  { row: 4, col: 6 },
  { row: 4, col: 7 },
  { row: 4, col: 8 },
  { row: 5, col: 4 },
  { row: 5, col: 5 },
  { row: 6, col: 9 },
  { row: 6, col: 10 },
  { row: 2, col: 3 },
  { row: 7, col: 6 },
  { row: 7, col: 7 },
];

/**
 * 3.1 Helypontozó algoritmus (kliensoldali segédfüggvény)
 * Minél közelebb van a szék a terem közepéhez, annál magasabb a pontszám (0 - 100).
 */
export function calculateSeatScore(rowIdx, colIdx, totalRows, totalCols) {
  if (totalRows <= 0 || totalCols <= 0) return 0;
  const centerRow = (totalRows - 1) / 2.0;
  const centerCol = (totalCols - 1) / 2.0;
  const maxRowDist = Math.max(centerRow, 1.0);
  const maxColDist = Math.max(centerCol, 1.0);

  const rowDist = Math.abs(rowIdx - centerRow) / maxRowDist;
  const colDist = Math.abs(colIdx - centerCol) / maxColDist;

  const penalty = rowDist * 0.5 + colDist * 0.5;
  return Math.round(Math.max(0, (1.0 - penalty) * 100) * 10) / 10;
}

/**
 * Megkeresi a legmagasabb átlagpontszámú, egymás melletti szabad helyeket a csoportnak.
 */
export function findBestGroupSeats(occupiedSet, totalRows, totalCols, groupSize) {
  if (groupSize <= 0 || groupSize > totalCols) return [];

  let bestSeats = [];
  let bestAvgScore = -1;

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c <= totalCols - groupSize; c++) {
      let allFree = true;
      let sumScore = 0;
      const candidate = [];

      for (let i = 0; i < groupSize; i++) {
        const rowNum = r + 1;
        const colNum = c + i + 1;
        const key = `${rowNum}-${colNum}`;
        if (occupiedSet.has(key)) {
          allFree = false;
          break;
        }
        const score = calculateSeatScore(r, c + i, totalRows, totalCols);
        sumScore += score;
        candidate.push({ row: rowNum, col: colNum, key, score });
      }

      if (allFree) {
        const avg = sumScore / groupSize;
        if (avg > bestAvgScore) {
          bestAvgScore = avg;
          bestSeats = candidate;
        }
      }
    }
  }

  return bestSeats;
}

export default function UlesvalasztoNezet({ screeningProp, onBack }) {
  const [screening, setScreening] = useState(screeningProp || DEFAULT_SCREENING);
  const [occupiedKeys, setOccupiedKeys] = useState(() => {
    const set = new Set();
    MOCK_OCCUPIED_SEATS.forEach((s) => set.add(`${s.row}-${s.col}`));
    return set;
  });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [groupSize, setGroupSize] = useState(2);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingMessage, setBookingMessage] = useState(null);
  const [dataSource, setDataSource] = useState("Mock adatok (#17)");

  const totalRows = screening.rows || 8;
  const totalCols = screening.cols || 12;
  const ticketPrice = screening.ticketPrice || 2800;

  // Ha a 4.1 Műsor nézetből érkezett kiválasztott vetítés sessionStorage-ban, betöltjük
  useEffect(() => {
    if (!screeningProp) {
      try {
        const saved = sessionStorage.getItem("selectedScreening");
        if (saved) {
          const parsed = JSON.parse(saved);
          setScreening((prev) => ({
            ...prev,
            ...parsed,
            rows: parsed.rows || 8,
            cols: parsed.cols || 12,
          }));
        }
      } catch (e) {
        // sessionStorage nem elérhető
      }
    }
  }, [screeningProp]);

  // Próbálkozás a Backend API-val (2.2 Szabad helyek lekérdezése), ha fut a szerver
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/screenings/${screening.id}/seats`)
      .then((res) => {
        if (!res.ok) throw new Error("Backend nem elérhető");
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data.occupied)) {
          const newSet = new Set();
          data.occupied.forEach((s) => newSet.add(`${s.row}-${s.col}`));
          setOccupiedKeys(newSet);
          setDataSource("Élő Backend API");
        }
      })
      .catch(() => {
        // Hiba esetén maradnak a beépített mock foglalt székek
      });
    return () => {
      isMounted = false;
    };
  }, [screening.id]);

  // Ajánlott székek automatikus kiszámítása a 3.1 algoritmussal
  const recommendedSeats = useMemo(() => {
    return findBestGroupSeats(occupiedKeys, totalRows, totalCols, groupSize);
  }, [occupiedKeys, totalRows, totalCols, groupSize]);

  const handleApplyRecommendation = () => {
    setBookingMessage(null);
    setSelectedSeats(recommendedSeats);
  };

  const toggleSeat = (rowNum, colNum, score) => {
    const key = `${rowNum}-${colNum}`;
    if (occupiedKeys.has(key)) return; // Foglalt szék nem választható (2.3 dupla foglalás tiltása)

    setBookingMessage(null);
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) {
        return prev.filter((s) => s.key !== key);
      }
      return [...prev, { row: rowNum, col: colNum, key, score }];
    });
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (selectedSeats.length === 0) return;

    const payload = {
      screening_id: screening.id,
      customer_name: customerName.trim() || "Vendég Felhasználó",
      customer_email: customerEmail.trim() || "vendeg@example.com",
      seats: selectedSeats.map((s) => ({ row: s.row, col: s.col })),
    };

    try {
      await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Lokális mock mentés
    }

    // Beállítjuk a kiválasztott székeket foglaltnak (dupla foglalás azonnali tiltása)
    setOccupiedKeys((prev) => {
      const next = new Set(prev);
      selectedSeats.forEach((s) => next.add(s.key));
      return next;
    });

    const bookedList = selectedSeats
      .map((s) => `${s.row}. sor ${s.col}. szék`)
      .join(", ");

    setBookingMessage({
      type: "success",
      text: `Sikeres foglalás (${selectedSeats.length} db jegy): ${bookedList}!`,
    });
    setSelectedSeats([]);
  };

  const totalScoreAvg = useMemo(() => {
    if (selectedSeats.length === 0) return 0;
    const sum = selectedSeats.reduce((acc, s) => acc + s.score, 0);
    return (sum / selectedSeats.length).toFixed(1);
  }, [selectedSeats]);

  const freeSeatsCount = totalRows * totalCols - occupiedKeys.size;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.brand}>
            🎟️ AFPL <span style={{ color: "#e11d48" }}>Mozi</span> – Ülésválasztó (4.2)
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {onBack && (
              <button type="button" onClick={onBack} style={styles.btnSecondary}>
                ← Vissza a műsorhoz
              </button>
            )}
            <div style={styles.badge}>Adatforrás: {dataSource}</div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Vetítés információs sáv és Okos Helyajánló (3.1 integráció) */}
        <section style={styles.topPanel}>
          <div>
            <h1 style={styles.movieTitle}>{screening.movieTitle}</h1>
            <div style={styles.metaRow}>
              <span style={styles.metaTag}>📅 {screening.day}, {screening.time}</span>
              <span style={styles.metaTag}>🏛️ {screening.hall}</span>
              <span style={styles.metaTag}>🪑 Szabad helyek: {freeSeatsCount} / {totalRows * totalCols}</span>
            </div>
          </div>

          <div style={styles.recommenderBox}>
            <div style={styles.controlGroup}>
              <label style={styles.label} htmlFor="group-size-select">
                Csoport létszáma (3.1 Ajánló):
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  id="group-size-select"
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                  style={styles.select}
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                      {num} fő egymás mellé
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleApplyRecommendation}
                  disabled={recommendedSeats.length === 0}
                  style={styles.btnRecommend}
                >
                  ✨ Legjobb helyek kijelölése
                </button>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                  />
                  Pontszámok (3.1) mutatása
                </label>
              </div>
            </div>
          </div>
        </section>

        <div style={styles.contentGrid}>
          {/* Moziterem nézet */}
          <section style={styles.hallCard}>
            {/* Mozivászon */}
            <div style={styles.screenContainer}>
              <div style={styles.screenCurve}>MOZIVÁSZON</div>
            </div>

            {/* Jelmagyarázat */}
            <div style={styles.legendRow}>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                Szabad
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#e11d48" }} />
                Kiválasztott
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#0f172a", border: "2px dashed #10b981" }} />
                Ajánlott (3.1)
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#334155", opacity: 0.45 }} />
                Foglalt
              </div>
            </div>

            {/* Székek mátrixa */}
            <div style={styles.rowsContainer}>
              {Array.from({ length: totalRows }).map((_, rIdx) => {
                const rowNum = rIdx + 1;
                return (
                  <div key={rowNum} style={styles.seatRow}>
                    <div style={styles.rowLabel}>{rowNum}. sor</div>
                    <div style={styles.seatsInRow}>
                      {Array.from({ length: totalCols }).map((__, cIdx) => {
                        const colNum = cIdx + 1;
                        const key = `${rowNum}-${colNum}`;
                        const isOccupied = occupiedKeys.has(key);
                        const isSelected = selectedSeats.some((s) => s.key === key);
                        const isRecommended = recommendedSeats.some((s) => s.key === key);
                        const score = calculateSeatScore(rIdx, cIdx, totalRows, totalCols);

                        let seatBg = "#1e293b";
                        let borderStyle = "1px solid #475569";
                        if (isOccupied) {
                          seatBg = "#334155";
                          borderStyle = "1px solid #1e293b";
                        } else if (isSelected) {
                          seatBg = "#e11d48";
                          borderStyle = "2px solid #fda4af";
                        } else if (isRecommended) {
                          borderStyle = "2px dashed #10b981";
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={isOccupied}
                            onClick={() => toggleSeat(rowNum, colNum, score)}
                            title={`${rowNum}. sor ${colNum}. szék | Pontszám: ${score}`}
                            style={{
                              ...styles.seatBtn,
                              backgroundColor: seatBg,
                              border: borderStyle,
                              opacity: isOccupied ? 0.4 : 1,
                              cursor: isOccupied ? "not-allowed" : "pointer",
                            }}
                          >
                            <span style={styles.seatNumber}>{colNum}</span>
                            {showHeatmap && !isOccupied && (
                              <span style={styles.seatScore}>{Math.round(score)}p</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Összesítő és Foglalás panel */}
          <aside style={styles.summaryCard}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              Foglalás összesítése
            </h2>

            {bookingMessage && (
              <div style={styles.successBanner}>{bookingMessage.text}</div>
            )}

            {selectedSeats.length === 0 ? (
              <div style={styles.emptySelection}>
                Kattints a szabad székekre a teremben, vagy használd a{" "}
                <strong>Legjobb helyek kijelölése</strong> gombot!
              </div>
            ) : (
              <>
                <div style={styles.selectedList}>
                  {selectedSeats.map((s) => (
                    <div key={s.key} style={styles.selectedSeatChip}>
                      <span>
                        <strong>{s.row}. sor, {s.col}. szék</strong>
                      </span>
                      <span style={{ color: "#10b981", fontSize: "0.8rem" }}>
                        {s.score} pont
                      </span>
                    </div>
                  ))}
                </div>

                <div style={styles.priceBox}>
                  <div style={styles.priceRow}>
                    <span>Kiválasztott jegyek:</span>
                    <strong>{selectedSeats.length} db</strong>
                  </div>
                  <div style={styles.priceRow}>
                    <span>Helyek átlagpontszáma:</span>
                    <strong style={{ color: "#10b981" }}>{totalScoreAvg} / 100</strong>
                  </div>
                  <div style={{ ...styles.priceRow, fontSize: "1.1rem", marginTop: "0.5rem" }}>
                    <span>Fizetendő összesen:</span>
                    <strong style={{ color: "#e11d48" }}>
                      {(selectedSeats.length * ticketPrice).toLocaleString("hu-HU")} Ft
                    </strong>
                  </div>
                </div>

                <form onSubmit={handleConfirmBooking} style={styles.form}>
                  <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="cust-name">
                      Név
                    </label>
                    <input
                      id="cust-name"
                      type="text"
                      required
                      placeholder="Pl. Kovács János"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="cust-email">
                      E-mail cím
                    </label>
                    <input
                      id="cust-email"
                      type="email"
                      required
                      placeholder="pelda@email.hu"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <button type="submit" style={styles.btnPrimary}>
                    Foglalás véglegesítése ({selectedSeats.length} hely)
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    paddingBottom: "3rem",
  },
  header: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
    borderBottom: "1px solid #334155",
    padding: "1.2rem 2rem",
  },
  headerContainer: {
    maxWidth: "1240px",
    margin: "0 auto",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  brand: {
    fontSize: "1.4rem",
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
    maxWidth: "1240px",
    margin: "1.75rem auto",
    padding: "0 1.5rem",
  },
  topPanel: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "1.25rem 1.5rem",
    marginBottom: "1.5rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1.25rem",
  },
  movieTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    marginBottom: "0.45rem",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  metaTag: {
    backgroundColor: "#0f172a",
    color: "#94a3b8",
    padding: "0.25rem 0.7rem",
    borderRadius: "6px",
    fontSize: "0.82rem",
    border: "1px solid #334155",
  },
  recommenderBox: {
    backgroundColor: "#0f172a",
    padding: "0.85rem 1.1rem",
    borderRadius: "10px",
    border: "1px solid #334155",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  label: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  select: {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    border: "1px solid #475569",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
  },
  btnRecommend: {
    backgroundColor: "#10b981",
    color: "#052e16",
    border: "none",
    padding: "0.55rem 0.95rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.88rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.85rem",
    color: "#cbd5e1",
    cursor: "pointer",
    marginLeft: "0.5rem",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: "1.5rem",
    alignItems: "start",
  },
  hallCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "14px",
    padding: "1.75rem 1.25rem",
    overflowX: "auto",
  },
  screenContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "1.75rem",
  },
  screenCurve: {
    width: "80%",
    maxWidth: "520px",
    textAlign: "center",
    padding: "0.45rem",
    background: "linear-gradient(180deg, rgba(225,29,72,0.35) 0%, rgba(15,23,42,0) 100%)",
    borderTop: "4px solid #e11d48",
    borderRadius: "50% 50% 0 0 / 18px 18px 0 0",
    color: "#94a3b8",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "3px",
  },
  legendRow: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "1.25rem",
    marginBottom: "1.5rem",
    fontSize: "0.85rem",
    color: "#cbd5e1",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
  },
  legendDot: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    display: "inline-block",
  },
  rowsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.55rem",
    alignItems: "center",
  },
  seatRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  rowLabel: {
    width: "54px",
    textAlign: "right",
    fontSize: "0.8rem",
    color: "#94a3b8",
    fontWeight: 600,
  },
  seatsInRow: {
    display: "flex",
    gap: "0.4rem",
  },
  seatBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "8px 8px 4px 4px",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "2px",
    transition: "transform 0.12s",
  },
  seatNumber: {
    fontSize: "0.8rem",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  seatScore: {
    fontSize: "0.62rem",
    color: "#38bdf8",
    lineHeight: 1,
  },
  summaryCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "14px",
    padding: "1.5rem",
  },
  emptySelection: {
    backgroundColor: "#0f172a",
    border: "1px dashed #334155",
    borderRadius: "10px",
    padding: "1.25rem",
    color: "#94a3b8",
    fontSize: "0.9rem",
    textAlign: "center",
  },
  selectedList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
    marginBottom: "1rem",
    maxHeight: "180px",
    overflowY: "auto",
  },
  selectedSeatChip: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.88rem",
  },
  priceBox: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "0.9rem",
    marginBottom: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    fontSize: "0.9rem",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "1px solid #334155",
    padding: "0.6rem 0.8rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
  },
  btnPrimary: {
    backgroundColor: "#e11d48",
    color: "#ffffff",
    border: "none",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.95rem",
    marginTop: "0.25rem",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    color: "#cbd5e1",
    border: "1px solid #475569",
    padding: "0.4rem 0.85rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.82rem",
  },
  successBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.4)",
    color: "#10b981",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.88rem",
    marginBottom: "1rem",
    fontWeight: 600,
  },
};
