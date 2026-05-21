import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.js";
import { healthRoutes } from "./health.js";
import { matchRoutes } from "./matches.js";
import { predictionRoutes } from "./predictions.js";
import { leaderboardRoutes } from "./leaderboard.js";
import { adminRoutes } from "./admin.js";
import { superAdminRoutes } from "./superadmin.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(matchRoutes, { prefix: "/api" });
  await app.register(predictionRoutes, { prefix: "/api" });
  await app.register(leaderboardRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api" });
  await app.register(superAdminRoutes, { prefix: "/api" });
}
