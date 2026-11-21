import React, { useState, useEffect, useMemo } from "react";

/**
 * 4.1 Műsor nézet (mock adatokkal + élő Backend API-val + filmplakátokkal) - Issue #16
 * React komponens heti moziműsor megjelenítéséhez, szűréshez és vetítésválasztáshoz.
 * Kompatibilis az 1.1 Adatbázis sémával, az 1.3 Seed filmekkel, a 2.1 Heti műsor
 * lekérdezése backenddel, a 3.2 Időpont-ajánlással és a 4.2 Ülésválasztó nézettel.
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

export const MOVIE_POSTERS = {
  "Csillagok Háborúja: Az Új Horizont": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#090d26%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#1e1b6b%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#6b21a8%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22neb%22%20cx=%2265%25%22%20cy=%2232%25%22%20r=%2250%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#38bdf8%22%20stop-opacity=%220.75%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#a855f7%22%20stop-opacity=%220.35%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#090d26%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3CradialGradient%20id=%22planet%22%20cx=%2235%25%22%20cy=%2235%25%22%20r=%2265%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#fde68a%22/%3E%20%3Cstop%20offset=%2250%25%22%20stop-color=%22#f97316%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#7c2d12%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#neb)%22/%3E%20%3Ccircle%20cx=%2232%22%20cy=%2236%22%20r=%221.4%22%20fill=%22#fff%22/%3E%20%3Ccircle%20cx=%2284%22%20cy=%2224%22%20r=%221.1%22%20fill=%22#e0f2fe%22/%3E%20%3Ccircle%20cx=%22195%22%20cy=%2248%22%20r=%221.6%22%20fill=%22#fff%22/%3E%20%3Ccircle%20cx=%22212%22%20cy=%2296%22%20r=%221.2%22%20fill=%22#bae6fd%22/%3E%20%3Ccircle%20cx=%2248%22%20cy=%22112%22%20r=%221.5%22%20fill=%22#fff%22/%3E%20%3Ccircle%20cx=%22152%22%20cy=%2228%22%20r=%221%22%20fill=%22#fff%22/%3E%20%3Ccircle%20cx=%2224%22%20cy=%22180%22%20r=%221.2%22%20fill=%22#e0f2fe%22/%3E%20%3Ccircle%20cx=%22218%22%20cy=%22176%22%20r=%221.5%22%20fill=%22#fff%22/%3E%20%3Ccircle%20cx=%22162%22%20cy=%22106%22%20r=%2246%22%20fill=%22url(#planet)%22/%3E%20%3Cellipse%20cx=%22162%22%20cy=%22108%22%20rx=%2274%22%20ry=%2215%22%20fill=%22none%22%20stroke=%22#bae6fd%22%20stroke-width=%223%22%20opacity=%220.7%22%20transform=%22rotate(-18%20162%20108)%22/%3E%20%3Ccircle%20cx=%2272%22%20cy=%2282%22%20r=%2216%22%20fill=%22#38bdf8%22%20opacity=%220.85%22/%3E%20%3Cpath%20d=%22M12%20248%20L120%20148%20L132%20158%20L46%20264%20Z%22%20fill=%22#38bdf8%22%20opacity=%220.25%22/%3E%20%3Cpath%20d=%22M120%20132%20L134%20176%20L120%20166%20L106%20176%20Z%22%20fill=%22#f8fafc%22/%3E%20%3Cpath%20d=%22M120%20142%20L152%20182%20L120%20172%20L88%20182%20Z%22%20fill=%22#cbd5e1%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22174%22%20r=%226%22%20fill=%22#38bdf8%22/%3E%20%3Cpath%20d=%22M0%20245%20Q65%20215%20125%20236%20T240%20226%20L240%20320%20L0%20320%20Z%22%20fill=%22#0f172a%22%20opacity=%220.9%22/%3E%20%3C/svg%3E",
  "Budapesti Hajsza": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%220%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#1c0a0a%22/%3E%20%3Cstop%20offset=%2248%25%22%20stop-color=%22#991b1b%22/%3E%20%3Cstop%20offset=%2276%25%22%20stop-color=%22#f59e0b%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#0f172a%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22sun%22%20cx=%2250%25%22%20cy=%2262%25%22%20r=%2240%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#fef08a%22/%3E%20%3Cstop%20offset=%2260%25%22%20stop-color=%22#f97316%22%20stop-opacity=%220.7%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#991b1b%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22168%22%20r=%2272%22%20fill=%22url(#sun)%22/%3E%20%3C!--%20Parliament%20dome%20&%20spires%20silhouette%20--%3E%20%3Cpath%20d=%22M20%20198%20L20%20168%20L36%20168%20L42%20146%20L48%20168%20L74%20168%20L84%20148%20Q98%20118%20112%20148%20L122%20168%20L148%20168%20L154%20146%20L160%20168%20L184%20168%20L184%20198%20Z%22%20fill=%22#180c12%22%20opacity=%220.85%22/%3E%20%3C!--%20Chain%20Bridge%20towers%20&%20cables%20--%3E%20%3Crect%20x=%2246%22%20y=%22138%22%20width=%2216%22%20height=%2266%22%20fill=%22#0f070c%22/%3E%20%3Crect%20x=%22178%22%20y=%22138%22%20width=%2216%22%20height=%2266%22%20fill=%22#0f070c%22/%3E%20%3Cpath%20d=%22M0%20176%20Q23%20176%2046%20146%20M62%20146%20Q120%20196%20178%20146%20M194%20146%20Q217%20176%20240%20176%22%20fill=%22none%22%20stroke=%22#0f070c%22%20stroke-width=%223.5%22/%3E%20%3Crect%20x=%220%22%20y=%22196%22%20width=%22240%22%20height=%2210%22%20fill=%22#0f070c%22/%3E%20%3C!--%20Danube%20reflection%20&%20car%20headlight%20streaks%20--%3E%20%3Crect%20x=%220%22%20y=%22206%22%20width=%22240%22%20height=%22114%22%20fill=%22#0b1120%22/%3E%20%3Cpath%20d=%22M18%20228%20L222%20228%22%20stroke=%22#f59e0b%22%20stroke-width=%222%22%20opacity=%220.45%22/%3E%20%3Cpath%20d=%22M40%20242%20L200%20242%22%20stroke=%22#ef4444%22%20stroke-width=%222%22%20opacity=%220.4%22/%3E%20%3C!--%20Sports%20car%20silhouette%20&%20speed%20streaks%20--%3E%20%3Cpath%20d=%22M38%20258%20L72%20242%20L152%20242%20L192%20256%20L202%20268%20L32%20268%20Z%22%20fill=%22#1e293b%22%20stroke=%22#fbbf24%22%20stroke-width=%221.5%22/%3E%20%3Ccircle%20cx=%2270%22%20cy=%22268%22%20r=%2210%22%20fill=%22#020617%22%20stroke=%22#f97316%22%20stroke-width=%222%22/%3E%20%3Ccircle%20cx=%22168%22%20cy=%22268%22%20r=%2210%22%20fill=%22#020617%22%20stroke=%22#f97316%22%20stroke-width=%222%22/%3E%20%3Cpath%20d=%22M0%20262%20L44%20258%22%20stroke=%22#ef4444%22%20stroke-width=%224%22%20opacity=%220.9%22/%3E%20%3Cpath%20d=%22M196%20260%20L240%20256%22%20stroke=%22#fef08a%22%20stroke-width=%224%22%20opacity=%220.9%22/%3E%20%3C/svg%3E",
  "Kódok és Kávék": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#064e3b%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#0f766e%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#0369a1%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22glow%22%20cx=%2250%25%22%20cy=%2246%25%22%20r=%2248%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#34d399%22%20stop-opacity=%220.5%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#064e3b%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#glow)%22/%3E%20%3C!--%20Code%20grid%20lines%20--%3E%20%3Ctext%20x=%2220%22%20y=%2254%22%20fill=%22#a7f3d0%22%20opacity=%220.35%22%20font-family=%22monospace%22%20font-size=%2214%22%3E&lt;code%20/&gt;%200110%3C/text%3E%20%3Ctext%20x=%22118%22%20y=%2284%22%20fill=%22#bae6fd%22%20opacity=%220.35%22%20font-family=%22monospace%22%20font-size=%2215%22%3E%7B%20git%20push%20%7D%3C/text%3E%20%3Ctext%20x=%2226%22%20y=%22106%22%20fill=%22#fde68a%22%20opacity=%220.4%22%20font-family=%22monospace%22%20font-size=%2213%22%3Ewhile(coffee)%3C/text%3E%20%3C!--%20Steam%20waves%20--%3E%20%3Cpath%20d=%22M96%20144%20Q86%20124%2098%20106%20T96%2072%22%20fill=%22none%22%20stroke=%22#fef3c7%22%20stroke-width=%224%22%20stroke-linecap=%22round%22%20opacity=%220.8%22/%3E%20%3Cpath%20d=%22M120%20138%20Q110%20116%20122%2098%20T120%2062%22%20fill=%22none%22%20stroke=%22#a7f3d0%22%20stroke-width=%224%22%20stroke-linecap=%22round%22%20opacity=%220.85%22/%3E%20%3Cpath%20d=%22M144%20144%20Q134%20124%20146%20106%20T144%2074%22%20fill=%22none%22%20stroke=%22#fef3c7%22%20stroke-width=%224%22%20stroke-linecap=%22round%22%20opacity=%220.75%22/%3E%20%3C!--%20Coffee%20mug%20--%3E%20%3Crect%20x=%2268%22%20y=%22152%22%20width=%2296%22%20height=%2288%22%20rx=%2214%22%20fill=%22#f8fafc%22/%3E%20%3Cpath%20d=%22M164%20168%20L182%20168%20Q196%20168%20196%20192%20Q196%20216%20182%20216%20L164%20216%22%20fill=%22none%22%20stroke=%22#f8fafc%22%20stroke-width=%2211%22%20stroke-linecap=%22round%22/%3E%20%3Cellipse%20cx=%22116%22%20cy=%22156%22%20rx=%2244%22%20ry=%228%22%20fill=%22#451a03%22/%3E%20%3Ctext%20x=%2284%22%20y=%22206%22%20fill=%22#0f766e%22%20font-family=%22monospace%22%20font-weight=%22bold%22%20font-size=%2224%22%3E&lt;/&gt;%3C/text%3E%20%3Cellipse%20cx=%22116%22%20cy=%22246%22%20rx=%2268%22%20ry=%2210%22%20fill=%22#0f172a%22%20opacity=%220.35%22/%3E%20%3C/svg%3E",
  "Az Utolsó Felvonás": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#1e1b4b%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#581c87%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#9d174d%22/%3E%20%3C/linearGradient%3E%20%3ClinearGradient%20id=%22spot%22%20x1=%220.5%22%20y1=%220%22%20x2=%220.5%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#fef08a%22%20stop-opacity=%220.7%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#fef08a%22%20stop-opacity=%220%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3C!--%20Stage%20spotlight%20cone%20--%3E%20%3Cpolygon%20points=%22120,0%2028,260%20212,260%22%20fill=%22url(#spot)%22/%3E%20%3C!--%20Curtain%20edges%20--%3E%20%3Cpath%20d=%22M0%200%20L42%200%20Q26%20110%2018%20240%20L0%20240%20Z%22%20fill=%22#4c0519%22%20opacity=%220.75%22/%3E%20%3Cpath%20d=%22M240%200%20L198%200%20Q214%20110%20222%20240%20L240%20240%20Z%22%20fill=%22#4c0519%22%20opacity=%220.75%22/%3E%20%3C!--%20Grand%20piano%20silhouette%20--%3E%20%3Cpath%20d=%22M52%20178%20Q56%20126%20118%20128%20Q144%20130%20156%20156%20Q172%20178%20192%20178%20L192%20204%20L52%20204%20Z%22%20fill=%22#0f172a%22/%3E%20%3C!--%20Piano%20keys%20strip%20--%3E%20%3Crect%20x=%2256%22%20y=%22198%22%20width=%22132%22%20height=%2214%22%20fill=%22#f8fafc%22%20rx=%222%22/%3E%20%3Crect%20x=%2266%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%2278%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%2296%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%22108%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%22120%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%22138%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%22150%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%22168%22%20y=%22198%22%20width=%226%22%20height=%228%22%20fill=%22#0f172a%22/%3E%20%3C!--%20Piano%20legs%20--%3E%20%3Crect%20x=%2264%22%20y=%22212%22%20width=%228%22%20height=%2244%22%20fill=%22#0f172a%22/%3E%20%3Crect%20x=%22172%22%20y=%22212%22%20width=%228%22%20height=%2244%22%20fill=%22#0f172a%22/%3E%20%3C!--%20Floating%20golden%20notes%20--%3E%20%3Ccircle%20cx=%2286%22%20cy=%2296%22%20r=%226%22%20fill=%22#fde047%22/%3E%20%3Crect%20x=%2291%22%20y=%2268%22%20width=%223%22%20height=%2228%22%20fill=%22#fde047%22/%3E%20%3Ccircle%20cx=%22152%22%20cy=%2284%22%20r=%225%22%20fill=%22#fbcfe8%22/%3E%20%3Crect%20x=%22156%22%20y=%2258%22%20width=%223%22%20height=%2226%22%20fill=%22#fbcfe8%22/%3E%20%3C/svg%3E",
  "Éjszakai Árnyak": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%220%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#020617%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#1e293b%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#0f172a%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22moon%22%20cx=%2250%25%22%20cy=%2250%25%22%20r=%2250%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#e2e8f0%22/%3E%20%3Cstop%20offset=%2260%25%22%20stop-color=%22#94a3b8%22%20stop-opacity=%220.4%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#020617%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Ccircle%20cx=%22168%22%20cy=%2276%22%20r=%2252%22%20fill=%22url(#moon)%22/%3E%20%3Ccircle%20cx=%22168%22%20cy=%2276%22%20r=%2224%22%20fill=%22#f1f5f9%22/%3E%20%3C!--%20Lightning%20bolt%20--%3E%20%3Cpolyline%20points=%2272,10%2056,64%2074,64%2052,126%22%20fill=%22none%22%20stroke=%22#38bdf8%22%20stroke-width=%223.5%22%20stroke-linejoin=%22round%22%20opacity=%220.9%22/%3E%20%3C!--%20Mountains%20--%3E%20%3Cpolygon%20points=%220,240%2062,134%20128,240%22%20fill=%22#0f172a%22/%3E%20%3Cpolygon%20points=%2296,240%20174,118%20240,240%22%20fill=%22#111827%22/%3E%20%3C!--%20Haunted%20hotel%20silhouette%20--%3E%20%3Crect%20x=%2268%22%20y=%22156%22%20width=%22104%22%20height=%2292%22%20fill=%22#020617%22/%3E%20%3Cpolygon%20points=%2260,158%20120,122%20180,158%22%20fill=%22#020617%22/%3E%20%3C!--%20Windows%20(one%20eerie%20glowing%20amber%20window)%20--%3E%20%3Crect%20x=%2282%22%20y=%22174%22%20width=%2214%22%20height=%2218%22%20fill=%22#1e293b%22/%3E%20%3Crect%20x=%22113%22%20y=%22174%22%20width=%2214%22%20height=%2218%22%20fill=%22#f59e0b%22/%3E%20%3Crect%20x=%22144%22%20y=%22174%22%20width=%2214%22%20height=%2218%22%20fill=%22#1e293b%22/%3E%20%3Crect%20x=%2282%22%20y=%22206%22%20width=%2214%22%20height=%2218%22%20fill=%22#1e293b%22/%3E%20%3Crect%20x=%22144%22%20y=%22206%22%20width=%2214%22%20height=%2218%22%20fill=%22#1e293b%22/%3E%20%3Crect%20x=%22111%22%20y=%22218%22%20width=%2218%22%20height=%2230%22%20fill=%22#334155%22/%3E%20%3C/svg%3E",
  "Időutazók Klubja": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#0c0a3e%22/%3E%20%3Cstop%20offset=%2250%25%22%20stop-color=%22#1d4ed8%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#7c3aed%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22vortex%22%20cx=%2250%25%22%20cy=%2246%25%22%20r=%2248%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#67e8f9%22/%3E%20%3Cstop%20offset=%2245%25%22%20stop-color=%22#3b82f6%22%20stop-opacity=%220.6%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#0c0a3e%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22144%22%20r=%2296%22%20fill=%22url(#vortex)%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22144%22%20r=%2276%22%20fill=%22none%22%20stroke=%22#a5f3fc%22%20stroke-width=%222%22%20stroke-dasharray=%2210%206%22%20opacity=%220.7%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22144%22%20r=%2256%22%20fill=%22none%22%20stroke=%22#fde047%22%20stroke-width=%223%22%20opacity=%220.85%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22144%22%20r=%2236%22%20fill=%22none%22%20stroke=%22#e0f2fe%22%20stroke-width=%222%22%20stroke-dasharray=%226%204%22/%3E%20%3C!--%20Clock%20hands%20--%3E%20%3Cline%20x1=%22120%22%20y1=%22144%22%20x2=%22120%22%20y2=%2296%22%20stroke=%22#fff%22%20stroke-width=%224%22%20stroke-linecap=%22round%22/%3E%20%3Cline%20x1=%22120%22%20y1=%22144%22%20x2=%22156%22%20y2=%22130%22%20stroke=%22#fde047%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22144%22%20r=%226%22%20fill=%22#fff%22/%3E%20%3C!--%20Silhouette%20standing%20in%20portal%20--%3E%20%3Ccircle%20cx=%22120%22%20cy=%22214%22%20r=%229%22%20fill=%22#0f172a%22/%3E%20%3Cpath%20d=%22M104%20256%20L112%20224%20L128%20224%20L136%20256%20Z%22%20fill=%22#0f172a%22/%3E%20%3C/svg%3E",
  "A Duna Titka": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%220%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#134e4a%22/%3E%20%3Cstop%20offset=%2250%25%22%20stop-color=%22#d97706%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#0f172a%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3C!--%20Compass%20rose%20--%3E%20%3Ccircle%20cx=%22120%22%20cy=%22116%22%20r=%2258%22%20fill=%22none%22%20stroke=%22#fef3c7%22%20stroke-width=%222.5%22%20opacity=%220.75%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22116%22%20r=%2246%22%20fill=%22none%22%20stroke=%22#fde68a%22%20stroke-width=%221.5%22%20stroke-dasharray=%224%204%22/%3E%20%3Cpolygon%20points=%22120,46%20132,116%20120,186%20108,116%22%20fill=%22#fef08a%22%20opacity=%220.9%22/%3E%20%3Cpolygon%20points=%2250,116%20120,104%20190,116%20120,128%22%20fill=%22#fbbf24%22%20opacity=%220.85%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22116%22%20r=%2210%22%20fill=%22#0f172a%22%20stroke=%22#fef08a%22%20stroke-width=%223%22/%3E%20%3C!--%20River%20waves%20&%20lantern%20boat%20--%3E%20%3Cpath%20d=%22M0%20218%20Q40%20202%2080%20218%20T160%20218%20T240%20218%20L240%20320%20L0%20320%20Z%22%20fill=%22#0f2942%22/%3E%20%3Cpath%20d=%22M0%20238%20Q40%20226%2080%20238%20T160%20238%20T240%20238%22%20fill=%22none%22%20stroke=%22#38bdf8%22%20stroke-width=%222%22%20opacity=%220.5%22/%3E%20%3Cpath%20d=%22M76%20214%20L164%20214%20L152%20228%20L88%20228%20Z%22%20fill=%22#1e293b%22/%3E%20%3Ccircle%20cx=%22152%22%20cy=%22204%22%20r=%226%22%20fill=%22#fde047%22/%3E%20%3C/svg%3E",
  "Nevetni Tilos!": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#ec4899%22/%3E%20%3Cstop%20offset=%2250%25%22%20stop-color=%22#f59e0b%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#eab308%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3C!--%20Sunburst%20rays%20--%3E%20%3Cpolygon%20points=%22120,140%200,20%2040,0%22%20fill=%22#fff%22%20opacity=%220.14%22/%3E%20%3Cpolygon%20points=%22120,140%20100,0%20140,0%22%20fill=%22#fff%22%20opacity=%220.14%22/%3E%20%3Cpolygon%20points=%22120,140%20200,0%20240,20%22%20fill=%22#fff%22%20opacity=%220.14%22/%3E%20%3Cpolygon%20points=%22120,140%20240,120%20240,164%22%20fill=%22#fff%22%20opacity=%220.14%22/%3E%20%3Cpolygon%20points=%22120,140%200,120%200,164%22%20fill=%22#fff%22%20opacity=%220.14%22/%3E%20%3C!--%20Big%20comic%20smiling%20face%20badge%20+%20prohibition-style%20playful%20twist%20--%3E%20%3Ccircle%20cx=%22120%22%20cy=%22138%22%20r=%2262%22%20fill=%22#fef08a%22%20stroke=%22#1e293b%22%20stroke-width=%226%22/%3E%20%3Cpath%20d=%22M90%20124%20Q98%20112%20106%20124%22%20fill=%22none%22%20stroke=%22#1e293b%22%20stroke-width=%225%22%20stroke-linecap=%22round%22/%3E%20%3Cpath%20d=%22M134%20124%20Q142%20112%20150%20124%22%20fill=%22none%22%20stroke=%22#1e293b%22%20stroke-width=%225%22%20stroke-linecap=%22round%22/%3E%20%3Cpath%20d=%22M88%20152%20Q120%20186%20152%20152%20Z%22%20fill=%22#e11d48%22%20stroke=%22#1e293b%22%20stroke-width=%224%22/%3E%20%3C!--%20Confetti%20--%3E%20%3Crect%20x=%2230%22%20y=%2264%22%20width=%2212%22%20height=%2212%22%20rx=%222%22%20fill=%22#38bdf8%22%20transform=%22rotate(25%2036%2070)%22/%3E%20%3Crect%20x=%22192%22%20y=%2276%22%20width=%2214%22%20height=%2210%22%20rx=%222%22%20fill=%22#a855f7%22%20transform=%22rotate(-20%20199%2081)%22/%3E%20%3Ccircle%20cx=%2248%22%20cy=%22214%22%20r=%227%22%20fill=%22#10b981%22/%3E%20%3Ccircle%20cx=%22196%22%20cy=%22208%22%20r=%228%22%20fill=%22#fff%22%20opacity=%220.8%22/%3E%20%3C/svg%3E",
  "Acél és Tűz": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%220%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#18181b%22/%3E%20%3Cstop%20offset=%2252%25%22%20stop-color=%22#7c2d12%22/%3E%20%3Cstop%20offset=%2285%25%22%20stop-color=%22#ea580c%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#450a0a%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22fire%22%20cx=%2250%25%22%20cy=%2268%25%22%20r=%2252%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#fef08a%22/%3E%20%3Cstop%20offset=%2245%25%22%20stop-color=%22#f97316%22%20stop-opacity=%220.8%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#7c2d12%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22196%22%20r=%22102%22%20fill=%22url(#fire)%22/%3E%20%3C!--%20Glowing%20crossed%20blades%20--%3E%20%3Cline%20x1=%2256%22%20y1=%2274%22%20x2=%22184%22%20y2=%22212%22%20stroke=%22#e2e8f0%22%20stroke-width=%229%22%20stroke-linecap=%22round%22/%3E%20%3Cline%20x1=%22184%22%20y1=%2274%22%20x2=%2256%22%20y2=%22212%22%20stroke=%22#cbd5e1%22%20stroke-width=%229%22%20stroke-linecap=%22round%22/%3E%20%3C!--%20Steel%20shield%20center%20--%3E%20%3Cpath%20d=%22M120%2090%20L166%20112%20L158%20176%20Q142%20204%20120%20218%20Q98%20204%2082%20176%20L74%20112%20Z%22%20fill=%22#1e293b%22%20stroke=%22#fbbf24%22%20stroke-width=%224%22/%3E%20%3Cpath%20d=%22M120%20112%20L134%20152%20L120%20184%20L106%20152%20Z%22%20fill=%22#f97316%22/%3E%20%3C!--%20Flying%20embers%20--%3E%20%3Ccircle%20cx=%2242%22%20cy=%22112%22%20r=%223%22%20fill=%22#fde047%22/%3E%20%3Ccircle%20cx=%22198%22%20cy=%22128%22%20r=%223.5%22%20fill=%22#fb923c%22/%3E%20%3Ccircle%20cx=%2264%22%20cy=%2254%22%20r=%222.5%22%20fill=%22#fef08a%22/%3E%20%3Ccircle%20cx=%22176%22%20cy=%2264%22%20r=%222.5%22%20fill=%22#fde047%22/%3E%20%3Ccircle%20cx=%2234%22%20cy=%22196%22%20r=%223%22%20fill=%22#fde047%22/%3E%20%3Ccircle%20cx=%22206%22%20cy=%22184%22%20r=%223%22%20fill=%22#fef08a%22/%3E%20%3C/svg%3E",
  "Csendes Vihar": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%220%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#0f172a%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#334155%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#1e3a5f%22/%3E%20%3C/linearGradient%3E%20%3ClinearGradient%20id=%22beam%22%20x1=%220%22%20y1=%220.5%22%20x2=%221%22%20y2=%220.5%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#fef08a%22%20stop-opacity=%220.8%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#fef08a%22%20stop-opacity=%220%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3C!--%20Storm%20clouds%20--%3E%20%3Ccircle%20cx=%2256%22%20cy=%2258%22%20r=%2238%22%20fill=%22#1e293b%22%20opacity=%220.85%22/%3E%20%3Ccircle%20cx=%22112%22%20cy=%2248%22%20r=%2246%22%20fill=%22#0f172a%22%20opacity=%220.8%22/%3E%20%3Ccircle%20cx=%22178%22%20cy=%2260%22%20r=%2240%22%20fill=%22#1e293b%22%20opacity=%220.85%22/%3E%20%3C!--%20Rain%20streaks%20--%3E%20%3Cg%20stroke=%22#94a3b8%22%20stroke-width=%221.4%22%20opacity=%220.45%22%3E%20%3Cline%20x1=%2236%22%20y1=%2290%22%20x2=%2224%22%20y2=%22130%22/%3E%20%3Cline%20x1=%2278%22%20y1=%22100%22%20x2=%2266%22%20y2=%22140%22/%3E%20%3Cline%20x1=%22158%22%20y1=%2292%22%20x2=%22146%22%20y2=%22132%22/%3E%20%3Cline%20x1=%22202%22%20y1=%22104%22%20x2=%22190%22%20y2=%22144%22/%3E%20%3C/g%3E%20%3C!--%20Lighthouse%20beam%20--%3E%20%3Cpolygon%20points=%2288,136%20240,94%20240,174%22%20fill=%22url(#beam)%22/%3E%20%3C!--%20Cliff%20&%20lighthouse%20--%3E%20%3Cpath%20d=%22M0%20240%20Q48%20214%20110%20246%20L0%20320%20Z%22%20fill=%22#020617%22/%3E%20%3Cpolygon%20points=%2274,226%2082,134%2094,134%20102,226%22%20fill=%22#e2e8f0%22/%3E%20%3Crect%20x=%2278%22%20y=%22156%22%20width=%2220%22%20height=%2212%22%20fill=%22#e11d48%22/%3E%20%3Crect%20x=%2276%22%20y=%22186%22%20width=%2224%22%20height=%2212%22%20fill=%22#e11d48%22/%3E%20%3Ccircle%20cx=%2288%22%20cy=%22134%22%20r=%226%22%20fill=%22#fef08a%22/%3E%20%3C!--%20Sea%20waves%20--%3E%20%3Cpath%20d=%22M0%20244%20Q60%20228%20120%20244%20T240%20244%20L240%20320%20L0%20320%20Z%22%20fill=%22#0f172a%22%20opacity=%220.9%22/%3E%20%3C/svg%3E",
  "A Sötét Labirintus": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#020617%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#064e3b%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#020617%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22exit%22%20cx=%2250%25%22%20cy=%2244%25%22%20r=%2236%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#34d399%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#020617%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22140%22%20r=%2280%22%20fill=%22url(#exit)%22/%3E%20%3C!--%20Concentric%20maze%20walls%20--%3E%20%3Cg%20fill=%22none%22%20stroke=%22#10b981%22%20stroke-width=%225%22%20stroke-linecap=%22square%22%20opacity=%220.85%22%3E%20%3Cpath%20d=%22M36%2056%20H204%20V224%20H136%20M104%20224%20H36%20V92%22/%3E%20%3Cpath%20d=%22M60%2080%20H180%20V200%20H60%20V116%22/%3E%20%3Cpath%20d=%22M84%20104%20H156%20V176%20H108%22/%3E%20%3Cpath%20d=%22M84%20104%20V152%22/%3E%20%3C/g%3E%20%3C!--%20Glowing%20center%20doorway%20--%3E%20%3Crect%20x=%22108%22%20y=%22124%22%20width=%2224%22%20height=%2236%22%20rx=%222%22%20fill=%22#a7f3d0%22/%3E%20%3C/svg%3E",
  "Robotok Városa": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#0f172a%22/%3E%20%3Cstop%20offset=%2245%25%22%20stop-color=%22#312e81%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#a21caf%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22neon%22%20cx=%2250%25%22%20cy=%2242%25%22%20r=%2252%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#22d3ee%22%20stop-opacity=%220.65%22/%3E%20%3Cstop%20offset=%2265%25%22%20stop-color=%22#ec4899%22%20stop-opacity=%220.3%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#0f172a%22%20stop-opacity=%220%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#neon)%22/%3E%20%3C!--%20Futuristic%20skyline%20--%3E%20%3Crect%20x=%2214%22%20y=%2296%22%20width=%2232%22%20height=%22150%22%20fill=%22#1e1b4b%22%20stroke=%22#22d3ee%22%20stroke-width=%221.5%22/%3E%20%3Crect%20x=%2254%22%20y=%2262%22%20width=%2238%22%20height=%22184%22%20fill=%22#1e1b4b%22%20stroke=%22#ec4899%22%20stroke-width=%221.5%22/%3E%20%3Crect%20x=%22104%22%20y=%2242%22%20width=%2234%22%20height=%22204%22%20fill=%22#0f172a%22%20stroke=%22#38bdf8%22%20stroke-width=%221.5%22/%3E%20%3Crect%20x=%22148%22%20y=%2276%22%20width=%2236%22%20height=%22170%22%20fill=%22#1e1b4b%22%20stroke=%22#a855f7%22%20stroke-width=%221.5%22/%3E%20%3Crect%20x=%22192%22%20y=%22104%22%20width=%2234%22%20height=%22142%22%20fill=%22#0f172a%22%20stroke=%22#22d3ee%22%20stroke-width=%221.5%22/%3E%20%3C!--%20Glowing%20windows%20--%3E%20%3Cg%20fill=%22#67e8f9%22%20opacity=%220.85%22%3E%20%3Crect%20x=%2264%22%20y=%2276%22%20width=%2218%22%20height=%224%22/%3E%20%3Crect%20x=%2264%22%20y=%2288%22%20width=%2218%22%20height=%224%22/%3E%20%3Crect%20x=%22112%22%20y=%2256%22%20width=%2218%22%20height=%224%22/%3E%20%3Crect%20x=%22112%22%20y=%2268%22%20width=%2218%22%20height=%224%22/%3E%20%3Crect%20x=%22112%22%20y=%2280%22%20width=%2218%22%20height=%224%22/%3E%20%3Crect%20x=%22156%22%20y=%2292%22%20width=%2220%22%20height=%224%22/%3E%20%3C/g%3E%20%3C!--%20Friendly%20hero%20robot%20silhouette%20in%20foreground%20--%3E%20%3Cline%20x1=%22120%22%20y1=%22156%22%20x2=%22120%22%20y2=%22140%22%20stroke=%22#38bdf8%22%20stroke-width=%223%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22138%22%20r=%225%22%20fill=%22#f472b6%22/%3E%20%3Crect%20x=%2288%22%20y=%22156%22%20width=%2264%22%20height=%2244%22%20rx=%2212%22%20fill=%22#e2e8f0%22%20stroke=%22#0f172a%22%20stroke-width=%223%22/%3E%20%3Crect%20x=%2298%22%20y=%22168%22%20width=%2244%22%20height=%2220%22%20rx=%226%22%20fill=%22#0f172a%22/%3E%20%3Ccircle%20cx=%22110%22%20cy=%22178%22%20r=%225%22%20fill=%22#22d3ee%22/%3E%20%3Ccircle%20cx=%22130%22%20cy=%22178%22%20r=%225%22%20fill=%22#22d3ee%22/%3E%20%3Crect%20x=%2296%22%20y=%22204%22%20width=%2248%22%20height=%2242%22%20rx=%228%22%20fill=%22#cbd5e1%22%20stroke=%22#0f172a%22%20stroke-width=%223%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22222%22%20r=%227%22%20fill=%22#ec4899%22/%3E%20%3C/svg%3E",
  "Végállomás: Mars": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%220%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#09090b%22/%3E%20%3Cstop%20offset=%2245%25%22%20stop-color=%22#7c2d12%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#c2410c%22/%3E%20%3C/linearGradient%3E%20%3CradialGradient%20id=%22mars%22%20cx=%2235%25%22%20cy=%2235%25%22%20r=%2265%25%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#fdba74%22/%3E%20%3Cstop%20offset=%2255%25%22%20stop-color=%22#ea580c%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#7c2d12%22/%3E%20%3C/radialGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3Ccircle%20cx=%2238%22%20cy=%2234%22%20r=%221.4%22%20fill=%22#fff%22/%3E%20%3Ccircle%20cx=%22198%22%20cy=%2242%22%20r=%221.5%22%20fill=%22#fff%22/%3E%20%3Ccircle%20cx=%22164%22%20cy=%2224%22%20r=%221.2%22%20fill=%22#fde68a%22/%3E%20%3Ccircle%20cx=%2264%22%20cy=%2278%22%20r=%221.2%22%20fill=%22#fff%22/%3E%20%3C!--%20Giant%20Mars%20orb%20--%3E%20%3Ccircle%20cx=%22120%22%20cy=%22112%22%20r=%2256%22%20fill=%22url(#mars)%22/%3E%20%3Cellipse%20cx=%22104%22%20cy=%22100%22%20rx=%2212%22%20ry=%228%22%20fill=%22#9a3412%22%20opacity=%220.45%22/%3E%20%3Cellipse%20cx=%22140%22%20cy=%22126%22%20rx=%2216%22%20ry=%2210%22%20fill=%22#9a3412%22%20opacity=%220.35%22/%3E%20%3C!--%20Martian%20horizon%20&%20geodesic%20dome%20--%3E%20%3Cpath%20d=%22M0%20218%20Q70%20186%20140%20206%20T240%20202%20L240%20320%20L0%20320%20Z%22%20fill=%22#431407%22/%3E%20%3Cpath%20d=%22M74%20214%20A46%2046%200%200%201%20166%20214%20Z%22%20fill=%22#38bdf8%22%20opacity=%220.35%22%20stroke=%22#bae6fd%22%20stroke-width=%222%22/%3E%20%3Cline%20x1=%22120%22%20y1=%22168%22%20x2=%22120%22%20y2=%22214%22%20stroke=%22#bae6fd%22%20stroke-width=%221.5%22%20opacity=%220.7%22/%3E%20%3Cline%20x1=%2294%22%20y1=%22176%22%20x2=%22104%22%20y2=%22214%22%20stroke=%22#bae6fd%22%20stroke-width=%221.5%22%20opacity=%220.7%22/%3E%20%3Cline%20x1=%22146%22%20y1=%22176%22%20x2=%22136%22%20y2=%22214%22%20stroke=%22#bae6fd%22%20stroke-width=%221.5%22%20opacity=%220.7%22/%3E%20%3C/svg%3E",
  "Hétvégi Káosz": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22bg%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#f43f5e%22/%3E%20%3Cstop%20offset=%2250%25%22%20stop-color=%22#8b5cf6%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#06b6d4%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#bg)%22/%3E%20%3C!--%20Disco%20ball%20--%3E%20%3Cline%20x1=%22120%22%20y1=%220%22%20x2=%22120%22%20y2=%2276%22%20stroke=%22#e2e8f0%22%20stroke-width=%223%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22116%22%20r=%2244%22%20fill=%22#e2e8f0%22%20stroke=%22#fff%22%20stroke-width=%222%22/%3E%20%3Cellipse%20cx=%22120%22%20cy=%22116%22%20rx=%2244%22%20ry=%2214%22%20fill=%22none%22%20stroke=%22#94a3b8%22%20stroke-width=%221.5%22/%3E%20%3Cellipse%20cx=%22120%22%20cy=%22116%22%20rx=%2218%22%20ry=%2244%22%20fill=%22none%22%20stroke=%22#94a3b8%22%20stroke-width=%221.5%22/%3E%20%3Cline%20x1=%2276%22%20y1=%22116%22%20x2=%22164%22%20y2=%22116%22%20stroke=%22#94a3b8%22%20stroke-width=%221.5%22/%3E%20%3C!--%20Party%20sparkles%20--%3E%20%3Cpolygon%20points=%2244,82%2048,94%2060,98%2048,102%2044,114%2040,102%2028,98%2040,94%22%20fill=%22#fef08a%22/%3E%20%3Cpolygon%20points=%22196,134%20200,144%20210,148%20200,152%20196,162%20192,152%20182,148%20192,144%22%20fill=%22#fef08a%22/%3E%20%3C!--%20Tilted%20retro%20sunglasses%20--%3E%20%3Cg%20transform=%22rotate(-10%20120%20206)%22%3E%20%3Crect%20x=%2248%22%20y=%22188%22%20width=%2260%22%20height=%2236%22%20rx=%2210%22%20fill=%22#0f172a%22%20stroke=%22#fde047%22%20stroke-width=%224%22/%3E%20%3Crect%20x=%22132%22%20y=%22188%22%20width=%2260%22%20height=%2236%22%20rx=%2210%22%20fill=%22#0f172a%22%20stroke=%22#fde047%22%20stroke-width=%224%22/%3E%20%3Cline%20x1=%22108%22%20y1=%22202%22%20x2=%22132%22%20y2=%22202%22%20stroke=%22#fde047%22%20stroke-width=%225%22/%3E%20%3C/g%3E%20%3C/svg%3E",
  "Kettős Játszma": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20240%20320%22%3E%20%3Cdefs%3E%20%3ClinearGradient%20id=%22left%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#991b1b%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#1e1b4b%22/%3E%20%3C/linearGradient%3E%20%3ClinearGradient%20id=%22right%22%20x1=%220%22%20y1=%220%22%20x2=%221%22%20y2=%221%22%3E%20%3Cstop%20offset=%220%25%22%20stop-color=%22#0284c7%22/%3E%20%3Cstop%20offset=%22100%25%22%20stop-color=%22#0f172a%22/%3E%20%3C/linearGradient%3E%20%3C/defs%3E%20%3Crect%20width=%22240%22%20height=%22320%22%20fill=%22url(#left)%22/%3E%20%3Cpolygon%20points=%22240,0%20240,320%2040,320%20185,0%22%20fill=%22url(#right)%22/%3E%20%3C!--%20Split%20diagonal%20slash%20--%3E%20%3Cline%20x1=%22185%22%20y1=%220%22%20x2=%2240%22%20y2=%22320%22%20stroke=%22#f8fafc%22%20stroke-width=%224%22%20opacity=%220.85%22/%3E%20%3C!--%20Crosshair%20target%20--%3E%20%3Ccircle%20cx=%22120%22%20cy=%22144%22%20r=%2254%22%20fill=%22none%22%20stroke=%22#f8fafc%22%20stroke-width=%222.5%22%20opacity=%220.8%22/%3E%20%3Ccircle%20cx=%22120%22%20cy=%22144%22%20r=%2224%22%20fill=%22none%22%20stroke=%22#f43f5e%22%20stroke-width=%222.5%22/%3E%20%3Cline%20x1=%22120%22%20y1=%2274%22%20x2=%22120%22%20y2=%22214%22%20stroke=%22#f8fafc%22%20stroke-width=%222%22%20opacity=%220.7%22/%3E%20%3Cline%20x1=%2250%22%20y1=%22144%22%20x2=%22190%22%20y2=%22144%22%20stroke=%22#f8fafc%22%20stroke-width=%222%22%20opacity=%220.7%22/%3E%20%3C!--%20Chess%20king%20silhouettes%20--%3E%20%3Cpath%20d=%22M58%20228%20L66%20184%20L82%20184%20L90%20228%20Z%22%20fill=%22#0f172a%22/%3E%20%3Ccircle%20cx=%2274%22%20cy=%22176%22%20r=%229%22%20fill=%22#0f172a%22/%3E%20%3Cpath%20d=%22M150%20228%20L158%20184%20L174%20184%20L182%20228%20Z%22%20fill=%22#f8fafc%22%20opacity=%220.9%22/%3E%20%3Ccircle%20cx=%22166%22%20cy=%22176%22%20r=%229%22%20fill=%22#f8fafc%22%20opacity=%220.9%22/%3E%20%3C/svg%3E",
};

const GENRE_POSTER_FALLBACK = {
  "Sci-Fi": MOVIE_POSTERS["Csillagok Háborúja: Az Új Horizont"],
  "Akció": MOVIE_POSTERS["Acél és Tűz"],
  "Vígjáték": MOVIE_POSTERS["Kódok és Kávék"],
  "Dráma": MOVIE_POSTERS["Az Utolsó Felvonás"],
  "Thriller": MOVIE_POSTERS["Éjszakai Árnyak"],
  "Animáció": MOVIE_POSTERS["Robotok Városa"],
  "Kaland": MOVIE_POSTERS["A Duna Titka"],
};

function getMoviePosterUrl(movie) {
  return (
    movie.posterUrl ||
    movie.poster_url ||
    MOVIE_POSTERS[movie.title] ||
    GENRE_POSTER_FALLBACK[movie.genre] ||
    MOVIE_POSTERS["Csillagok Háborúja: Az Új Horizont"]
  );
}

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
      { id: 101, day: "Hétfő", time: "14:30", hall: "1. Terem (IMAX)", rows: 8, cols: 10, free_seats: 64, total_seats: 80 },
      { id: 102, day: "Hétfő", time: "19:00", hall: "1. Terem (IMAX)", rows: 8, cols: 10, free_seats: 12, total_seats: 80 },
      { id: 103, day: "Szerda", time: "18:30", hall: "1. Terem (IMAX)", rows: 8, cols: 10, free_seats: 45, total_seats: 80 },
      { id: 104, day: "Péntek", time: "20:15", hall: "1. Terem (IMAX)", rows: 8, cols: 10, free_seats: 8, total_seats: 80 },
      { id: 105, day: "Szombat", time: "16:00", hall: "1. Terem (IMAX)", rows: 8, cols: 10, free_seats: 52, total_seats: 80 },
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
      { id: 201, day: "Kedd", time: "17:00", hall: "2. Terem", rows: 6, cols: 10, free_seats: 38, total_seats: 60 },
      { id: 202, day: "Csütörtök", time: "20:00", hall: "2. Terem", rows: 6, cols: 10, free_seats: 19, total_seats: 60 },
      { id: 203, day: "Péntek", time: "21:00", hall: "2. Terem", rows: 6, cols: 10, free_seats: 5, total_seats: 60 },
      { id: 204, day: "Vasárnap", time: "19:30", hall: "2. Terem", rows: 6, cols: 10, free_seats: 41, total_seats: 60 },
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
      { id: 301, day: "Hétfő", time: "10:30", hall: "3. Terem (VIP)", rows: 5, cols: 6, free_seats: 28, total_seats: 30 },
      { id: 302, day: "Szerda", time: "15:00", hall: "3. Terem (VIP)", rows: 5, cols: 6, free_seats: 22, total_seats: 30 },
      { id: 303, day: "Szombat", time: "11:00", hall: "3. Terem (VIP)", rows: 5, cols: 6, free_seats: 25, total_seats: 30 },
      { id: 304, day: "Szombat", time: "18:00", hall: "3. Terem (VIP)", rows: 5, cols: 6, free_seats: 9, total_seats: 30 },
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
      { id: 401, day: "Kedd", time: "19:30", hall: "3. Terem (VIP)", rows: 5, cols: 6, free_seats: 17, total_seats: 30 },
      { id: 402, day: "Csütörtök", time: "16:30", hall: "2. Terem", rows: 6, cols: 10, free_seats: 49, total_seats: 60 },
      { id: 403, day: "Vasárnap", time: "17:00", hall: "1. Terem (IMAX)", rows: 8, cols: 10, free_seats: 60, total_seats: 80 },
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
      { id: 501, day: "Szerda", time: "21:15", hall: "2. Terem", rows: 6, cols: 10, free_seats: 33, total_seats: 60 },
      { id: 502, day: "Péntek", time: "22:30", hall: "1. Terem (IMAX)", rows: 8, cols: 10, free_seats: 40, total_seats: 80 },
      { id: 503, day: "Szombat", time: "22:00", hall: "2. Terem", rows: 6, cols: 10, free_seats: 14, total_seats: 60 },
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

  // Dinamikus műfajlista a betöltött filmek alapján (Animáció, Kaland stb. is bekerül)
  const availableGenres = useMemo(() => {
    const baseGenres = ["Sci-Fi", "Akció", "Vígjáték", "Dráma", "Thriller", "Animáció", "Kaland"];
    const set = new Set(baseGenres);
    movies.forEach((m) => {
      if (m.genre) set.add(m.genre);
    });
    return Array.from(set);
  }, [movies]);

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
                {availableGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
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
            filteredMovies.map((movie) => {
              const posterUrl = getMoviePosterUrl(movie);
              return (
                <article key={movie.id} style={styles.movieCard}>
                  <div
                    style={{
                      ...styles.poster,
                      background:
                        movie.gradient || "linear-gradient(135deg, #1e3a8a, #7e22ce)",
                    }}
                  >
                    <img
                      src={posterUrl}
                      alt={`${movie.title} plakát`}
                      style={styles.posterImg}
                      loading="lazy"
                    />
                    <div style={styles.posterOverlay} />
                    <span style={styles.ageBadge}>{movie.age_rating}</span>
                    <div style={styles.posterTitle}>{movie.title}</div>
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
              );
            })
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
    minHeight: "260px",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    position: "relative",
    overflow: "hidden",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "1.2rem",
  },
  posterImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  posterOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(15, 23, 42, 0.08) 35%, rgba(15, 23, 42, 0.88) 100%)",
    pointerEvents: "none",
  },
  posterTitle: {
    position: "relative",
    zIndex: 1,
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.85)",
    lineHeight: 1.25,
  },
  ageBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 2,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
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
