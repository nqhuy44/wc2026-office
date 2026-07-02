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
  homeMain: number | null;   // 90-min score (the big primary number)
  awayMain: number | null;
  homeAET: number | null;    // AET total (homeScore); non-null only when match went to ET/pen
  awayAET: number | null;
  suffix: "aet" | "pen" | null;
  homePen: number | null;
  awayPen: number | null;
}

export function parseScore(m: MatchScoreFields): ScoreDisplay {
  if (m.homeScore === null || m.awayScore === null) {
    return { hasResult: false, homeMain: null, awayMain: null, homeAET: null, awayAET: null, suffix: null, homePen: null, awayPen: null };
  }

  const hasET  = m.extraTimeHome != null && m.extraTimeAway != null;
  const hasPen = m.penaltiesHome != null && m.penaltiesAway != null;
  const hasExtra = hasET || hasPen;

  // Big number = 90-min score when ET/pen happened; otherwise homeScore (which equals 90-min for normal matches)
  const homeMain = hasExtra ? (m.regularTimeHome ?? m.homeScore) : m.homeScore;
  const awayMain = hasExtra ? (m.regularTimeAway ?? m.awayScore) : m.awayScore;

  // AET total = homeScore (90min + ET goals); shown only when match went beyond 90 min
  const homeAET = hasExtra ? m.homeScore : null;
  const awayAET = hasExtra ? m.awayScore : null;

  return {
    hasResult: true,
    homeMain,
    awayMain,
    homeAET,
    awayAET,
    suffix: hasPen ? "pen" : hasET ? "aet" : null,
    homePen: hasPen ? m.penaltiesHome! : null,
    awayPen: hasPen ? m.penaltiesAway! : null,
  };
}

// "2-2 (ft) / 3-2 aet" | "2-2 / 3-2 aet, 4-3 pen" | "2-1"
export function scoreText(m: MatchScoreFields, sep = "—"): string {
  const s = parseScore(m);
  if (!s.hasResult) return "vs";
  const main = `${s.homeMain}${sep}${s.awayMain}`;
  if (s.suffix === "pen") return `${main} (aet ${s.homeAET}-${s.awayAET}, ${s.homePen}-${s.awayPen} pen)`;
  if (s.suffix === "aet") return `${main} (aet ${s.homeAET}${sep}${s.awayAET})`;
  return main;
}
