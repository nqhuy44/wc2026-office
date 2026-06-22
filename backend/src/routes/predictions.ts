import type { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../lib/prisma.js";
import { refreshLeagueMatchStatuses, HOPE_STAR_COUNT_SETTING_KEY } from "../lib/league-match-state.js";

const predictionSchema = z.object({
  homeScorePred: z.number().min(0),
  awayScorePred: z.number().min(0),
});

async function getHopeStarAllowance(leagueId: string): Promise<number> {
  const setting = await prisma.appSetting.findUnique({
    where: { leagueId_key: { leagueId, key: HOPE_STAR_COUNT_SETTING_KEY } }
  });
  const val = setting?.value;
  return typeof val === "number" && val > 0 ? Math.trunc(val) : 0;
}

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
      where: { leagueMatchId_memberId: { leagueMatchId, memberId } },
      update: { homeScorePred, awayScorePred, points: 0, resultType: "PENDING" },
      create: { leagueMatchId, memberId, homeScorePred, awayScorePred }
    });

    return { prediction };
  });

  // Toggle hope star on a prediction (only while match is still OPEN)
  app.put("/predictions/:leagueMatchId/hope-star", { preHandler: [app.requireLeagueMember] }, async (request, reply) => {
    const { leagueMatchId } = request.params as { leagueMatchId: string };
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

    const prediction = await prisma.prediction.findUnique({
      where: { leagueMatchId_memberId: { leagueMatchId, memberId } }
    });

    if (!prediction) {
      return reply.status(400).send({ error: "Bad Request", code: "errNoPredictionYet" });
    }

    const allowance = await getHopeStarAllowance(leagueId);
    if (allowance === 0) {
      return reply.status(400).send({ error: "Bad Request", code: "errHopeStarDisabled" });
    }

    // If disabling, just toggle off
    if (prediction.isHopeStar) {
      const updated = await prisma.prediction.update({
        where: { id: prediction.id },
        data: { isHopeStar: false }
      });
      return { prediction: updated, hopeStarUsed: await countUsedStars(memberId, leagueId), hopeStarTotal: allowance };
    }

    // If enabling, check quota
    const used = await countUsedStars(memberId, leagueId);
    if (used >= allowance) {
      return reply.status(400).send({ error: "Bad Request", code: "errHopeStarQuotaExceeded" });
    }

    const updated = await prisma.prediction.update({
      where: { id: prediction.id },
      data: { isHopeStar: true }
    });

    return { prediction: updated, hopeStarUsed: used + 1, hopeStarTotal: allowance };
  });

  app.get("/matches/:leagueMatchId/predictions", { preHandler: [app.requireLeagueMember] }, async (request, reply) => {
    return reply.status(410).send({ error: "Gone", code: "errLegacyPredictionsRouteDisabled" });
  });
}

async function countUsedStars(memberId: string, leagueId: string): Promise<number> {
  return prisma.prediction.count({
    where: {
      memberId,
      isHopeStar: true,
      leagueMatch: { leagueId }
    }
  });
}
