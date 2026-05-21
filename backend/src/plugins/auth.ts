import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { hashString } from "../lib/auth-utils.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      displayName: string;
      role: string;
    };
    leagueMember?: {
      id: string;
      leagueId: string;
      userId: string;
      nickname: string;
      role: string;
      contributionStatus: string;
      league: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireLeagueMember: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireSuperAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionToken = request.cookies.session;
    if (!sessionToken) {
      return reply.status(401).send({ error: "Unauthorized", message: "Missing session cookie" });
    }

    const tokenHash = hashString(sessionToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: true
      }
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return reply.status(401).send({ error: "Unauthorized", message: "Invalid or expired session" });
    }

    request.user = {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      role: session.user.role
    };
  });

  // Requires user to belong to the requested league
  app.decorate("requireLeagueMember", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (reply.sent) return;

    const leagueId = request.headers["x-league-id"] as string;
    if (!leagueId) {
      return reply.status(400).send({ error: "Bad Request", message: "Missing X-League-ID header" });
    }

    const member = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId: request.user!.id
        }
      },
      include: {
        league: true
      }
    });

    if (!member || !member.league.isActive) {
      return reply.status(403).send({ error: "Forbidden", message: "You are not an active member of this league" });
    }

    request.leagueMember = {
      id: member.id,
      leagueId: member.leagueId,
      userId: member.userId,
      nickname: member.nickname,
      role: member.role,
      contributionStatus: member.contributionStatus,
      league: {
        id: member.league.id,
        name: member.league.name,
        slug: member.league.slug
      }
    };
  });

  // Requires ADMIN role within the active league OR global SUPER_ADMIN
  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (reply.sent) return;

    if (request.user?.role === "SUPER_ADMIN") {
      // SUPER_ADMIN is a system operator and never holds league membership.
      // They manage leagues via X-League-ID header — synthesize a scoped context.
      const leagueId = request.headers["x-league-id"] as string;
      if (!leagueId) {
        return reply.status(400).send({ error: "Bad Request", message: "X-League-ID header bắt buộc cho thao tác quản lý league" });
      }
      const league = await prisma.league.findUnique({ where: { id: leagueId } });
      if (!league) {
        return reply.status(404).send({ error: "Not Found", message: "League không tồn tại" });
      }
      request.leagueMember = {
        id: `system:${request.user.id}`,
        leagueId: league.id,
        userId: request.user.id,
        nickname: request.user.displayName,
        role: "ADMIN" as any,
        contributionStatus: "PAID" as any,
        league: { id: league.id, name: league.name, slug: league.slug }
      };
      return;
    }

    // Regular user must be a league member with ADMIN role
    await app.requireLeagueMember(request, reply);
    if (reply.sent) return;

    if (request.leagueMember?.role !== "ADMIN") {
      return reply.status(403).send({ error: "Forbidden", message: "League Admin privileges required" });
    }
  });

  // Requires global SUPER_ADMIN role
  app.decorate("requireSuperAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (reply.sent) return;

    if (request.user?.role !== "SUPER_ADMIN") {
      return reply.status(403).send({ error: "Forbidden", message: "Super Admin privileges required" });
    }
  });
};

export const registerAuthPlugin = fp(authPlugin);
