import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get("/leaderboard", { preHandler: [app.requireLeagueMember] }, async (request) => {
    const leagueId = request.leagueMember!.leagueId;

    const members = await prisma.leagueMember.findMany({
      where: { 
        leagueId
      },
      select: {
        id: true,
        nickname: true,
        predictions: {
          where: {
            resultType: {
              in: ["EXACT_SCORE", "CORRECT_RESULT", "WRONG"]
            }
          },
          select: {
            points: true,
            resultType: true
          }
        }
      }
    });

    const leaderboard = members.map(m => {
      const totalPoints = m.predictions.reduce((sum, pred) => sum + pred.points, 0);
      const exactMatches = m.predictions.filter(pred => pred.resultType === "EXACT_SCORE").length;
      const correctResults = m.predictions.filter(pred => pred.resultType === "CORRECT_RESULT").length;

      return {
        id: m.id,
        nickname: m.nickname,
        totalPoints,
        exactMatches,
        correctResults,
        totalPredictions: m.predictions.length
      };
    });

    leaderboard.sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.exactMatches - a.exactMatches ||
        b.correctResults - a.correctResults ||
        b.totalPredictions - a.totalPredictions ||
        a.nickname.localeCompare(b.nickname)
    );

    return { leaderboard };
  });
}
