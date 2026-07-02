export interface MatchScoreFields {
  homeScore: number | null;             // final total score (includes ET goals)
  awayScore: number | null;
  regularTimeHome?: number | null;      // 90-min score only
  regularTimeAway?: number | null;
  extraTimeHome?: number | null;        // goals scored in ET period only (not cumulative)
  extraTimeAway?: number | null;
  penaltiesHome?: number | null;
  penaltiesAway?: number | null;
  duration?: string | null;
}

export interface ScoreDisplay {
  hasResult: boolean;
  homeMain: number | null;   // final total score (= homeScore)
  awayMain: number | null;
  home90: number | null;     // 90-min score; non-null only when match went to ET/pen
  away90: number | null;
  suffix: "aet" | "pen" | null;
  homePen: number | null;
  awayPen: number | null;
}

export function parseScore(m: MatchScoreFields): ScoreDisplay {
  if (m.homeScore === null || m.awayScore === null) {
    return { hasResult: false, homeMain: null, awayMain: null, home90: null, away90: null, suffix: null, homePen: null, awayPen: null };
  }

  const hasET  = m.extraTimeHome != null && m.extraTimeAway != null;
  const hasPen = m.penaltiesHome != null && m.penaltiesAway != null;

  // Only surface the 90-min score when the match went beyond 90 minutes
  const home90 = (hasET || hasPen) ? (m.regularTimeHome ?? null) : null;
  const away90 = (hasET || hasPen) ? (m.regularTimeAway ?? null) : null;

  return {
    hasResult: true,
    homeMain: m.homeScore,   // final total (including ET goals)
    awayMain: m.awayScore,
    home90,
    away90,
    suffix: hasPen ? "pen" : hasET ? "aet" : null,
    homePen: hasPen ? m.penaltiesHome! : null,
    awayPen: hasPen ? m.penaltiesAway! : null,
  };
}

// "3-2 (aet, 90': 2-2)" | "1-1 (aet, 4-3 pen)" | "2-1"
export function scoreText(m: MatchScoreFields, sep = "—"): string {
  const s = parseScore(m);
  if (!s.hasResult) return "vs";
  const main = `${s.homeMain}${sep}${s.awayMain}`;
  if (s.suffix === "pen") return `${main} (aet, ${s.homePen}-${s.awayPen} pen)`;
  if (s.suffix === "aet") return `${main} (aet, 90': ${s.home90}${sep}${s.away90})`;
  return main;
}
