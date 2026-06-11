import type { FastifyInstance } from "fastify";
import z from "zod";
import { prisma } from "../lib/prisma.js";
import { hashString, generateSessionToken } from "../lib/auth-utils.js";

const loginSchema = z.object({
  username: z.string().min(1),
  passcode: z.string().min(3),
});

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, "Username chỉ chứa chữ cái, số, gạch ngang và gạch dưới"),
  displayName: z.string().min(1).max(50),
  passcode: z.string().min(3).max(50),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const { username, passcode } = loginSchema.parse(request.body);
    const passcodeHash = hashString(passcode.trim());

    const user = await prisma.user.findFirst({
      where: {
        username: username.trim().toLowerCase(),
        passcodeHash,
        isActive: true
      },
      include: {
        memberships: {
          include: {
            league: true
          }
        }
      }
    });

    if (!user) {
      return reply.status(401).send({ error: "Unauthorized", code: "errInvalidCredentials" });
    }

    const sessionToken = generateSessionToken();
    const tokenHash = hashString(sessionToken);
    
    // Expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    reply.setCookie("session", sessionToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        memberships: user.memberships.map((m) => ({
          id: m.id,
          leagueId: m.leagueId,
          nickname: m.nickname,
          role: m.role,
          confirmationStatus: m.confirmationStatus,
          league: {
            id: m.league.id,
            name: m.league.name,
            slug: m.league.slug
          }
        }))
      }
    };
  });

  app.post("/auth/register", async (request, reply) => {
    const { username, displayName, passcode } = registerSchema.parse(request.body);
    const sanitizedUsername = username.trim().toLowerCase();

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: sanitizedUsername }
    });

    if (existingUser) {
      return reply.status(409).send({ error: "Conflict", code: "errUsernameTaken" });
    }

    const passcodeHash = hashString(passcode.trim());

    const user = await prisma.user.create({
      data: {
        username: sanitizedUsername,
        displayName: displayName.trim(),
        passcodeHash
      },
      include: {
        memberships: true
      }
    });

    const sessionToken = generateSessionToken();
    const tokenHash = hashString(sessionToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    });

    reply.setCookie("session", sessionToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        memberships: []
      }
    };
  });

  app.post("/auth/me/change-passcode", { preHandler: [app.requireAuth] }, async (request, reply) => {
    const { currentPasscode, newPasscode } = z.object({
      currentPasscode: z.string().min(1),
      newPasscode: z.string().min(3).max(50),
    }).parse(request.body);

    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) return reply.status(404).send({ error: "Not Found" });

    if (user.passcodeHash !== hashString(currentPasscode.trim())) {
      return reply.status(401).send({ error: "Unauthorized", code: "wrongCurrentPasscode" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passcodeHash: hashString(newPasscode.trim()) }
    });

    // Invalidate all other sessions, keep the current one active
    const sessionToken = request.cookies.session;
    const currentTokenHash = sessionToken ? hashString(sessionToken) : null;
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {})
      }
    });

    return { ok: true, message: "Đã đổi passcode thành công" };
  });

  app.post("/auth/logout", async (request, reply) => {
    const sessionToken = request.cookies.session;
    if (sessionToken) {
      const tokenHash = hashString(sessionToken);
      await prisma.session.deleteMany({
        where: { tokenHash }
      });
    }

    reply.clearCookie("session", { path: "/" });
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: [app.requireAuth] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      include: {
        memberships: {
          include: {
            league: true
          }
        }
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        memberships: user.memberships.map((m) => ({
          id: m.id,
          leagueId: m.leagueId,
          nickname: m.nickname,
          role: m.role,
          confirmationStatus: m.confirmationStatus,
          league: {
            id: m.league.id,
            name: m.league.name,
            slug: m.league.slug
          }
        }))
      }
    };
  });
}
