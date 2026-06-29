"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import NavigationShell from "@/components/navigation-shell";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/context/language-context";
import { AlertCircle, GitBranch, Trophy } from "lucide-react";

interface Team {
  id: string;
  name: string;
  shortName: string | null;
  flagUrl: string | null;
}

interface Match {
  id: string;
  externalMatchId?: string | null;
  stage: string;
  groupName: string;
  kickoffAt: string;
  homeScore: number | null;
  awayScore: number | null;
  extraTimeHome: number | null;
  extraTimeAway: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  duration: string | null;
  winner: string;
  homeTeam: Team;
  awayTeam: Team;
}

interface LeagueMatch {
  id: string;
  status: string;
  match: Match;
}

interface GroupTeamStats {
  team: Team;
  group: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

interface ProviderStandingRow {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface ProviderGroupStanding {
  group: string;
  rows: ProviderStandingRow[];
}

interface ProviderStandingsResponse {
  source: "provider-db";
  groups: ProviderGroupStanding[];
  fetchedAt: string | null;
}

type ViewMode = "groups" | "knockout";
type EntrantRef =
  | { kind: "groupRank"; group: string; rank: 1 | 2; label: string }
  | { kind: "thirdPlace"; groups: string[]; label: string }
  | { kind: "winner"; matchNo: number; label: string }
  | { kind: "loser"; matchNo: number; label: string };

interface KnockoutTemplate {
  no: number;
  stage: string;
  label: string;
  shortLabel: string;
  home: EntrantRef;
  away: EntrantRef;
}

interface ResolvedEntrant {
  label: string;
  team?: Team;
}

interface ResolvedKnockoutMatch {
  no: number;
  stage: string;
  label: string;
  shortLabel: string;
  actual?: LeagueMatch;
  home: ResolvedEntrant;
  away: ResolvedEntrant;
  homeScore: number | null;
  awayScore: number | null;
  extraTimeHome: number | null;
  extraTimeAway: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  duration: string | null;
  winner: string;
  kickoffAt?: string;
  status: string;
}

const WORLD_CUP_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const KNOCKOUT_ROUNDS = [
  { key: "ROUND_OF_32", label: "Round of 32", shortLabel: "R32" },
  { key: "ROUND_OF_16", label: "Round of 16", shortLabel: "R16" },
  { key: "QUARTER_FINAL", label: "Quarter-final", shortLabel: "QF" },
  { key: "SEMI_FINAL", label: "Semi-final", shortLabel: "SF" },
  { key: "THIRD_PLACE", label: "Third place", shortLabel: "3rd" },
  { key: "FINAL", label: "Final", shortLabel: "Final" }
];

// ── Bracket layout constants ──────────────────────────────────────────────────
const BKT_SLOT    = 126;  // row height for one R32 slot (px)
const BKT_CARD_W  = 248;  // match card width (px)
const BKT_CARD_H  = 110;  // match card height: header 26 + row 41 + div 1 + row 41 + border 1
const BKT_COL_GAP = 48;   // gap between columns (connector area)
const BKT_TOTAL_H = 16 * BKT_SLOT; // 2016px

// Visual order matches the actual WC2026 bracket layout (verified from provider schedule).
// Each adjacent pair of R32 slots feeds the same R16 match (connector logic pairs i, i+1 → next round i/2).
// R32:  [75,76]→M90, [73,74]→M89, [80,79]→M92, [78,77]→M91, [81,82]→M93, [83,84]→M94, [87,88]→M96, [86,85]→M95
// R16:  [90,89]→M97, [92,91]→M98, [93,94]→M99, [96,95]→M100
const BRACKET_ROUND_DEFS = [
  { labelVi: "Round of 32",  labelEn: "Round of 32",    matchNos: [75, 76, 73, 74, 80, 79, 78, 77, 81, 82, 83, 84, 87, 88, 86, 85] },
  { labelVi: "Vòng 16 đội",  labelEn: "Round of 16",    matchNos: [90, 89, 92, 91, 93, 94, 96, 95] },
  { labelVi: "Tứ kết",       labelEn: "Quarter-finals",  matchNos: [97, 98, 99, 100] },
  { labelVi: "Bán kết",      labelEn: "Semi-finals",     matchNos: [101, 102] },
  { labelVi: "Chung kết",    labelEn: "Final",           matchNos: [104] },
];

// cardTop: position of top edge of match card mi in column ci
function bktCardTop(ci: number, mi: number): number {
  const sh = BKT_SLOT * Math.pow(2, ci);
  return mi * sh + (sh - BKT_CARD_H) / 2;
}
// cardCenter: vertical center of card mi in column ci
// bktCardCenter(ci, mi) === midpoint of bktCardCenter(ci-1, 2*mi) and bktCardCenter(ci-1, 2*mi+1)
function bktCardCenter(ci: number, mi: number): number {
  return (mi + 0.5) * BKT_SLOT * Math.pow(2, ci);
}
function bktColLeft(ci: number): number {
  return ci * (BKT_CARD_W + BKT_COL_GAP);
}

function BracketCard({ match, language }: { match: ResolvedKnockoutMatch; language: string }) {
  const scored = match.homeScore !== null && match.awayScore !== null;
  const _side = scored ? resolveActualWinner(match) : undefined;
  const homeWon = _side === "home";
  const awayWon = _side === "away";

  const hasET  = match.extraTimeHome !== null && match.extraTimeAway !== null;
  const hasPen = match.penaltiesHome !== null && match.penaltiesAway !== null;

  const dateStr = match.kickoffAt
    ? (() => {
        const d = new Date(match.kickoffAt);
        const datePart = d.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit" });
        const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        return `${datePart} ${timePart}`;
      })()
    : "TBD";

  // Score display: "2" or "2 (aet 3)" or "2 (pen 4)"
  const scoreLabel = (main: number | null, et: number | null, pen: number | null): string => {
    if (main === null) return "—";
    if (pen !== null) return `${main}`;   // show 90-min score; pen shown separately
    if (et  !== null) return `${et}`;     // show ET (cumulative) score
    return `${main}`;
  };

  const renderRow = (entrant: ResolvedEntrant, main: number | null, et: number | null, pen: number | null, won: boolean) => (
    <div style={{ height: 41, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", background: won ? "#f0fdf4" : "transparent" }}>
      {entrant.team ? (
        entrant.team.flagUrl
          ? <img src={entrant.team.flagUrl} style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} alt="" />
          : <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#e5e7eb", fontSize: 9, fontWeight: 700, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {(entrant.team.shortName ?? entrant.team.name).slice(0, 2).toUpperCase()}
            </span>
      ) : (
        <span style={{ width: 22, height: 22, borderRadius: "50%", border: "1px dashed #d1d5db", background: "#f9fafb", fontSize: 9, fontWeight: 800, color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>?</span>
      )}
      <span style={{ fontSize: 12, fontWeight: won ? 700 : 500, color: won ? "#111827" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {entrant.team?.name ?? entrant.label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: won ? "#15803d" : scored ? "#111827" : "#d1d5db", minWidth: 14, textAlign: "right" }}>
          {scoreLabel(main, et, pen)}
        </span>
        {pen !== null && (
          <span style={{ fontSize: 9, fontWeight: 800, color: won ? "#15803d" : "#6b7280", background: won ? "#dcfce7" : "#f3f4f6", border: `1px solid ${won ? "#86efac" : "#e5e7eb"}`, borderRadius: 3, padding: "0 3px", lineHeight: "14px" }}>
            ({pen})
          </span>
        )}
      </div>
    </div>
  );

  // Duration badge
  const durationBadge = hasET
    ? (hasPen ? "PEN" : "AET")
    : null;

  return (
    <div style={{ width: BKT_CARD_W, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
      <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>{match.shortLabel}</span>
          {durationBadge && (
            <span style={{ fontSize: 8, fontWeight: 800, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 3, padding: "0 3px", lineHeight: "14px" }}>
              {durationBadge}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{dateStr}</span>
      </div>
      {renderRow(match.home, match.homeScore, match.extraTimeHome, match.penaltiesHome, homeWon)}
      <div style={{ height: 1, background: "#f3f4f6" }} />
      {renderRow(match.away, match.awayScore, match.extraTimeAway, match.penaltiesAway, awayWon)}
    </div>
  );
}

function KnockoutBracket({ knockoutMatchesByNo, language }: {
  knockoutMatchesByNo: Map<number, ResolvedKnockoutMatch>;
  language: string;
}) {
  const bracketW = BRACKET_ROUND_DEFS.length * (BKT_CARD_W + BKT_COL_GAP) - BKT_COL_GAP;

  // Build connector lines: for each pair in round ci, draw H-V-H lines to next round
  const connLines: ReactNode[] = [];
  BRACKET_ROUND_DEFS.slice(0, -1).forEach((col, ci) => {
    const cardRight = bktColLeft(ci) + BKT_CARD_W;
    const connX    = cardRight + BKT_COL_GAP / 2; // midpoint of gap — vertical line sits here
    const nextLeft = bktColLeft(ci + 1);

    for (let i = 0; i < col.matchNos.length; i += 2) {
      const tCy = bktCardCenter(ci, i);           // top match center y
      const bCy = bktCardCenter(ci, i + 1);       // bottom match center y
      const nCy = bktCardCenter(ci + 1, i / 2);  // next round match center y (= midpoint)

      connLines.push(
        // horizontal from top match right edge → vertical connector
        <div key={`ht-${ci}-${i}`} style={{ position: "absolute", top: tCy - 0.5, left: cardRight, width: connX - cardRight, height: 1, background: "#d1d5db" }} />,
        // horizontal from bottom match right edge → vertical connector
        <div key={`hb-${ci}-${i}`} style={{ position: "absolute", top: bCy - 0.5, left: cardRight, width: connX - cardRight, height: 1, background: "#d1d5db" }} />,
        // vertical connector joining both horizontals
        <div key={`v-${ci}-${i}`}  style={{ position: "absolute", top: tCy, left: connX - 0.5, width: 1, height: bCy - tCy, background: "#d1d5db" }} />,
        // horizontal from vertical connector → next round card left edge
        <div key={`hn-${ci}-${i}`} style={{ position: "absolute", top: nCy - 0.5, left: connX, width: nextLeft - connX, height: 1, background: "#d1d5db" }} />
      );
    }
  });

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Round header row */}
      <div style={{ display: "flex", gap: `${BKT_COL_GAP}px`, paddingBottom: 8, minWidth: `${bracketW}px` }}>
        {BRACKET_ROUND_DEFS.map((col, ci) => (
          <div key={ci} style={{ width: BKT_CARD_W, flexShrink: 0 }}>
            <div style={{ height: 30, display: "flex", alignItems: "center", background: "#2F7D5C", borderRadius: 4, padding: "0 10px" }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {language === "vi" ? col.labelVi : col.labelEn}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bracket canvas */}
      <div style={{ position: "relative", height: `${BKT_TOTAL_H}px`, minWidth: `${bracketW}px` }}>
        {connLines}
        {BRACKET_ROUND_DEFS.flatMap((col, ci) =>
          col.matchNos.map((no, mi) => {
            const match = knockoutMatchesByNo.get(no);
            if (!match) return null;
            return (
              <div key={no} style={{ position: "absolute", top: bktCardTop(ci, mi), left: bktColLeft(ci) }}>
                <BracketCard match={match} language={language} />
              </div>
            );
          })
        )}
        {/* 3rd place match — placed directly below Final in the same column */}
        {(() => {
          const thirdMatch = knockoutMatchesByNo.get(103);
          if (!thirdMatch) return null;
          const finalBottom = bktCardTop(4, 0) + BKT_CARD_H;
          const left = bktColLeft(4);
          const sepTop  = finalBottom + 10;
          const labelTop = sepTop + 6;
          const cardTop  = labelTop + 16;
          return (
            <>
              <div style={{ position: "absolute", top: sepTop, left, width: BKT_CARD_W, height: 1, background: "#e5e7eb" }} />
              <div style={{ position: "absolute", top: labelTop, left, width: BKT_CARD_W, textAlign: "center", fontSize: 9, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                🥉 {language === "vi" ? "Tranh hạng 3" : "3rd Place"}
              </div>
              <div style={{ position: "absolute", top: cardTop, left }}>
                <BracketCard match={thirdMatch} language={language} />
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

const groupRank = (rank: 1 | 2, group: string): EntrantRef => ({
  kind: "groupRank",
  group,
  rank,
  label: `${rank}${group}`
});

const thirdPlace = (groups: string[]): EntrantRef => ({
  kind: "thirdPlace",
  groups,
  label: `3${groups.join("/")}`
});

const winner = (matchNo: number): EntrantRef => ({ kind: "winner", matchNo, label: `W${matchNo}` });
const loser = (matchNo: number): EntrantRef => ({ kind: "loser", matchNo, label: `L${matchNo}` });

const KNOCKOUT_TEMPLATES: KnockoutTemplate[] = [
  // R32 — slots 73-88 in kickoff order (provider assigns teams; entrant refs are display labels only)
  { no: 73, stage: "ROUND_OF_32", label: "Match 73", shortLabel: "M73", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 74, stage: "ROUND_OF_32", label: "Match 74", shortLabel: "M74", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 75, stage: "ROUND_OF_32", label: "Match 75", shortLabel: "M75", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 76, stage: "ROUND_OF_32", label: "Match 76", shortLabel: "M76", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 77, stage: "ROUND_OF_32", label: "Match 77", shortLabel: "M77", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 78, stage: "ROUND_OF_32", label: "Match 78", shortLabel: "M78", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 79, stage: "ROUND_OF_32", label: "Match 79", shortLabel: "M79", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 80, stage: "ROUND_OF_32", label: "Match 80", shortLabel: "M80", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 81, stage: "ROUND_OF_32", label: "Match 81", shortLabel: "M81", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 82, stage: "ROUND_OF_32", label: "Match 82", shortLabel: "M82", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 83, stage: "ROUND_OF_32", label: "Match 83", shortLabel: "M83", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 84, stage: "ROUND_OF_32", label: "Match 84", shortLabel: "M84", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 85, stage: "ROUND_OF_32", label: "Match 85", shortLabel: "M85", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 86, stage: "ROUND_OF_32", label: "Match 86", shortLabel: "M86", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 87, stage: "ROUND_OF_32", label: "Match 87", shortLabel: "M87", home: thirdPlace([]), away: thirdPlace([]) },
  { no: 88, stage: "ROUND_OF_32", label: "Match 88", shortLabel: "M88", home: thirdPlace([]), away: thirdPlace([]) },
  // R16 — adjacent pairs: slots 1+2→M89, 3+4→M90, 5+6→M91, 7+8→M92, 9+10→M93, 11+12→M94, 13+14→M95, 15+16→M96
  { no: 89, stage: "ROUND_OF_16", label: "Match 89", shortLabel: "M89", home: winner(73), away: winner(74) },
  { no: 90, stage: "ROUND_OF_16", label: "Match 90", shortLabel: "M90", home: winner(75), away: winner(76) },
  { no: 91, stage: "ROUND_OF_16", label: "Match 91", shortLabel: "M91", home: winner(77), away: winner(78) },
  { no: 92, stage: "ROUND_OF_16", label: "Match 92", shortLabel: "M92", home: winner(79), away: winner(80) },
  { no: 93, stage: "ROUND_OF_16", label: "Match 93", shortLabel: "M93", home: winner(81), away: winner(82) },
  { no: 94, stage: "ROUND_OF_16", label: "Match 94", shortLabel: "M94", home: winner(83), away: winner(84) },
  { no: 95, stage: "ROUND_OF_16", label: "Match 95", shortLabel: "M95", home: winner(85), away: winner(86) },
  { no: 96, stage: "ROUND_OF_16", label: "Match 96", shortLabel: "M96", home: winner(87), away: winner(88) },
  // QF — adjacent R16 pairs
  { no: 97,  stage: "QUARTER_FINAL", label: "Match 97",  shortLabel: "M97",  home: winner(89), away: winner(90) },
  { no: 98,  stage: "QUARTER_FINAL", label: "Match 98",  shortLabel: "M98",  home: winner(91), away: winner(92) },
  { no: 99,  stage: "QUARTER_FINAL", label: "Match 99",  shortLabel: "M99",  home: winner(93), away: winner(94) },
  { no: 100, stage: "QUARTER_FINAL", label: "Match 100", shortLabel: "M100", home: winner(95), away: winner(96) },
  // SF
  { no: 101, stage: "SEMI_FINAL", label: "Match 101", shortLabel: "M101", home: winner(97),  away: winner(98)  },
  { no: 102, stage: "SEMI_FINAL", label: "Match 102", shortLabel: "M102", home: winner(99),  away: winner(100) },
  { no: 103, stage: "THIRD_PLACE", label: "Match 103", shortLabel: "M103", home: loser(101), away: loser(102) },
  { no: 104, stage: "FINAL",       label: "Match 104", shortLabel: "M104", home: winner(101), away: winner(102) },
];

const TEAM_FLAG_FALLBACK: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  "Bosnia-Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  Czechia: "🇨🇿",
  Curaçao: "🇨🇼",
  Ecuador: "🇪🇨",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Haiti: "🇭🇹",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Paraguay: "🇵🇾",
  Qatar: "🇶🇦",
  Scotland: "🏴",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Switzerland: "🇨🇭",
  Turkey: "🇹🇷",
  "United States": "🇺🇸"
};

function isImageUrl(value?: string | null) {
  return Boolean(value && /^(https?:)?\/\//.test(value));
}

function teamFallback(team: Team) {
  return TEAM_FLAG_FALLBACK[team.name] ?? team.flagUrl ?? team.shortName?.slice(0, 2).toUpperCase() ?? team.name.slice(0, 2).toUpperCase();
}

function TeamMark({ team }: { team: Team }) {
  const flagUrl = team.flagUrl;
  if (flagUrl && isImageUrl(flagUrl)) {
    return (
      <span className="w-7 h-7 rounded-full border border-border bg-white shadow-sm overflow-hidden grid place-items-center shrink-0">
        <img src={flagUrl} alt={`${team.name} logo`} className="w-5 h-5 object-contain" />
      </span>
    );
  }

  return (
    <span
      aria-label={`${team.name} logo`}
      className="w-7 h-7 rounded-full border border-border bg-white shadow-sm grid place-items-center shrink-0 text-[16px] leading-none"
    >
      {teamFallback(team)}
    </span>
  );
}

function TeamCell({ team }: { team: Team }) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 min-w-0">
      <TeamMark team={team} />
      <span className="font-semibold text-[13px] truncate">{team.name}</span>
    </div>
  );
}

function EntrantCell({ entrant }: { entrant: ResolvedEntrant }) {
  if (entrant.team) return <TeamCell team={entrant.team} />;

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 min-w-0">
      <span className="w-7 h-7 rounded-full border border-dashed border-border bg-gray-50 grid place-items-center shrink-0 text-[10px] font-black text-gray-400">
        TBD
      </span>
      <span className="font-semibold text-[13px] truncate text-muted-foreground">{entrant.label}</span>
    </div>
  );
}

function formatStage(stage: string) {
  return stage
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatKickoff(date: string, language: string) {
  return new Date(date).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function scoreText(match: Match) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

function knockoutScoreText(match: ResolvedKnockoutMatch) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

function sortGroups(groups: string[]) {
  return groups.sort((a, b) => {
    const ai = WORLD_CUP_GROUPS.indexOf(a);
    const bi = WORLD_CUP_GROUPS.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });
}

function scoredMatch(match?: LeagueMatch) {
  return Boolean(match && match.match.homeScore !== null && match.match.awayScore !== null);
}

function resolveActualWinner(match: ResolvedKnockoutMatch): "home" | "away" | undefined {
  if (match.winner === "HOME") return "home";
  if (match.winner === "AWAY") return "away";
  // winner field may be "DRAW" for old data (scored before the fix) — derive from scores
  if (match.penaltiesHome !== null && match.penaltiesAway !== null) {
    if (match.penaltiesHome > match.penaltiesAway) return "home";
    if (match.penaltiesHome < match.penaltiesAway) return "away";
  }
  if (match.extraTimeHome !== null && match.extraTimeAway !== null) {
    if (match.extraTimeHome > match.extraTimeAway) return "home";
    if (match.extraTimeHome < match.extraTimeAway) return "away";
  }
  if (match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore) return undefined;
  return match.homeScore > match.awayScore ? "home" : "away";
}

function getWinner(match: ResolvedKnockoutMatch): ResolvedEntrant | undefined {
  const side = resolveActualWinner(match);
  if (side === "home") return match.home;
  if (side === "away") return match.away;
  return undefined;
}

function getLoser(match: ResolvedKnockoutMatch): ResolvedEntrant | undefined {
  const side = resolveActualWinner(match);
  if (side === "home") return match.away;
  if (side === "away") return match.home;
  return undefined;
}

export default function StandingsPage() {
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [providerStandings, setProviderStandings] = useState<Record<string, GroupTeamStats[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("groups");
  const { language, t } = useLanguage();

  useEffect(() => {
    load();
  }, []);

  const KNOCKOUT_STAGES = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"];

  const load = async () => {
    setLoading(true);
    try {
      const [matchesData, standingsData] = await Promise.all([
        apiClient<{ matches: LeagueMatch[] }>("/matches?all=true"),
        apiClient<ProviderStandingsResponse>("/standings").catch(() => null)
      ]);
      setMatches(matchesData.matches);
      // Auto-switch to knockout view if any knockout match has been played
      const knockoutStarted = matchesData.matches.some(
        lm => KNOCKOUT_STAGES.includes(lm.match.stage) && ["SCORED", "LIVE"].includes(lm.status)
      );
      if (knockoutStarted) setViewMode("knockout");
      setProviderStandings(
        standingsData
          ? Object.fromEntries(
              standingsData.groups.map((standing) => [
                standing.group,
                standing.rows.map((row) => ({
                  team: row.team,
                  group: standing.group,
                  mp: row.playedGames,
                  w: row.won,
                  d: row.draw,
                  l: row.lost,
                  gf: row.goalsFor,
                  ga: row.goalsAgainst,
                  gd: row.goalDifference,
                  pts: row.points
                }))
              ])
            )
          : {}
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const fromData = matches
      .filter((lm) => lm.match.stage === "GROUP" && lm.match.groupName)
      .map((lm) => lm.match.groupName);
    return sortGroups(Array.from(new Set([...WORLD_CUP_GROUPS, ...fromData, ...Object.keys(providerStandings)])));
  }, [matches, providerStandings]);

  const groupStandings = useMemo(() => {
    return Object.fromEntries(groups.map((group) => [group, providerStandings[group] ?? []]));
  }, [groups, providerStandings]);

  const knockoutByRound = useMemo(() => {
    // Match actual DB matches to template slots by provider's externalMatchId order.
    // Football-data.org assigns sequential IDs to WC matches (match 73 in bracket = 73rd-lowest ID).
    // Sorting by externalMatchId gives the correct bracket slot order without depending on standings.
    const actualByNo = new Map<number, LeagueMatch>();

    for (const round of KNOCKOUT_ROUNDS) {
      // Within each stage, sort by externalMatchId: provider assigns IDs sequentially
      // per bracket slot (R32: 537415-537430, R16: 537375-537382, etc.)
      // Cross-stage IDs are NOT comparable; we filter by stage first so it's safe.
      const stageActuals = matches
        .filter((lm) => lm.match.stage === round.key)
        .sort((a, b) => parseInt(a.match.externalMatchId ?? "0", 10) - parseInt(b.match.externalMatchId ?? "0", 10));

      const stageTemplates = KNOCKOUT_TEMPLATES
        .filter((t) => t.stage === round.key)
        .sort((a, b) => a.no - b.no);

      stageActuals.forEach((actual, i) => {
        if (i < stageTemplates.length) actualByNo.set(stageTemplates[i].no, actual);
      });
    }

    // Build resolved matches: team comes directly from the DB (provider fills them in).
    // For later-round slots, resolve winner/loser from the matched earlier-round result.
    const resolvedByMatchNo = new Map<number, ResolvedKnockoutMatch>();

    const resolveEntrant = (ref: EntrantRef, actualTeam?: Team): ResolvedEntrant => {
      if (ref.kind === "groupRank" || ref.kind === "thirdPlace") {
        // Trust what provider has already assigned to the match record
        return { label: ref.label, team: actualTeam };
      }
      const source = resolvedByMatchNo.get(ref.matchNo);
      const resolved =
        ref.kind === "winner"
          ? source ? getWinner(source) : undefined
          : source ? getLoser(source) : undefined;
      return resolved ?? { label: ref.label, team: actualTeam };
    };

    KNOCKOUT_TEMPLATES.forEach((template) => {
      const actual = actualByNo.get(template.no);
      const resolved: ResolvedKnockoutMatch = {
        ...template,
        actual,
        home: resolveEntrant(template.home, actual?.match.homeTeam),
        away: resolveEntrant(template.away, actual?.match.awayTeam),
        homeScore: actual?.match.homeScore ?? null,
        awayScore: actual?.match.awayScore ?? null,
        extraTimeHome: actual?.match.extraTimeHome ?? null,
        extraTimeAway: actual?.match.extraTimeAway ?? null,
        penaltiesHome: actual?.match.penaltiesHome ?? null,
        penaltiesAway: actual?.match.penaltiesAway ?? null,
        duration: actual?.match.duration ?? null,
        winner: actual?.match.winner ?? "UNKNOWN",
        kickoffAt: actual?.match.kickoffAt,
        status: actual?.status ?? "TBD",
      };
      resolvedByMatchNo.set(template.no, resolved);
    });

    return KNOCKOUT_ROUNDS.map((round) => ({
      ...round,
      matches: KNOCKOUT_TEMPLATES.filter((template) => template.stage === round.key).map((template) => resolvedByMatchNo.get(template.no)!),
    }));
  }, [matches]);

  const knockoutMatchCount = knockoutByRound.reduce((total, round) => total + round.matches.filter((match) => match.actual).length, 0);
  const knockoutMatchesByNo = useMemo(() => {
    return new Map(knockoutByRound.flatMap((round) => round.matches.map((match) => [match.no, match] as const)));
  }, [knockoutByRound]);

  return (
    <NavigationShell>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-foreground mb-1">
            {t("standingsTitle")}
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {t("standingsDesc")}
          </p>
        </div>

        <div className="inline-flex p-1 bg-white border border-border rounded-lg shadow-sm w-fit">
          <button
            onClick={() => setViewMode("groups")}
            className={`min-h-[34px] px-4 rounded-md text-[13px] font-extrabold transition-all ${
              viewMode === "groups" ? "bg-[#2F7D5C] text-white" : "text-muted-foreground hover:bg-gray-50"
            }`}
          >
            {t("groupsViewBtn")}
          </button>
          <button
            onClick={() => setViewMode("knockout")}
            className={`min-h-[34px] px-4 rounded-md text-[13px] font-extrabold transition-all ${
              viewMode === "knockout" ? "bg-[#2F7D5C] text-white" : "text-muted-foreground hover:bg-gray-50"
            }`}
          >
            {t("knockoutViewBtn")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
            style={{ borderColor: "#2F7D5C", borderTopColor: "transparent" }}
          />
          <p className="text-sm font-bold text-muted-foreground" style={{ color: "#2F7D5C" }}>
            {t("loading")}
          </p>
        </div>
      ) : viewMode === "groups" ? (
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {groups.map((group) => {
              const rows = groupStandings[group] ?? [];
              const playedMatches = providerStandings[group]
                ? Math.floor(providerStandings[group].reduce((total, row) => total + row.mp, 0) / 2)
                : 0;

              return (
                <article key={group} className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-bold">{t("groupStageLabel").replace("{group}", group)}</h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {playedMatches} / 6 {t("matchesScoredSuffix")}
                      </p>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#2F7D5C] bg-[#E8F5E9] border border-[#C8E6C9] rounded-full px-2.5 py-1">
                      {rows.length} {t("teamsCountSuffix")}
                    </span>
                  </div>

                  {rows.length === 0 ? (
                    <div className="py-10 px-5 text-center text-[13px] text-muted-foreground bg-white">
                      <AlertCircle className="mx-auto text-gray-300 mb-2" size={24} />
                      {t("noFixturesForGroup")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="kp-table min-w-[620px]">
                        <thead>
                          <tr>
                            <th className="th-center" style={{ width: 44 }}>
                              #
                            </th>
                            <th>{t("teamTableCol")}</th>
                            <th className="th-center">MP</th>
                            <th className="th-center">W</th>
                            <th className="th-center">D</th>
                            <th className="th-center">L</th>
                            <th className="th-center">GF</th>
                            <th className="th-center">GA</th>
                            <th className="th-center">GD</th>
                            <th className="th-center">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((stat, index) => (
                            <tr
                              key={stat.team.id}
                              style={{ background: index < 2 ? "#F0FDF4" : index === 2 ? "#FFFBEB" : undefined }}
                            >
                              <td className="td-center" style={{ fontWeight: 800, color: index < 2 ? "#16A34A" : "#9CA3AF" }}>
                                {index + 1}
                                {index < 2 && <span className="block text-[10px] font-bold text-success">Q</span>}
                              </td>
                              <td>
                                <TeamCell team={stat.team} />
                              </td>
                              <td className="td-center font-medium">{stat.mp}</td>
                              <td className="td-center">{stat.w}</td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.d}
                              </td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.l}
                              </td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.gf}
                              </td>
                              <td className="td-center" style={{ color: "#6B7280" }}>
                                {stat.ga}
                              </td>
                              <td
                                className="td-center font-bold"
                                style={{ color: stat.gd > 0 ? "#16A34A" : stat.gd < 0 ? "#DC2626" : "#6B7280" }}
                              >
                                {stat.gd > 0 ? `+${stat.gd}` : stat.gd}
                              </td>
                              <td className="td-center" style={{ fontSize: 16, fontWeight: 900 }}>
                                {stat.pts}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-5 px-5 py-3 border border-border rounded-lg flex flex-wrap gap-4 text-[12px] text-muted-foreground bg-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300" />
              {t("statusQualified")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-100 border border-yellow-300" />
              {t("statusPlayoff")}
            </span>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="kp-card flex items-center justify-between gap-4 flex-wrap" style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] border border-[#C8E6C9] grid place-items-center text-[#2F7D5C]">
                <GitBranch size={20} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold">
                  {t("knockoutBracketTitle")}
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  {knockoutMatchCount > 0
                    ? t("knockoutFixturesCount").replace("{count}", knockoutMatchCount.toString())
                    : t("knockoutFixturesTBD")}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#2F7D5C] bg-[#E8F5E9] border border-[#C8E6C9] rounded-full px-3 py-1.5">
              <Trophy size={14} />
              {t("finalPathLabel")}
            </span>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              {t("wc2026Notice")}
            </div>

            <article className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold">{t("onewayBracketTitle")}</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {t("onewayBracketDesc")}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#2F7D5C] bg-[#E8F5E9] border border-[#C8E6C9] rounded-full px-3 py-1.5">
                  <Trophy size={14} />
                  {t("finalPathLabel")}
                </span>
              </div>

              <div className="p-4">
                <KnockoutBracket knockoutMatchesByNo={knockoutMatchesByNo} language={language} />
              </div>
            </article>

          </div>
        </section>
      )}
    </NavigationShell>
  );
}
