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
//   Base:     exact=+3, correct=+1, wrong=0
//   HopeStar: base×2 (wrong=-2) → exact=+6, correct=+2, wrong=-2
//   Bonus:    adds exact=+3, correct=+2, wrong=+0 on top of the above
//
// Examples:
//   Normal:           3 / 1 / 0
//   Bonus only:       6 / 3 / 0
//   HopeStar only:    6 / 2 / -2
//   HopeStar+Bonus:   9 / 4 / -2
function computePoints(resultType: string, isBonus: boolean, isHopeStar: boolean): number {
  const isExact   = resultType === "EXACT_SCORE";
  const isCorrect = resultType === "CORRECT_RESULT";

  // Hope star: doubles base, wrong=-2
  const hsPoints = isHopeStar
    ? (isExact ? 6 : isCorrect ? 2 : -2)
    : (isExact ? 3 : isCorrect ? 1 : 0);

  // Bonus: flat additive (no effect on wrong)
  const bonusPoints = isBonus ? (isExact ? 3 : isCorrect ? 2 : 0) : 0;

  return hsPoints + bonusPoints;
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
    let matchWinner = "DRAW";
    if (home90 > away90) matchWinner = "HOME";
    else if (home90 < away90) matchWinner = "AWAY";
    else {
      // 90-min draw: actual winner via ET cumulative score, then penalties
      const etH = (match as any).extraTimeHome as number | null;
      const etA = (match as any).extraTimeAway as number | null;
      const penH = (match as any).penaltiesHome as number | null;
      const penA = (match as any).penaltiesAway as number | null;
      if (penH !== null && penA !== null) {
        if (penH > penA) matchWinner = "HOME";
        else if (penH < penA) matchWinner = "AWAY";
      } else if (etH !== null && etA !== null) {
        if (etH > etA) matchWinner = "HOME";
        else if (etH < etA) matchWinner = "AWAY";
      }
    }

    await tx.match.update({
      where: { id: matchId },
      data: { winner: matchWinner as any, status: "SCORED", scoredAt: new Date() }
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

        const points = computePoints(resultType, lm.isBonus, pred.isHopeStar);

        await tx.prediction.update({
          where: { id: pred.id },
          data: { points, resultType: resultType as any }
        });
      }
    }
  });
}
