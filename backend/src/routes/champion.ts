import type { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../lib/prisma.js";

// WC 2026 opening day — picks lock at the start of June 12
const CHAMPION_LOCK_AT = new Date("2026-06-12T00:00:00.000Z");

export async function championRoutes(app: FastifyInstance) {
  app.get("/teams", { preHandler: [app.requireLeagueMember] }, async () => {
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, shortName: true, flagUrl: true, countryCode: true }
    });
    return { teams };
  });

  app.get("/champion-pick", { preHandler: [app.requireLeagueMember] }, async (request) => {
    const { leagueId, id: memberId } = request.leagueMember!;
    const isLocked = new Date() >= CHAMPION_LOCK_AT;

    const [myPick, allPicks, league] = await Promise.all([
      prisma.championPick.findUnique({
        where: { leagueId_memberId: { leagueId, memberId } },
        include: { team: true }
      }),
      prisma.championPick.findMany({
        where: { leagueId },
        include: {
          team: true,
          member: { select: { id: true, nickname: true } }
        },
        orderBy: { createdAt: "asc" }
      }),
      prisma.league.findUnique({
        where: { id: leagueId },
        include: { championTeam: true }
      })
    ]);

    return {
      isLocked,
      lockAt: CHAMPION_LOCK_AT,
      myPick: myPick ? { teamId: myPick.teamId, team: myPick.team } : null,
      championTeam: league?.championTeam ?? null,
      allPicks: allPicks.map(p => ({
        memberId: p.memberId,
        nickname: p.member.nickname,
        team: p.team,
        isCorrect: league?.championTeamId ? p.teamId === league.championTeamId : null
      }))
    };
  });

  app.put("/champion-pick", { preHandler: [app.requireLeagueMember] }, async (request, reply) => {
    const { leagueId, id: memberId } = request.leagueMember!;

    if (new Date() >= CHAMPION_LOCK_AT) {
      return reply.status(400).send({ error: "Bad Request", code: "errChampionPickLocked" });
    }

    const { teamId } = z.object({ teamId: z.string().min(1) }).parse(request.body);

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return reply.status(404).send({ error: "Not Found", code: "errTeamNotFound" });
    }

    await prisma.championPick.upsert({
      where: { leagueId_memberId: { leagueId, memberId } },
      update: { teamId },
      create: { leagueId, memberId, teamId }
    });

    return { pick: { teamId, team } };
  });
}
