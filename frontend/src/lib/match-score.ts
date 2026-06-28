export interface MatchScoreFields {
  homeScore: number | null;
  awayScore: number | null;
  extraTimeHome?: number | null;
  extraTimeAway?: number | null;
  penaltiesHome?: number | null;
  penaltiesAway?: number | null;
  duration?: string | null;
}

export interface ScoreDisplay {
  hasResult: boolean;
  // Score to show prominently (ET cumulative when went to ET/pen, else 90-min)
  homeMain: number | null;
  awayMain: number | null;
  // "aet" or "pen" label; null for regular
  suffix: "aet" | "pen" | null;
  // Penalty goals (separate, non-cumulative)
  homePen: number | null;
  awayPen: number | null;
}

export function parseScore(m: MatchScoreFields): ScoreDisplay {
  if (m.homeScore === null || m.awayScore === null) {
    return { hasResult: false, homeMain: null, awayMain: null, suffix: null, homePen: null, awayPen: null };
  }

  const hasET  = m.extraTimeHome != null && m.extraTimeAway != null;
  const hasPen = m.penaltiesHome != null && m.penaltiesAway != null;

  // ET cumulative score is the "display" score when match went to ET
  const homeMain = hasET ? m.extraTimeHome! : m.homeScore;
  const awayMain = hasET ? m.extraTimeAway! : m.awayScore;

  return {
    hasResult: true,
    homeMain,
    awayMain,
    suffix: hasPen ? "pen" : hasET ? "aet" : null,
    homePen: hasPen ? m.penaltiesHome! : null,
    awayPen: hasPen ? m.penaltiesAway! : null,
  };
}

// Plain text: "2 — 1" | "2 — 1 (aet)" | "1 — 1 (aet, 4-5 pen)"
export function scoreText(m: MatchScoreFields, sep = "—"): string {
  const s = parseScore(m);
  if (!s.hasResult) return "vs";
  const main = `${s.homeMain} ${sep} ${s.awayMain}`;
  if (s.suffix === "pen") return `${main} (aet, ${s.homePen}-${s.awayPen} pen)`;
  if (s.suffix === "aet") return `${main} (aet)`;
  return main;
}
