import type { FastifyInstance } from "fastify";
import { getStoredWorldCupStandings } from "../lib/football-api.js";

export async function standingsRoutes(app: FastifyInstance) {
  app.get("/standings", { preHandler: [app.requireLeagueMember] }, async () => {
    const stored = await getStoredWorldCupStandings();

    return {
      source: "provider-db",
      groups: stored.groups,
      fetchedAt: stored.fetchedAt?.toISOString() ?? null
    };
  });
}
