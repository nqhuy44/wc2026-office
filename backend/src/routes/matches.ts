import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { refreshLeagueMatchStatuses, HOPE_STAR_COUNT_SETTING_KEY } from "../lib/league-match-state.js";

export async function matchRoutes(app: FastifyInstance) {
  app.get("/matches", { preHandler: [app.requireLeagueMember] }, async (request) => {
    const leagueMember = request.leagueMember!;
    const leagueId = leagueMember.leagueId;
    const query = request.query as { all?: string };
    const showAll = query.all === "true";

    await refreshLeagueMatchStatuses(leagueId);

    const [leagueMatches, hopeStarSetting, hopeStarUsed] = await Promise.all([
      prisma.leagueMatch.findMany({
        where: {
          leagueId,
          ...(!showAll ? {
            OR: [
              { isPredictionEnabled: true },
              { predictions: { some: { memberId: leagueMember.id, resultType: { not: "VOID" } } } }
            ]
          } : {})
        },
        include: {
          match: { include: { homeTeam: true, awayTeam: true } },
          predictions: {
            where: { memberId: leagueMember.id, resultType: { not: "VOID" } }
          }
        },
        orderBy: { match: { kickoffAt: 'asc' } }
      }),
      prisma.appSetting.findUnique({
        where: { leagueId_key: { leagueId, key: HOPE_STAR_COUNT_SETTING_KEY } }
      }),
      prisma.prediction.count({
        where: { memberId: leagueMember.id, isHopeStar: true, leagueMatch: { leagueId } }
      })
    ]);

    const hopeStarTotal = typeof hopeStarSetting?.value === "number" ? Math.max(0, Math.trunc(hopeStarSetting.value as number)) : 0;

    const mappedMatches = leagueMatches.map(lm => ({
      id: lm.id,
      status: lm.status,
      isPredictionEnabled: lm.isPredictionEnabled,
      isBonus: lm.isBonus,
      lockAt: lm.lockAt,
      match: {
        id: lm.match.id,
        externalMatchId: lm.match.externalMatchId,
        stage: lm.match.stage,
        groupName: lm.match.groupName,
        kickoffAt: lm.match.kickoffAt,
        homeScore: lm.match.homeScore,
        awayScore: lm.match.awayScore,
        regularTimeHome: lm.match.regularTimeHome,
        regularTimeAway: lm.match.regularTimeAway,
        extraTimeHome: lm.match.extraTimeHome,
        extraTimeAway: lm.match.extraTimeAway,
        penaltiesHome: lm.match.penaltiesHome,
        penaltiesAway: lm.match.penaltiesAway,
        duration: lm.match.duration,
        winner: lm.match.winner,
        homeTeam: {
          id: lm.match.homeTeam.id,
          name: lm.match.homeTeam.name,
          shortName: lm.match.homeTeam.shortName,
          countryCode: lm.match.homeTeam.countryCode,
          flagUrl: lm.match.homeTeam.flagUrl
        },
        awayTeam: {
          id: lm.match.awayTeam.id,
          name: lm.match.awayTeam.name,
          shortName: lm.match.awayTeam.shortName,
          countryCode: lm.match.awayTeam.countryCode,
          flagUrl: lm.match.awayTeam.flagUrl
        }
      },
      myPrediction: lm.predictions[0] ? {
        id: lm.predictions[0].id,
        homeScorePred: lm.predictions[0].homeScorePred,
        awayScorePred: lm.predictions[0].awayScorePred,
        isHopeStar: lm.predictions[0].isHopeStar,
        points: lm.predictions[0].points,
        resultType: lm.predictions[0].resultType
      } : null
    }));

    return { matches: mappedMatches, hopeStarTotal, hopeStarUsed };
  });
}
