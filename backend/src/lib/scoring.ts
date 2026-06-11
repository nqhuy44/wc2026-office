import { prisma } from "./prisma.js";

export async function scoreMatch(matchId: string) {
  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        leagueMatches: {
          include: {
            predictions: {
              where: {
                resultType: {
                  not: "VOID"
                }
              }
            }
          }
        }
      }
    });

    if (!match || match.homeScore === null || match.awayScore === null) return;

    const actualHome = match.homeScore;
    const actualAway = match.awayScore;
    let matchWinner = "DRAW";
    if (actualHome > actualAway) matchWinner = "HOME";
    if (actualHome < actualAway) matchWinner = "AWAY";

    // Update match winner
    await tx.match.update({
      where: { id: matchId },
      data: { winner: matchWinner as any, status: "SCORED", scoredAt: new Date() }
    });

    // Score predictions. VOID predictions are intentionally skipped: they represent
    // picks invalidated by closing a match, and must not come back if reopened.
    for (const lm of match.leagueMatches) {
      if (!lm.isPredictionEnabled) {
        await tx.leagueMatch.update({
          where: { id: lm.id },
          data: { status: "SCORED" }
        });
        await tx.prediction.updateMany({
          where: { leagueMatchId: lm.id },
          data: { points: 0, resultType: "VOID" as any }
        });
        continue;
      }

      await tx.leagueMatch.update({
        where: { id: lm.id },
        data: { status: "SCORED" }
      });

      for (const pred of lm.predictions) {
        const predHome = pred.homeScorePred;
        const predAway = pred.awayScorePred;
        
        let predWinner = "DRAW";
        if (predHome > predAway) predWinner = "HOME";
        if (predHome < predAway) predWinner = "AWAY";

        let points = 0;
        let resultType = "WRONG";

        if (predHome === actualHome && predAway === actualAway) {
          points = 3;
          resultType = "EXACT_SCORE";
        } else if (predWinner === matchWinner) {
          points = 1;
          resultType = "CORRECT_RESULT";
        }

        await tx.prediction.update({
          where: { id: pred.id },
          data: { points, resultType: resultType as any }
        });
      }
    }
  });
}
