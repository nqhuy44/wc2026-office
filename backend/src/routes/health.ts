import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "fan-league-backend"
    };
  });

  app.get("/health/db", async () => {
    await prisma.$queryRaw`SELECT 1`;

    return {
      ok: true,
      database: "reachable"
    };
  });
}
