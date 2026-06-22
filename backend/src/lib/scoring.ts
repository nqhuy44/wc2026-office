import { prisma } from "./prisma.js";
import { SCORE_BY_EXTRA_TIME_SETTING_KEY } from "./league-match-state.js";

function resolveEffectiveScore(match: {
  homeScore: number | null;
  awayScore: number | null;
  extraTimeHome: number | null;
  extraTimeAway: number | null;
}, useExtraTime: boolean) {
  if (useExtraTime && match.extraTimeHome !== null && match.extraTimeAway !== null) {
    return { home: match.extraTimeHome, away: match.extraTimeAway };
  }
  return { home: match.homeScore ?? 0, away: match.awayScore ?? 0 };
}

// Points formula:
//   m = pointMultiplier (1, 2, 3...)
//   h = isHopeStar
//
// Without HS: exact = 3m,      correct = m,    wrong = 0
// With HS:    exact = 3(m+1),  correct = 2m-1, wrong = -3m
//
// Verified: m=1 HS → 6, 1, -3 | m=2 HS → 9, 3, -6
function computePoints(resultType: string, multiplier: number, isHopeStar: boolean): number {
  if (!isHopeStar) {
    if (resultType === "EXACT_SCORE") return 3 * multiplier;
    if (resultType === "CORRECT_RESULT") return multiplier;
    return 0;
  }
  if (resultType === "EXACT_SCORE") return 3 * (multiplier + 1);
  if (resultType === "CORRECT_RESULT") return 2 * multiplier - 1;
  return -3 * multiplier;
}

export async function scoreMatch(matchId: string) {
  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        leagueMatches: {
          include: {
            predictions: {
              where: { resultType: { not: "VOID" } }
            },
            league: {
              include: { settings: { where: { key: SCORE_BY_EXTRA_TIME_SETTING_KEY } } }
            }
          }
        }
      }
    });

    if (!match || match.homeScore === null || match.awayScore === null) return;

    const home90 = match.homeScore;
    const away90 = match.awayScore;
    let winner90 = "DRAW";
    if (home90 > away90) winner90 = "HOME";
    if (home90 < away90) winner90 = "AWAY";

    await tx.match.update({
      where: { id: matchId },
      data: { winner: winner90 as any, status: "SCORED", scoredAt: new Date() }
    });

    for (const lm of match.leagueMatches) {
      if (!lm.isPredictionEnabled) {
        await tx.leagueMatch.update({ where: { id: lm.id }, data: { status: "SCORED" } });
        await tx.prediction.updateMany({
          where: { leagueMatchId: lm.id },
          data: { points: 0, resultType: "VOID" as any }
        });
        continue;
      }

      await tx.leagueMatch.update({ where: { id: lm.id }, data: { status: "SCORED" } });

      const useET = lm.league.settings.some(s => s.value === true);
      const { home: actualHome, away: actualAway } = resolveEffectiveScore(match, useET);
      let matchWinner = "DRAW";
      if (actualHome > actualAway) matchWinner = "HOME";
      if (actualHome < actualAway) matchWinner = "AWAY";

      const multiplier = lm.pointMultiplier ?? 1;

      for (const pred of lm.predictions) {
        const predHome = pred.homeScorePred;
        const predAway = pred.awayScorePred;
        let predWinner = "DRAW";
        if (predHome > predAway) predWinner = "HOME";
        if (predHome < predAway) predWinner = "AWAY";

        let resultType = "WRONG";
        if (predHome === actualHome && predAway === actualAway) {
          resultType = "EXACT_SCORE";
        } else if (predWinner === matchWinner) {
          resultType = "CORRECT_RESULT";
        }

        const points = computePoints(resultType, multiplier, pred.isHopeStar);

        await tx.prediction.update({
          where: { id: pred.id },
          data: { points, resultType: resultType as any }
        });
      }
    }
  });
}
