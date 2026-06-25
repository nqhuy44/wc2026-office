import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

const KNOCKOUT_STAGES = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"];

function buildLeaderboard(members: Array<{
  id: string;
  nickname: string;
  predictions: Array<{ points: number; resultType: string }>;
}>) {
  const rows = members.map(m => {
    const totalPoints = m.predictions.reduce((sum, pred) => sum + pred.points, 0);
    const exactMatches = m.predictions.filter(pred => pred.resultType === "EXACT_SCORE").length;
    const correctResults = m.predictions.filter(pred => pred.resultType === "CORRECT_RESULT").length;

    return {
      id: m.id,
      nickname: m.nickname,
      totalPoints,
      exactMatches,
      correctResults,
      totalPredictions: m.predictions.length,
    };
  });

  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.exactMatches - a.exactMatches ||
      b.correctResults - a.correctResults ||
      b.totalPredictions - a.totalPredictions ||
      a.nickname.localeCompare(b.nickname)
  );

  return rows;
}

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get("/leaderboard", { preHandler: [app.requireLeagueMember] }, async (request) => {
    const leagueId = request.leagueMember!.leagueId;

    const members = await prisma.leagueMember.findMany({
      where: { leagueId },
      select: {
        id: true,
        nickname: true,
        predictions: {
          where: {
            resultType: { in: ["EXACT_SCORE", "CORRECT_RESULT", "WRONG"] }
          },
          select: {
            points: true,
            resultType: true,
            leagueMatch: {
              select: {
                match: { select: { stage: true } }
              }
            }
          }
        }
      }
    });

    const overall = buildLeaderboard(members.map(m => ({
      id: m.id,
      nickname: m.nickname,
      predictions: m.predictions,
    })));

    const group = buildLeaderboard(members.map(m => ({
      id: m.id,
      nickname: m.nickname,
      predictions: m.predictions.filter(p => p.leagueMatch.match.stage === "GROUP"),
    })));

    const knockout = buildLeaderboard(members.map(m => ({
      id: m.id,
      nickname: m.nickname,
      predictions: m.predictions.filter(p => KNOCKOUT_STAGES.includes(p.leagueMatch.match.stage)),
    })));

    return { leaderboard: overall, group, knockout };
  });
}
