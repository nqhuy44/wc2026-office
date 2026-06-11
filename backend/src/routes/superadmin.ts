import type { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../lib/prisma.js";
import { hashString, generatePasscode } from "../lib/auth-utils.js";

const createLeagueSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

const addMemberSchema = z.object({
  username: z.string().min(1),
  nickname: z.string().optional(),
  role: z.enum(["PLAYER", "ADMIN"]).default("PLAYER"),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["PLAYER", "ADMIN"])
});

export async function superAdminRoutes(app: FastifyInstance) {
  // ─── League Management ───

  app.get("/superadmin/leagues", { preHandler: [app.requireSuperAdmin] }, async () => {
    const leagues = await prisma.league.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true, leagueMatches: true } }
      }
    });
    return { leagues };
  });

  app.post("/superadmin/leagues", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { name, slug } = createLeagueSchema.parse(request.body);

    try {
      const league = await prisma.league.create({
        data: { name, slug }
      });
      return { league };
    } catch (e) {
      return reply.status(400).send({ error: "Bad Request", code: "errCannotCreateLeague" });
    }
  });

  app.delete("/superadmin/leagues/:leagueId", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { leagueId } = request.params as { leagueId: string };

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      return reply.status(404).send({ error: "Not Found", code: "errLeagueNotFound" });
    }

    await prisma.league.delete({ where: { id: leagueId } });
    return { ok: true, message: `Đã xóa league: ${league.name}` };
  });

  // ─── Member Management (cross-league) ───

  app.get("/superadmin/leagues/:leagueId/participants", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { leagueId } = request.params as { leagueId: string };

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      return reply.status(404).send({ error: "Not Found", code: "errLeagueNotFound" });
    }

    const members = await prisma.leagueMember.findMany({
      where: { leagueId },
      include: {
        user: {
          select: { username: true, displayName: true, role: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const mapped = members.map(m => ({
      id: m.id,
      nickname: m.nickname,
      role: m.role,
      contributionStatus: m.contributionStatus,
      joinedAt: m.joinedAt,
      createdAt: m.createdAt,
      username: m.user.username,
      displayName: m.user.displayName,
      isActive: true
    }));

    return { participants: mapped };
  });

  app.post("/superadmin/leagues/:leagueId/participants", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { leagueId } = request.params as { leagueId: string };
    const { username, nickname, role } = addMemberSchema.parse(request.body);

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      return reply.status(404).send({ error: "Not Found", code: "errLeagueNotFound" });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() }
    });

    if (!user) {
      return reply.status(404).send({ error: "Not Found", code: "errUserNotFound" });
    }

    try {
      const member = await prisma.leagueMember.create({
        data: {
          leagueId,
          userId: user.id,
          nickname: nickname?.trim() || user.displayName,
          role
        },
        include: {
          user: true
        }
      });

      return {
        participant: {
          id: member.id,
          nickname: member.nickname,
          role: member.role,
          contributionStatus: member.contributionStatus,
          username: member.user.username,
          displayName: member.user.displayName
        }
      };
    } catch (e) {
      return reply.status(400).send({ error: "Bad Request", code: "errCannotCreateMember" });
    }
  });

  app.delete("/superadmin/participants/:memberId", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };

    const member = await prisma.leagueMember.findUnique({ 
      where: { id: memberId },
      include: { user: true }
    });
    if (!member) {
      return reply.status(404).send({ error: "Not Found", code: "errMemberNotFound" });
    }

    if (member.user.role === "SUPER_ADMIN") {
      return reply.status(403).send({ error: "Forbidden", code: "errCannotRemoveSuperAdmin" });
    }

    if (member.role === "ADMIN") {
      const adminCount = await prisma.leagueMember.count({
        where: { leagueId: member.leagueId, role: "ADMIN" }
      });
      if (adminCount <= 1) {
        return reply.status(400).send({ error: "Bad Request", code: "errCannotRemoveLastLeagueAdmin" });
      }
    }

    await prisma.leagueMember.delete({ where: { id: memberId } });
    return { ok: true, message: `Đã xóa ${member.nickname} khỏi giải đấu.` };
  });

  app.put("/superadmin/participants/:memberId/role", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const { role } = updateMemberRoleSchema.parse(request.body);

    const member = await prisma.leagueMember.findUnique({
      where: { id: memberId },
      include: { user: true }
    });

    if (!member) {
      return reply.status(404).send({ error: "Not Found", code: "errMemberNotFound" });
    }

    if (member.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.leagueMember.count({
        where: { leagueId: member.leagueId, role: "ADMIN" }
      });
      if (adminCount <= 1) {
        return reply.status(400).send({ error: "Bad Request", code: "errCannotDemoteLastLeagueAdmin" });
      }
    }

    const updated = await prisma.leagueMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true }
    });

    return {
      participant: {
        id: updated.id,
        nickname: updated.nickname,
        role: updated.role,
        contributionStatus: updated.contributionStatus,
        username: updated.user.username,
        displayName: updated.user.displayName
      },
      message: `Đã cập nhật vai trò của ${updated.nickname} thành ${updated.role}`
    };
  });

  app.post("/superadmin/participants/:memberId/reset-passcode", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };

    const member = await prisma.leagueMember.findUnique({ 
      where: { id: memberId },
      include: { user: true }
    });
    if (!member) {
      return reply.status(404).send({ error: "Not Found", code: "errMemberNotFound" });
    }

    const newPasscode = generatePasscode();

    await prisma.user.update({
      where: { id: member.userId },
      data: { passcodeHash: hashString(newPasscode) }
    });

    // Delete user session to force re-login
    await prisma.session.deleteMany({ where: { userId: member.userId } });

    return {
      participantId: member.id,
      nickname: member.nickname,
      passcode: newPasscode,
      message: `Đã reset mật khẩu cho tài khoản ${member.user.username} thành ${newPasscode}`
    };
  });

  // ─── Global User Management (All Platform Users) ───

  app.get("/superadmin/users", { preHandler: [app.requireSuperAdmin] }, async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { memberships: true }
        }
      }
    });
    return { users };
  });

  app.post("/superadmin/users/:userId/reset-passcode", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: "Not Found", code: "errUserNotFound" });
    }

    const newPasscode = generatePasscode();

    await prisma.user.update({
      where: { id: userId },
      data: { passcodeHash: hashString(newPasscode) }
    });

    // Delete user session to force re-login
    await prisma.session.deleteMany({ where: { userId } });

    return {
      userId,
      username: user.username,
      displayName: user.displayName,
      passcode: newPasscode,
      message: `Đã reset mật khẩu cho tài khoản ${user.username} thành ${newPasscode}`
    };
  });

  app.delete("/superadmin/users/:userId", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const currentUser = (request as any).user;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: "Not Found", code: "errUserNotFound" });
    }

    // Block deleting oneself
    if (currentUser && currentUser.id === userId) {
      return reply.status(400).send({ error: "Bad Request", code: "errCannotDeleteSelf" });
    }

    await prisma.user.delete({ where: { id: userId } });
    return { ok: true, message: `Đã xóa vĩnh viễn tài khoản: ${user.username}` };
  });

  app.put("/superadmin/users/:userId/role", { preHandler: [app.requireSuperAdmin] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { role } = z.object({ role: z.enum(["USER", "SUPER_ADMIN"]) }).parse(request.body);
    const currentUser = (request as any).user;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: "Not Found", code: "errUserNotFound" });
    }

    // Block changing one's own role to avoid accidental lockout
    if (currentUser && currentUser.id === userId) {
      return reply.status(400).send({ error: "Bad Request", code: "errCannotChangeOwnRole" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true
      }
    });

    return { user: updated };
  });
}
