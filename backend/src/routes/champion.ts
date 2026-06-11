import type { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../lib/prisma.js";

// 00:00 12/06/2026 Asia/Ho_Chi_Minh.
export const DEFAULT_CHAMPION_PICK_LOCK_AT = new Date("2026-06-11T17:00:00.000Z");

export function getChampionPickLockAt(lockAt?: Date | string | null) {
  return lockAt ? new Date(lockAt) : DEFAULT_CHAMPION_PICK_LOCK_AT;
}

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
    const lockAt = getChampionPickLockAt(league?.championPickLockAt);
    const isLocked = new Date() >= lockAt;

    return {
      isLocked,
      lockAt,
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
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { championPickLockAt: true }
    });
    const lockAt = getChampionPickLockAt(league?.championPickLockAt);

    if (new Date() >= lockAt) {
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
