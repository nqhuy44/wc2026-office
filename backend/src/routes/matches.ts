import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { refreshLeagueMatchStatuses } from "../lib/league-match-state.js";

export async function matchRoutes(app: FastifyInstance) {
  app.get("/matches", { preHandler: [app.requireLeagueMember] }, async (request) => {
    const leagueMember = request.leagueMember!;
    const leagueId = leagueMember.leagueId;
    const query = request.query as { all?: string };
    const showAll = query.all === "true";

    await refreshLeagueMatchStatuses(leagueId);

    const leagueMatches = await prisma.leagueMatch.findMany({
      where: {
        leagueId,
        // Regular users see active league matches, plus any match they already predicted
        // so closed matches don't reappear just because the global fixture went live/finished.
        // Admin passes ?all=true to see everything.
        ...(!showAll ? {
          OR: [
            { isPredictionEnabled: true },
            { predictions: { some: { memberId: leagueMember.id, resultType: { not: "VOID" } } } }
          ]
        } : {})
      },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        },
        predictions: {
          where: {
            memberId: leagueMember.id,
            resultType: { not: "VOID" }
          }
        }
      },
      orderBy: {
        match: {
          kickoffAt: 'asc'
        }
      }
    });

    const mappedMatches = leagueMatches.map(lm => ({
      id: lm.id,
      status: lm.status,
      isPredictionEnabled: lm.isPredictionEnabled,
      lockAt: lm.lockAt,
      match: {
        id: lm.match.id,
        externalMatchId: lm.match.externalMatchId,
        stage: lm.match.stage,
        groupName: lm.match.groupName,
        kickoffAt: lm.match.kickoffAt,
        homeScore: lm.match.homeScore,
        awayScore: lm.match.awayScore,
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
        points: lm.predictions[0].points,
        resultType: lm.predictions[0].resultType
      } : null
    }));

    return { matches: mappedMatches };
  });
}
