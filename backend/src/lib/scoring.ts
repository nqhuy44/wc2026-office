import { prisma } from "./prisma.js";

export async function scoreMatch(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      leagueMatches: {
        include: {
          predictions: true
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
  await prisma.match.update({
    where: { id: matchId },
    data: { winner: matchWinner as any, status: "SCORED", scoredAt: new Date() }
  });

  // Score predictions
  for (const lm of match.leagueMatches) {
    if (!lm.isPredictionEnabled && lm.status !== "LOCKED") {
      await prisma.leagueMatch.update({
        where: { id: lm.id },
        data: { status: "SCORED" }
      });
      await prisma.prediction.updateMany({
        where: { leagueMatchId: lm.id },
        data: { points: 0, resultType: "VOID" as any }
      });
      continue;
    }

    await prisma.leagueMatch.update({
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

      await prisma.prediction.update({
        where: { id: pred.id },
        data: { points, resultType: resultType as any }
      });
    }
  }
}
