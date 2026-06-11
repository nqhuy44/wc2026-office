import type { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../lib/prisma.js";
import { refreshLeagueMatchStatuses } from "../lib/league-match-state.js";

const predictionSchema = z.object({
  homeScorePred: z.number().min(0),
  awayScorePred: z.number().min(0),
});

export async function predictionRoutes(app: FastifyInstance) {
  app.put("/predictions/:leagueMatchId", { preHandler: [app.requireLeagueMember] }, async (request, reply) => {
    const { leagueMatchId } = request.params as { leagueMatchId: string };
    const { homeScorePred, awayScorePred } = predictionSchema.parse(request.body);
    const memberId = request.leagueMember!.id;
    const leagueId = request.leagueMember!.leagueId;

    await refreshLeagueMatchStatuses(leagueId);

    const leagueMatch = await prisma.leagueMatch.findUnique({
      where: { id: leagueMatchId },
      include: { match: true }
    });

    if (!leagueMatch || leagueMatch.leagueId !== leagueId) {
      return reply.status(404).send({ error: "Not Found", code: "errMatchNotFound" });
    }

    if (!leagueMatch.isPredictionEnabled || leagueMatch.status !== "OPEN") {
      return reply.status(400).send({ error: "Bad Request", code: "errPredictionNotAllowed" });
    }

    if (leagueMatch.lockAt && leagueMatch.lockAt < new Date()) {
      return reply.status(400).send({ error: "Bad Request", code: "errPredictionTimeExpired" });
    }

    if (leagueMatch.match.kickoffAt <= new Date()) {
      return reply.status(400).send({ error: "Bad Request", code: "errMatchAlreadyStarted" });
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        leagueMatchId_memberId: {
          leagueMatchId,
          memberId
        }
      },
      update: {
        homeScorePred,
        awayScorePred,
        points: 0,
        resultType: "PENDING"
      },
      create: {
        leagueMatchId,
        memberId,
        homeScorePred,
        awayScorePred
      }
    });

    return { prediction };
  });

  app.get("/matches/:leagueMatchId/predictions", { preHandler: [app.requireLeagueMember] }, async (request, reply) => {
    return reply.status(410).send({ error: "Gone", code: "errLegacyPredictionsRouteDisabled" });
  });
}
