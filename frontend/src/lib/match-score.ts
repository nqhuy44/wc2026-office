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
  // 90-min score — what 90-min leagues score predictions against
  homeMain: number | null;
  awayMain: number | null;
  // "aet" or "pen" when match went to extra time / penalties
  suffix: "aet" | "pen" | null;
  // ET cumulative score (null when match ended in regular time)
  homeET: number | null;
  awayET: number | null;
  // Penalty shootout goals only (non-cumulative)
  homePen: number | null;
  awayPen: number | null;
}

export function parseScore(m: MatchScoreFields): ScoreDisplay {
  if (m.homeScore === null || m.awayScore === null) {
    return { hasResult: false, homeMain: null, awayMain: null, suffix: null, homeET: null, awayET: null, homePen: null, awayPen: null };
  }

  const hasET  = m.extraTimeHome != null && m.extraTimeAway != null;
  const hasPen = m.penaltiesHome != null && m.penaltiesAway != null;

  return {
    hasResult: true,
    homeMain: m.homeScore,   // always the 90-min score
    awayMain: m.awayScore,
    suffix: hasPen ? "pen" : hasET ? "aet" : null,
    homeET: hasET ? m.extraTimeHome! : null,
    awayET: hasET ? m.extraTimeAway! : null,
    homePen: hasPen ? m.penaltiesHome! : null,
    awayPen: hasPen ? m.penaltiesAway! : null,
  };
}

// Plain text: "2-1" | "2-2 (3-2 aet)" | "1-1 (2-2 aet, 4-5 pen)"
export function scoreText(m: MatchScoreFields, sep = "—"): string {
  const s = parseScore(m);
  if (!s.hasResult) return "vs";
  const main = `${s.homeMain}${sep}${s.awayMain}`;
  if (s.suffix === "pen") return `${main} (${s.homeET}${sep}${s.awayET} aet, ${s.homePen}-${s.awayPen} pen)`;
  if (s.suffix === "aet") return `${main} (${s.homeET}${sep}${s.awayET} aet)`;
  return main;
}
